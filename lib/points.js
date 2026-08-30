// Contribution points + tier badges (issue #45).
//
// No existing "hot" score threshold exists anywhere in this codebase — the
// `tri=hot` sort in pages/api/bons-plans.js is `ORDER BY votes_chaud DESC`,
// a sort order, not a numeric cutoff. HOT_VOTES_THRESHOLD below is therefore
// a new constant chosen for this feature, not reused from existing logic
// (flagged explicitly per the issue's instruction not to invent silent
// magic numbers). Comment-upvote points are deliberately not implemented:
// the `commentaires` table has no vote column and no vote endpoint exists
// today, so there is nothing server-side to award points from — that is
// left for a separate follow-up issue.

export const HOT_VOTES_THRESHOLD = 10;
export const POINTS_PER_HOT_DEAL = 10;

// Ordered highest-first so pointsToTier can return the first match.
const TIERS = [
  { id: 'platinum', min: 500 },
  { id: 'gold', min: 150 },
  { id: 'silver', min: 50 },
  { id: 'bronze', min: 0 },
];

export const TIER_LABELS = {
  bronze: { en: 'Bronze', he: 'ברונזה' },
  silver: { en: 'Silver', he: 'כסף' },
  gold: { en: 'Gold', he: 'זהב' },
  platinum: { en: 'Platinum', he: 'פלטינה' },
};

export function pointsToTier(points) {
  const safePoints = Math.max(0, Number.isFinite(points) ? points : 0);
  return TIERS.find((tier) => safePoints >= tier.min).id;
}

// Points a single deal currently contributes to its author's total.
export function hotDealPoints(votesChaud) {
  return Number(votesChaud) >= HOT_VOTES_THRESHOLD ? POINTS_PER_HOT_DEAL : 0;
}

// Recomputes (not increments) a user's total points from their current
// deals, then upserts the total. Recomputing from scratch — rather than
// incrementing on each vote — is what makes this idempotent and safe
// against votes toggling up and down in any order, without needing an
// extra "already awarded" bookkeeping column.
export async function recomputeUserPoints(authorId, supabaseAdmin) {
  if (!authorId) return 0;
  const { data: deals, error } = await supabaseAdmin
    .from('bons_plans')
    .select('votes_chaud')
    .eq('auteur_id', authorId)
    .or('statut.eq.actif,statut.is.null');
  if (error) return 0;

  const points = (deals || []).reduce((sum, deal) => sum + hotDealPoints(deal.votes_chaud), 0);
  await supabaseAdmin
    .from('user_points')
    .upsert({ user_id: authorId, points, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return points;
}
