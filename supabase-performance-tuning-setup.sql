-- Performance tuning: RLS init plans, foreign-key indexes, feed indexes.
--
-- Three fixes reported by Supabase's own database linter, none of which change
-- who can see or do what:
--
--   1. Every RLS policy below calls auth.uid() once per *row*. Wrapping it as
--      (select auth.uid()) makes Postgres evaluate it once per query (an
--      InitPlan) instead. The expression is otherwise identical, so the access
--      rules are unchanged — this is purely how often the function runs.
--      https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
--   2. Six foreign keys have no covering index. Postgres has to scan the child
--      table to check them, and deleting a parent row gets slower as data grows.
--
--   3. The feed's own queries have no index that matches how it actually reads:
--      always "active, not an ad", ordered by pinned first and then by one of
--      three sorts. Partial indexes matching that predicate keep the feed fast
--      as deals accumulate — the case the maintainer specifically asked about.
--
-- Safe to apply while the app is live. The ALTER POLICY statements rewrite an
-- expression in place, so there is never a moment where a policy is missing.
-- The whole file runs in one transaction: if anything fails, nothing changes.
--
-- Re-running is safe. Indexes use IF NOT EXISTS. The ALTER POLICY statements
-- will error loudly if a policy has since been renamed or dropped, which for
-- security code is better than silently doing nothing.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Evaluate auth.uid() once per query instead of once per row
--
-- Each statement repeats the existing expression exactly, with auth.uid()
-- replaced by (select auth.uid()). Compare against the "before" comment.
-- ─────────────────────────────────────────────────────────────────────────────

-- before: (user_id = auth.uid())
alter policy "Users manage own alerts" on public.alerts
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- before: (blocker_id = auth.uid())
alter policy "Users manage own blocks" on public.blocked_users
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

-- before: (user_id = auth.uid())
alter policy "Users manage own votes" on public.bons_plans_votes
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- before: (reporter_id = auth.uid()) — INSERT, so WITH CHECK only
alter policy "Users create own reports" on public.content_reports
  with check (reporter_id = (select auth.uid()));

-- before: (reporter_id = auth.uid()) — SELECT, so USING only
alter policy "Users read own reports" on public.content_reports
  using (reporter_id = (select auth.uid()));

-- before: (auth.uid() = user_id) — INSERT
alter policy "Users insert their own availability answer" on public.deal_availability_confirmations
  with check ((select auth.uid()) = user_id);

-- before: (auth.uid() = user_id) — SELECT
alter policy "Users read their own availability answer" on public.deal_availability_confirmations
  using ((select auth.uid()) = user_id);

-- before: (auth.uid() = user_id) — UPDATE
alter policy "Users update their own availability answer" on public.deal_availability_confirmations
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- before: (user_id = auth.uid())
alter policy "Users manage own native push tokens" on public.native_push_tokens
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- before: (user_id = auth.uid()) — SELECT
alter policy "Users read own notifications" on public.notifications
  using (user_id = (select auth.uid()));

-- before: (user_id = auth.uid()) — UPDATE
alter policy "Users update own notifications" on public.notifications
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- before: (user_id = auth.uid())
alter policy "Users manage own product votes" on public.product_votes
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- before: (user_id = auth.uid()) — INSERT
alter policy "Users create promo codes" on public.promo_codes
  with check (user_id = (select auth.uid()));

-- before: (user_id = auth.uid())
alter policy "Users manage own subscriptions" on public.push_subscriptions
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- before: (user_id = auth.uid())
alter policy "Users manage own saved items" on public.saved_items
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- before: (user_id = auth.uid()) — INSERT
alter policy "Users create shopping comments" on public.shopping_deal_comments
  with check (user_id = (select auth.uid()));

-- before: (user_id = auth.uid())
alter policy "Users manage shopping votes" on public.shopping_deal_votes
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- before: (follower_id = auth.uid())
alter policy "Users manage own follows" on public.user_follows
  using (follower_id = (select auth.uid()))
  with check (follower_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Covering indexes for foreign keys that had none
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_deal_availability_confirmations_user
  on public.deal_availability_confirmations (user_id);

create index if not exists idx_notifications_followed_user
  on public.notifications (followed_user_id);

-- The largest table here (~72 MB); building this index briefly blocks writes
-- to `prix`, which only the price-comparison pages use.
create index if not exists idx_prix_enseigne_code
  on public.prix (enseigne_code);

create index if not exists idx_promo_codes_user
  on public.promo_codes (user_id);

create index if not exists idx_shopping_deal_comments_user
  on public.shopping_deal_comments (user_id);

create index if not exists idx_shopping_deal_votes_user
  on public.shopping_deal_votes (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Feed indexes
--
-- Every feed request filters on the same two things — the deal is active and is
-- not an ad — and then orders by is_pinned first, followed by one of three
-- sorts. These are partial indexes on exactly that predicate, so they stay
-- small and are read in the order the feed asks for.
--
-- See pages/api/bons-plans.js: .or('statut.eq.actif,statut.is.null')
--                              .eq('is_ad', false)
--                              .order('is_pinned', desc) + sort
-- ─────────────────────────────────────────────────────────────────────────────

-- Default sort: hottest first.
create index if not exists idx_bons_plans_feed_hot
  on public.bons_plans (is_pinned desc, votes_chaud desc, created_at desc)
  where is_ad = false and (statut = 'actif' or statut is null);

-- "latest" and "oldest" sorts, and the comments sort, all order by created_at.
create index if not exists idx_bons_plans_feed_recent
  on public.bons_plans (is_pinned desc, created_at desc)
  where is_ad = false and (statut = 'actif' or statut is null);

-- "ending soon": date_fin >= today, ordered by date_fin.
create index if not exists idx_bons_plans_feed_ending
  on public.bons_plans (is_pinned desc, date_fin)
  where is_ad = false and (statut = 'actif' or statut is null);

-- Promoted deals are fetched separately on every first page load.
create index if not exists idx_bons_plans_ads_recent
  on public.bons_plans (created_at desc)
  where is_ad = true;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- After applying, Postgres has no statistics for the new indexes yet. Nothing
-- needs doing — the planner picks them up as the tables are used.
--
-- NOT done here, deliberately:
--   • The 7 tables with RLS disabled (bons_plans, commentaires, prix, produits,
--     promotions, magasins, enseignes) still have no policies at all. That is a
--     separate change that needs a human to decide, table by table, who may
--     read and write what.
--   • The 23 indexes the linter reports as never used are left in place; some
--     of them may simply not have been exercised yet.
-- ─────────────────────────────────────────────────────────────────────────────
