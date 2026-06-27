import { createServerSupabase, requireServerUser } from '../../lib/serverSupabase';

const CONTENT_TYPES = new Set(['deal', 'comment', 'user']);
const REASONS = new Set(['expired', 'rules', 'spam', 'scam', 'abuse', 'hate', 'inappropriate', 'copyright', 'other']);

async function findReportedUser(supabaseAdmin, contentType, contentId) {
  if (contentType === 'user') return contentId;
  const table = contentType === 'deal' ? 'bons_plans' : 'commentaires';
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('auteur_id')
    .eq('id', contentId)
    .maybeSingle();
  if (error) throw error;
  return data?.auteur_id || null;
}

export default async function handler(req, res) {
  const supabaseAdmin = createServerSupabase();
  const { user, error: authError } = await requireServerUser(req, supabaseAdmin);
  if (!user) return res.status(401).json({ error: authError });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('blocked_users')
        .select('blocked_user_id')
        .eq('blocker_id', user.id);
      if (error) throw error;
      return res.status(200).json({ blockedUserIds: (data || []).map((row) => row.blocked_user_id) });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (action === 'block') {
        const blockedUserId = String(req.body.blockedUserId || '').trim();
        if (!blockedUserId || blockedUserId === user.id) return res.status(400).json({ error: 'Invalid user.' });
        const { error } = await supabaseAdmin
          .from('blocked_users')
          .upsert({ blocker_id: user.id, blocked_user_id: blockedUserId }, { onConflict: 'blocker_id,blocked_user_id' });
        if (error) throw error;
        return res.status(200).json({ blocked: true, blockedUserId });
      }

      if (action === 'report') {
        const contentType = String(req.body.contentType || '');
        const contentId = String(req.body.contentId || '').trim();
        const reason = String(req.body.reason || '');
        const details = String(req.body.details || '').trim().slice(0, 1000) || null;
        if (!CONTENT_TYPES.has(contentType) || !contentId || !REASONS.has(reason)) {
          return res.status(400).json({ error: 'Invalid report.' });
        }

        const reportedUserId = await findReportedUser(supabaseAdmin, contentType, contentId);
        if (reportedUserId === user.id) return res.status(400).json({ error: 'You cannot report your own content.' });

        const { error } = await supabaseAdmin.from('content_reports').upsert({
          reporter_id: user.id,
          content_type: contentType,
          content_id: contentId,
          reported_user_id: reportedUserId,
          reason,
          details,
          status: 'pending',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'reporter_id,content_type,content_id' });
        if (error) throw error;
        return res.status(201).json({ reported: true });
      }

      return res.status(400).json({ error: 'Invalid action.' });
    }

    if (req.method === 'DELETE') {
      const blockedUserId = String(req.body?.blockedUserId || '').trim();
      if (!blockedUserId) return res.status(400).json({ error: 'Invalid user.' });
      const { error } = await supabaseAdmin
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', blockedUserId);
      if (error) throw error;
      return res.status(200).json({ blocked: false, blockedUserId });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('[safety]', error);
    const missingMigration = ['42P01', 'PGRST204', 'PGRST205'].includes(error?.code);
    return res.status(missingMigration ? 503 : 500).json({
      error: missingMigration ? 'Safety features are not configured yet.' : 'Safety action failed.',
    });
  }
}
