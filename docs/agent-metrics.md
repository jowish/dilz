# Agent metrics

One line per merged agent PR. Fill it at merge time — retrofitting this later is impossible,
and without it the whole workflow is an anecdote instead of a track record.

## Log

| PR | Issue | Size | Opened | Merged | Cycle time | Human edits after PR (lines) | CI reds before green | Rework issue opened? | Est. API cost | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| #  | #  | S/M/L |  |  |  |  |  | yes/no |  |  |
| #13 | #9 | S | 2026-08-09 | 2026-08-09 | ~2h (incl. infra debugging) | 1 (assertion in bottomNavContract.test.mjs, agent-authored) | 1 (Vercel prix-israel unrelated) | no | via subscription | Agent halted correctly on a pinned test value per AGENTS.md, asked before rewriting the assertion |
| #14 | #11 | S | 2026-08-09 | 2026-08-09 | ~10min | 0 (docs only) | 0 | no | via subscription | Docs-only cleanup, closes #11. Discovered PromoModal.js + scan.js price-comparison UI is still live in prod (not dead code as assumed) — needs a product decision, not just docs. |
| TBD | #15 | M | 2026-08-09 |  |  |  |  |  | via subscription | Scope widened during implementation with explicit user sign-off: PromoModal/PromoCard/scan.js were wired into a whole price-comparison surface (promos fetch, sales tab, filters, voting) beyond the two files named in the issue title — removed the full surface, not just the modal render, to avoid leaving dead click targets. PR number pending (no gh auth in this environment to open it). |
| TBD | #18 | S | 2026-08-09 |  |  |  |  |  | via subscription | Deleted the 5 files confirmed orphaned by #17's investigation (pages/api/promos.js, product-votes.js, prix.js, scripts/import-promos.js, traduire-produits.js). No dedicated test files existed for any of them. Also removed their now-dead `node scripts/...` lines from README's Legacy section as a direct consequence. tests/criticalRegressionGuards.test.mjs unaffected — none of the 5 files were referenced there. PR number pending (no gh auth in this environment to open it). |
| TBD | #35 | S | 2026-08-30 |  |  |  |  |  | via subscription | Added a profile icon and a notifications/alerts icon to AppHeader.js so desktop has a click path to /profil (theme, sort, language, delete account) and /alerts, matching BottomNav.js's existing routes/handlers exactly. Reused the pre-existing `.dilz-app-header__right .dilz-icon-button { display: none }` mobile-only CSS rule instead of adding a new one, so BottomNav.js/GlobalBottomNav.js needed zero changes. NotificationSheet.js was flagged in the PR as still unwired (out of scope per the issue) rather than built now. PR number pending (no gh auth in this environment to open it). |
| TBD | #37 | S | 2026-08-30 |  |  |  |  |  | via subscription | Installed @vercel/analytics, mounted `<Analytics />` once in pages/_app.js. Confirmed no cookie-consent UI is needed (Vercel Analytics is cookie-free) and added a disclosure sentence to pages/privacy.js's existing "Service providers" section (en+he) since it previously didn't mention analytics at all. Recommended in the PR, not added: @vercel/speed-insights as a separate follow-up issue. `npm install` incidentally deduplicated a pre-existing duplicate `"check"` script key already on main (harmless, identical value both times) — left as-is rather than reverting. PR number pending (no gh auth in this environment to open it). |
| TBD | #40 | S | 2026-08-30 |  |  |  |  |  | via subscription | Read-only investigation, no code changes (docs/push-notifications-investigation.md only). Traced both subscription paths end to end: web push is fully wired (subscribe → /api/push-subscription → push_subscriptions table → processNewDeal in lib/alerts.js sends via web-push, gated on VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY env vars) and would work in production if those env vars are set — couldn't confirm from this workstation. Native (Capacitor iOS/Android) push tokens are captured and stored in native_push_tokens but nothing anywhere in the repo ever sends to them — confirmed no Firebase/APNs/FCM code exists. Empirically verified a suspected client/server base64 vs base64url mismatch is actually a non-issue (Node's Buffer.from(str,'base64url') decodes standard base64 losslessly). PR number pending (no gh auth in this environment to open it). |
## Derived KPIs — recompute monthly

| KPI | Definition | Current | Target |
|---|---|---|---|
| First-pass merge rate | % of agent PRs merged with zero human code edits |  | > 60% |
| Median cycle time | Issue labelled `agent-ready` → merged |  | < 24h |
| Rework rate | % of merged PRs that produced a follow-up bug issue within 14 days |  | < 15% |
| Restricted-scope violations | PRs blocked by the CI guard |  | 0 |
| Cost per merged feature | API spend / merged PRs |  | track only |
| Escaped defects | Bugs reaching the deployed app, per month |  | flat or down |

## Why these and not others

- **First-pass merge rate** is the only number that separates "I used an AI assistant" from
  "I operated an agentic workflow". It is the headline figure.
- **Rework rate** and **escaped defects** are the honesty check: throughput that ships bugs is
  not throughput. Reporting them is what makes the other numbers credible.
- **Restricted-scope violations** demonstrates that the guardrails were designed, not improvised.

## Baseline

Before the first agent PR, record how long a comparable change took when done by hand.
Without a baseline, "faster" is not a claim you can defend in an interview.

| Reference change | Done by | Time |
|---|---|---|
|  | human |  |
