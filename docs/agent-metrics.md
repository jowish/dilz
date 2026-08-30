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
| TBD | #39 | S | 2026-08-30 |  |  |  |  |  | via subscription | Wired the pre-built NotificationSheet.js to both bell icons: GlobalBottomNav.js now owns the notifications list + sheet-open state and opens it directly on mobile's Alerts tap; AppHeader.js (desktop, no shared state with GlobalBottomNav) dispatches a new `dilz:open-notifications` window event that GlobalBottomNav listens for — same bridge pattern the codebase already used for `dilz:notifications-read`. Reused the pre-existing `alertsOpen` BottomNav prop (previously redundant with route-derived activeTab) to keep the liquid-nav bubble animation correct while the sheet is open without navigating. Clarified in the PR: the sheet complements /alerts, it does not replace it — AlertModal.js's own "Alert results" section (with its own mark-all-read) is untouched and still the place to manage saved alert criteria; the sheet is a no-navigation quick-glance. No new notification-sending logic added, per the issue's constraint. Updated 3 pre-existing test files whose assertions locked in the old (pre-#39) bell-tap behavior; added a new dedicated test file for the sheet-wiring contract. PR number pending (no gh auth in this environment to open it). |
| TBD | #41 | S | 2026-08-30 |  |  |  |  |  | via subscription | Confirmed OG tags were per-deal in the JSX already but never reached a non-JS crawler: pages/deal/[id].js had no data-fetching method at all, so `deal` state started null and only populated client-side after hydration — the `<Head>` block with real og:title/og:description/og:image only ever rendered after an `if (!mounted) return null` gate, and `mounted` is always false during SSR. Confirmed via `npm run build` output before the fix: `/deal/[id]` was marked `○ (Static)`, meaning every deal shared the exact same generic prerendered shell regardless of id. Added `getServerSideProps` (fetches the deal server-side, same query as the existing `/api/deal/[id]` route) and hoisted the Head/OG computation above the mounted/loading/not-found gates so it always renders, seeded from the SSR data. Verified empirically: `npm run build` now shows `ƒ /deal/[id]` (server-rendered per request), and `curl`ing a running `next start` instance shows real og:title/og:description directly in the raw HTML with zero JS execution. Could not verify a *real* deal's title/price/photo from this workstation (no live Supabase credentials here) — recommended in the PR that a human run the URL through Facebook's Sharing Debugger or WhatsApp's own preview after a real deal is live on the Vercel preview. One file touched (pages/deal/[id].js) plus one new test file, matching the issue's stated scope. PR number pending (no gh auth in this environment to open it). |
| TBD | #45 | M | 2026-08-30 |  |  |  |  |  | via subscription | Stopped and asked the user before writing code: the issue assumed two "existing thresholds" to reuse (a deal-score "hot" cutoff, a comment N-upvotes cutoff) that turned out not to exist anywhere — `tri=hot` is a sort order not a score cutoff, and `commentaires` has no vote column or vote endpoint at all. User decided: pick and clearly document a new votes_chaud cutoff (chose 10, +10 points, flagged as new/not-reused in code comments and here), and skip comment-upvote points entirely as a separate follow-up issue rather than build new comment-vote schema beyond the migration this issue authorized. Added `supabase-user-points-setup.sql` (new `user_points` table, no INSERT/UPDATE/DELETE grant to authenticated/anon — server-only writes) following the exact convention from #31's precedent migration. `lib/points.js` recomputes (not increments) a user's total from current deal votes on every vote cast in pages/api/bons-plans.js, avoiding a double-award bug an incremental approach would have needed a second bookkeeping column to prevent. Unit tests for `pointsToTier` caught a real off-by-crash bug on negative input before it shipped. Updated one pre-existing test (dealPromotionContract.test.mjs) whose assertion locked the old `.select('is_ad')` shape, now `.select('is_ad,auteur_id')`. PR number pending (no gh auth in this environment to open it). |
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
