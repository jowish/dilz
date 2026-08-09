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
