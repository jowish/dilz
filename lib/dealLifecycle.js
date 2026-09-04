// Deal lifecycle (P0.2).
//
// `statut` on bons_plans is the *moderation* state (pending/actif/rejete) and
// is deliberately left alone here — this is a separate dimension describing
// whether a deal is still worth acting on, derived from its end date, when it
// was last verified, and what the community reported.
//
// Deliberate rule: a single "not available" report never expires a deal. It can
// only move it to POSSIBLY_EXPIRED, which is reversible by a later positive
// report. Only an end date in the past or an explicit admin call is terminal.

const ACTIVE = 'ACTIVE';
const VERIFIED = 'VERIFIED';
const POSSIBLY_EXPIRED = 'POSSIBLY_EXPIRED';
const EXPIRED = 'EXPIRED';

const LIFECYCLE_STATES = [ACTIVE, VERIFIED, POSSIBLY_EXPIRED, EXPIRED];

// A deal counts as freshly verified for this long after a positive check.
const VERIFIED_WINDOW_MS = 24 * 60 * 60 * 1000;
// How many unanswered "no" reports it takes to flag a deal as doubtful.
const UNAVAILABLE_REPORTS_THRESHOLD = 2;

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isDateExpired(dateFin, now) {
  const match = String(dateFin || '').match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  if (!match) return false;
  return match[1] < new Date(now).toISOString().slice(0, 10);
}

/**
 * Derives the lifecycle state of a deal.
 *
 * @param {object} deal            bons_plans row (may carry the denormalised
 *                                 availability counters).
 * @param {object} [options]
 * @param {number} [options.now]   epoch ms, injectable so this stays testable.
 */
function deriveLifecycle(deal, { now = Date.now() } = {}) {
  if (!deal) return ACTIVE;

  // An admin decision always wins — including over the end date, so a deal can
  // be brought back after a data-entry mistake.
  const override = String(deal.lifecycle_override || '').toLowerCase();
  if (override === 'expired') return EXPIRED;
  if (override === 'active') return ACTIVE;

  if (isDateExpired(deal.date_fin, now)) return EXPIRED;

  const verifiedAt = toDate(deal.last_verified_at);
  const unavailableAt = toDate(deal.last_reported_unavailable_at);
  const unavailableReports = Number(deal.availability_no_count) || 0;

  // Doubt only counts while it is the most recent signal: a later positive
  // check clears it.
  const doubtIsCurrent = unavailableAt
    && (!verifiedAt || unavailableAt.getTime() > verifiedAt.getTime());

  if (doubtIsCurrent && unavailableReports >= UNAVAILABLE_REPORTS_THRESHOLD) {
    return POSSIBLY_EXPIRED;
  }

  if (verifiedAt && now - verifiedAt.getTime() <= VERIFIED_WINDOW_MS) {
    return VERIFIED;
  }

  return ACTIVE;
}

function formatCheckedAgo(timestamp, now, lang) {
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 60) {
    const value = Math.max(1, minutes);
    return lang === 'he' ? `לפני ${value} דק׳` : `${value}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === 'he' ? `לפני ${hours} שע׳` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'he' ? `לפני ${days} ימים` : `${days}d ago`;
}

/**
 * The human label for a deal's freshness — meaningful status rather than a
 * bare "75d ago", which made every older deal look dead without context.
 */
function lifecycleLabel(deal, { now = Date.now(), lang = 'en' } = {}) {
  const state = deriveLifecycle(deal, { now });
  const he = lang === 'he';

  if (state === EXPIRED) return he ? 'פג תוקף' : 'Expired';
  if (state === POSSIBLY_EXPIRED) return he ? 'ייתכן שפג תוקף' : 'Possibly expired';

  const verifiedAt = toDate(deal?.last_verified_at);
  if (state === VERIFIED) {
    const sameDay = verifiedAt
      && new Date(verifiedAt).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10);
    if (sameDay) return he ? 'אומת היום' : 'Verified today';
    return he ? `אומת ${formatCheckedAgo(verifiedAt.getTime(), now, lang)}` : `Verified ${formatCheckedAgo(verifiedAt.getTime(), now, lang)}`;
  }

  if (verifiedAt) {
    return he
      ? `פעיל · נבדק ${formatCheckedAgo(verifiedAt.getTime(), now, lang)}`
      : `Active · checked ${formatCheckedAgo(verifiedAt.getTime(), now, lang)}`;
  }

  return he ? 'פעיל' : 'Active';
}

/** Expired deals stay reachable but must not compete with live ones. */
function isLifecycleExpired(deal, options) {
  return deriveLifecycle(deal, options) === EXPIRED;
}

module.exports = {
  ACTIVE,
  VERIFIED,
  POSSIBLY_EXPIRED,
  EXPIRED,
  LIFECYCLE_STATES,
  VERIFIED_WINDOW_MS,
  UNAVAILABLE_REPORTS_THRESHOLD,
  deriveLifecycle,
  lifecycleLabel,
  isLifecycleExpired,
};
