import { createClient } from '@supabase/supabase-js';

const { getAdminToken, secretsMatch } = require('../../../lib/adminAuth');
const {
  SCOUT_ENABLED,
  candidateKey,
  discoverDeals,
  removeExisting,
  scoreDeal,
  selectQualityDeals,
} = require('../../../scripts/deal-bot');
const { discoverWithClaude } = require('../../../scripts/claude-deal-scout');

export default async function handler(req, res) {
  res.setHeader('Allow', 'POST, GET');
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  // The scout is switched off. Checked before anything else so no schedule,
  // no manual trigger and no leftover cron can discover or insert anything.
  if (!SCOUT_ENABLED) {
    return res.status(200).json({
      disabled: true,
      inserted: 0,
      erreur: 'The deal scout is switched off (SCOUT_ENABLED in scripts/deal-bot.js).',
    });
  }

  const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN || '';
  const CRON_SECRET = process.env.CRON_SECRET || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

  if (!ADMIN_BOT_TOKEN && !CRON_SECRET) {
    return res.status(500).json({ erreur: 'Deal bot is not configured.' });
  }
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ erreur: 'Database is not configured.' });
  }

  const token = getAdminToken(req);
  const validAdmin = ADMIN_BOT_TOKEN && secretsMatch(token, ADMIN_BOT_TOKEN);
  const validCron = CRON_SECRET && secretsMatch(token, CRON_SECRET);
  if (!validAdmin && !validCron) {
    return res.status(403).json({ erreur: 'Invalid token.' });
  }

  const dryRun = String(req.query.dry_run || '').toLowerCase() === 'true';
  const maxPerRun = Math.max(1, Math.min(100, Number(process.env.DEAL_BOT_MAX_PER_RUN || 25)));
  const minScore = Number(process.env.DEAL_BOT_MIN_SCORE || 65);

  try {
    // Run both discovery sources in parallel
    const [botDeals, claudeDeals] = await Promise.allSettled([
      discoverDeals(),
      discoverWithClaude(),
    ]).then((results) => results.map((r) => (r.status === 'fulfilled' ? r.value : [])));

    const botCount = botDeals.length;
    const claudeCount = claudeDeals.length;

    // Merge, deduplicate by url, score, filter
    const merged = [...botDeals, ...claudeDeals];
    const quality = selectQualityDeals(merged, minScore);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const fresh = await removeExisting(supabaseAdmin, quality);
    const selected = fresh.slice(0, maxPerRun);

    if (dryRun || selected.length === 0) {
      return res.status(200).json({
        dry_run: dryRun,
        discovered: { bot: botCount, claude: claudeCount },
        after_quality_filter: quality.length,
        after_dedup: fresh.length,
        would_insert: selected.length,
        deals: selected.map((d) => ({ score: d.quality_score, magasin: d.magasin, titre: d.titre })),
      });
    }

    const rows = selected.map(({ quality_score, source_reference, ...deal }) => ({
      ...deal,
      description: `${deal.description}\n\nSource: ${source_reference || 'DilzScout'}. Score: ${quality_score}/100.`.trim(),
      votes_chaud: 0,
      votes_froid: 0,
      statut: 'actif',
    }));

    const { data, error } = await supabaseAdmin.from('bons_plans').insert(rows).select('id,titre,magasin');
    if (error) return res.status(500).json({ erreur: error.message });

    return res.status(200).json({
      inserted: data.length,
      discovered: { bot: botCount, claude: claudeCount },
      after_quality_filter: quality.length,
      after_dedup: fresh.length,
      deals: data.map((d) => ({ id: d.id, magasin: d.magasin, titre: d.titre })),
    });
  } catch (err) {
    return res.status(500).json({ erreur: err.message || 'Unexpected error.' });
  }
}
