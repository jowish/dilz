# AGENTS.md

**This file is the single source of truth for AI agents working on this repository.**
`CLAUDE.md` and any other agent config file must not duplicate rules — they point here.

Golden rule: **agents execute, the human decides.**

---

## 1. What dilz is

dilz is a self-serve platform that lets independent small merchants (restaurants first) create
and publish real-time geolocated promotions. Consumers discover nearby offers; merchants
manage their own campaigns without a sales rep.

Product decisions, prioritisation and UX direction are owned by the human maintainer.
Agents do not invent features, do not re-scope issues, and do not "improve" things that were
not asked for.

---

## 2. Stack

- Next.js (App Router) + React, TypeScript
- Supabase (Postgres, Auth, Row Level Security, Storage)
- Capacitor (iOS + Android wrappers)
- Vercel (production + per-PR preview deployments)
- GitHub Actions for CI

> Verify exact versions in `package.json` before assuming API availability.
> Never upgrade a major dependency as a side effect of a feature issue.

---

## 3. Directory map

| Path | Contents |
|---|---|
| `app/` | Next.js routes, layouts, server components |
| `components/` | Shared UI |
| `lib/` | Client helpers, Supabase clients, domain logic |
| `supabase/migrations/` | SQL migrations — **restricted, see §4** |
| `scripts/` | Import / maintenance scripts |
| `tests/` | Unit + integration tests |
| `e2e/` | Playwright end-to-end specs |
| `docs/` | Product and architecture documentation |

> TODO (human): correct this table against the real tree, then delete this line.

---

## 4. Restricted scope — agents must NOT touch these without explicit instruction

An agent that believes it needs to modify anything below must **stop, and say so in the issue
comment instead of doing it.**

1. `supabase/migrations/**` — schema changes and data migrations
2. **Row Level Security policies** — any `create policy`, `alter policy`, `drop policy`
3. Authentication, session handling, service-role keys, anything under an `auth/` path
4. `.env*`, secrets, GitHub Actions secrets, Vercel environment variables
5. `capacitor.config.*`, native `ios/` and `android/` directories, app signing
6. Payment / billing code paths
7. `.github/workflows/**` and this file
8. Dependency major-version bumps, lockfile rewrites, framework migrations

Rationale: RLS is the only thing standing between one merchant and another merchant's data.
A test suite does not catch a wrong policy. A human must read every line of it.

---

## 5. Non-negotiable rules

- One issue → one branch → one PR. Never bundle unrelated changes.
- Never modify code outside the scope of the issue, including formatting-only churn.
- Never delete or weaken an existing test to make CI pass. If a test is wrong, say so in the PR.
- Never commit secrets, tokens, real customer data, or `.env` files.
- All new user-facing strings go through the existing i18n mechanism — no hardcoded copy.
- Any Supabase query added must be written assuming RLS is enforced; never reach for the
  service-role key to work around a permission error.
- If the issue is ambiguous, ask in the issue thread. Do not guess and do not widen scope.

---

## 6. Workflow

```
Human writes issue  →  label: agent-ready
        ↓
Agent picks it up   →  label: agent-working, branch <type>/<issue-number>-<slug>
        ↓
Agent opens PR      →  label: needs-review, links "Closes #<n>"
        ↓
CI (see §7)         →  must be green
        ↓
Vercel preview      →  human validates behaviour on mobile
        ↓
Human merges
```

Branch naming: `feat/123-merchant-promo-form`, `fix/124-geoloc-radius`, `chore/125-...`

Labels: `agent-ready`, `agent-working`, `needs-review`, `blocked`, `restricted-scope`.
Keep the label set small; add more only when one is actually being used to filter.

---

## 7. Definition of Done

A PR is done when **all** of the following are true:

- [ ] `npm run check` passes locally and in CI (typecheck + lint + test + build)
- [ ] E2E suite passes, or the change is provably outside every critical path
- [ ] New logic has tests; a bug fix has a regression test that fails without the fix
- [ ] No file from §4 is in the diff
- [ ] Vercel preview loads and the acceptance criteria are visibly satisfied
- [ ] The PR description follows §8

Critical paths that must never break (E2E-covered):
1. Merchant sign-up → create a promotion → publish it
2. Consumer opens the app → geolocation → sees nearby active promotions
3. A promotion expires and stops being served

---

## 8. Pull request format

The PR body is written **for someone reading it on a phone**. Assume the reviewer will not
open the diff. Required sections:

```markdown
## What changed
Two or three sentences, plain language, behaviour-first.

## Why
Link the issue and restate the acceptance criteria.

## How to verify on the preview
Numbered steps a human can follow on an iPhone in under two minutes.

## Risk
What could this break? What did I choose not to do? What am I unsure about?

## Files touched
Grouped by area, with one line each explaining why.
```

A PR whose "Risk" section says "none" is a PR that has not been thought about.

---

## 9. Commands

```bash
npm ci              # install
npm run dev         # local dev server
npm run typecheck   # tsc --noEmit
npm run lint        # eslint, zero warnings tolerated
npm test            # unit + integration
npm run e2e         # Playwright
npm run build       # production build
npm run check       # typecheck + lint + test + build — the CI gate
```

> TODO (human): add the missing scripts to `package.json` so `npm run check` really runs all four.

---

## 10. Metrics

Every merged agent PR gets one line appended to `docs/agent-metrics.md`.
This is not bureaucracy — it is the only evidence that the workflow works.
