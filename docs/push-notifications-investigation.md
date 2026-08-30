# Push notifications — end-to-end investigation

Issue #40. Read-only, no code changes. Traces whether a push notification can
actually reach a device today, and what's missing if not.

## Summary

There are two entirely separate subscription paths (native app vs. web
browser), and only one of them has a server-side send implemented:

| Path | Subscribe | Store | Send |
|---|---|---|---|
| Web Push (browser) | ✅ works | ✅ `push_subscriptions` table | ✅ implemented, gated on env vars |
| Native (iOS/Android via Capacitor) | ✅ works | ✅ `native_push_tokens` table | ❌ **nothing sends to it — dead end** |

The web path is real, wired end-to-end, and would fire in production **if**
`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` are set in the deployment
environment — I can't confirm those are actually set on Vercel from this
workstation. The native path stores a valid device token and then does
nothing with it; there is no Firebase/APNs/FCM sending code anywhere in the
repo.

## 1. Subscription flow

### Web (browser)
Triggered only as a side effect of creating the user's **first alert**, not
from a standalone settings toggle — [`components/ui/AlertModal.js:118-143`](components/ui/AlertModal.js#L118-L143)
(`handleCreate`):

1. Guarded by `Notification.permission === 'default'` (only prompts if the
   user has never answered) — if a user already denied it once, this silently
   skips forever, per normal browser behavior. There is no "retry" affordance
   anywhere else in the app (checked `pages/profil.js` — no push toggle
   exists there at all).
2. On grant: `navigator.serviceWorker.ready` → `reg.pushManager.subscribe({
   applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY })`.
   The key is passed as a **raw string, not a `Uint8Array`**. This is spec-legal
   today (browsers now accept a base64url string directly for
   `applicationServerKey`), but I could not verify it against every browser
   engine from here — worth a real-device smoke test on Safari specifically,
   since Safari historically lagged on this part of the spec.
3. `sub.getKey('p256dh')` / `sub.getKey('auth')` are encoded with plain
   `btoa()` (standard base64, `+`/`/`/`=`), not base64url — I checked whether
   this breaks the server side (see §3) and it does not: Node's
   `Buffer.from(str, 'base64url')` decodes standard-base64 input losslessly
   (verified empirically), so this mismatch is **not** a bug.
4. POSTs `{ endpoint, p256dh, auth }` to `/api/push-subscription`
   ([`pages/api/push-subscription.js`](pages/api/push-subscription.js)),
   which upserts into `push_subscriptions` keyed on `(user_id, endpoint)`.
   Table + RLS defined in
   [`supabase-alerts-setup.sql:109-124`](supabase-alerts-setup.sql#L109-L124)
   (a manually-run setup script, not a `supabase/migrations/` file).

The service worker itself (registered app-wide on every page load, in
[`pages/_app.js:14-16`](pages/_app.js#L14-L16)) is correctly implemented —
[`public/sw.js`](public/sw.js) handles both the `push` event (shows a
notification) and `notificationclick` (focuses/opens the right deal). No
issues found there.

### Native (iOS/Android via Capacitor)
Also triggered inside the same `handleCreate` flow, attempted *first*
(before the web path, which only runs `if (!nativePushRegistered)`) —
[`lib/nativeApp.js:91-132`](lib/nativeApp.js#L91-L132)
(`registerNativePushToken`):

1. No-ops immediately if not running inside a native Capacitor shell.
2. Requests permission via `@capacitor/push-notifications`, registers for a
   device token, and POSTs `{ platform, token }` to
   `/api/native-push-token` on success.
3. [`pages/api/native-push-token.js`](pages/api/native-push-token.js) validates
   the token shape and upserts into `native_push_tokens`. Table + RLS defined
   in [`supabase-native-push-setup.sql`](supabase-native-push-setup.sql).

This half is fully wired and, as far as I can tell from the code, would
successfully register a real device token from a real iOS/Android build.

## 2. Server-side send path

Found in [`lib/alerts.js:42-109`](lib/alerts.js#L42-L109)
(`processNewDeal`), called synchronously (awaited, not fire-and-forget) from
the deal-creation endpoint —
[`pages/api/bons-plans.js:160-168`](pages/api/bons-plans.js#L160-L168) — every
time a user publishes a new deal via `POST /api/bons-plans`. Deals go live
(`statut: 'actif'`) immediately on insert; there is no moderation gate
sitting between "deal created" and "push fires," so this trigger is real and
reachable in production, not dead code.

What it does:
1. Loads all active alerts, filters to the ones matching the new deal
   (`matchDealToAlert`).
2. Upserts one row per match into the in-app `notifications` table (this is
   the part issue #39 wired a UI for — unaffected by anything below).
3. **Bails out entirely if `VAPID_PUBLIC_KEY` or `VAPID_PRIVATE_KEY` is
   unset** (`lib/alerts.js:72`) — no push is attempted, no error, no log.
   This is the single biggest "is it actually configured" unknown: I can
   read the code but not Vercel's environment variable dashboard from this
   workstation.
4. If configured: dynamically imports `web-push` (present in
   `package.json` dependencies, confirmed installed), sets VAPID details,
   loads matching users' rows from `push_subscriptions` **only** — it never
   queries `native_push_tokens` — and calls `webpush.sendNotification(...)`
   once per subscription.
5. Failures are handled per-subscription via `Promise.allSettled`; a 410
   (Gone) or 404 is treated as an expected/expired subscription and silently
   ignored — **but the dead row is never deleted from `push_subscriptions`**,
   so every future matching deal re-attempts sending to it forever. Not
   user-facing breakage, just a small, unbounded cost/log-noise leak over
   time. Any other error is `console.error`'d (visible in Vercel function
   logs, not in this workstation's reach).

`processFollowerNotifications` (the "someone you follow posted" path, also
in `lib/alerts.js:111-125`) only ever writes to the in-app `notifications`
table — it never attempts a push at all, by design as far as I can tell (no
half-finished push call to point to). Follows do not currently generate a
push notification, only an in-app one.

## 3. What would need to be true for a real push to reach a device today

**Web push:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY`
  must all be set in the Vercel deployment environment, and the two
  `*_PUBLIC_KEY` values must be the **same** key (one exposed to the browser,
  one used server-side to sign) — I cannot confirm this is currently the case
  from here; it's the single most likely point of silent failure since a
  misconfiguration here doesn't error, `processNewDeal` just returns early.
- A user must have created at least one alert while granting the browser
  notification permission (first-time only, no retry path elsewhere in the
  app).
- A subsequently-published deal must match that alert's criteria.
- If all of the above hold, the code path is complete and correct — I found
  no bug in the actual send call, encoding, or service-worker handling.

**Native push:** cannot currently reach a device, full stop — tokens are
captured and stored correctly, but there is no code anywhere in the repo
(no Firebase Admin SDK, no APNs client, no `expo-server-sdk`, nothing) that
ever reads from `native_push_tokens` and sends anything. This would need a
new send implementation (e.g. Firebase Cloud Messaging or a direct APNs/FCM
integration) added to `processNewDeal` alongside the existing web-push call,
querying `native_push_tokens` the same way it queries `push_subscriptions`.
Building that is out of scope for this issue (read-only/no code changes) —
flagging it as the clearest concrete gap for a future issue.

**Minor, non-blocking observations (not bugs, not acted on — read-only):**
- Expired web subscriptions (410/404) are never pruned from
  `push_subscriptions`, so they're retried forever at negligible but
  nonzero cost.
- There is no standalone "notifications" toggle in `pages/profil.js` —
  subscribing is entirely a side effect of the first alert creation, with no
  way to retry after a denied/dismissed browser prompt short of the user
  clearing site permissions themselves.
- The admin dashboard surfaces a count of `push_subscriptions`
  ([`pages/api/admin/dashboard.js:176`](pages/api/admin/dashboard.js#L176))
  but no equivalent count for `native_push_tokens`, so there's currently no
  at-a-glance visibility into how many native devices have registered.
