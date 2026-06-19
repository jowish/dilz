import { createServerSupabase, requireServerUser } from '../../../lib/serverSupabase';

const OPTIONAL_TABLES = [
  ['saved_items', 'user_id'],
  ['product_votes', 'user_id'],
  ['bons_plans_votes', 'user_id'],
  ['push_subscriptions', 'user_id'],
  ['notifications', 'user_id'],
  ['alerts', 'user_id'],
  ['blocked_users', 'blocker_id'],
  ['blocked_users', 'blocked_user_id'],
  ['content_reports', 'reporter_id'],
];

function isMissingRelation(error) {
  return ['42P01', 'PGRST204', 'PGRST205'].includes(error?.code) || /does not exist|schema cache/i.test(error?.message || '');
}

async function removeStorageFolder(supabaseAdmin, userId) {
  const bucket = supabaseAdmin.storage.from('deal-images');
  const paths = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(userId, { limit: 100, offset });
    if (error) {
      if (/not found/i.test(error.message || '')) return;
      throw error;
    }
    const files = (data || []).filter((item) => item.id).map((item) => `${userId}/${item.name}`);
    paths.push(...files);
    if (!data || data.length < 100) break;
    offset += 100;
  }

  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await bucket.remove(paths.slice(index, index + 100));
    if (error) throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const supabaseAdmin = createServerSupabase();
  const { user, error: authError } = await requireServerUser(req, supabaseAdmin);
  if (!user) return res.status(401).json({ error: authError });

  try {
    await removeStorageFolder(supabaseAdmin, user.id);

    const { error: commentError } = await supabaseAdmin
      .from('commentaires')
      .update({ auteur_id: null, auteur_nom: 'Deleted user' })
      .eq('auteur_id', user.id);
    if (commentError) throw commentError;

    const { error: dealError } = await supabaseAdmin
      .from('bons_plans')
      .update({ auteur_id: null, auteur_nom: 'Deleted user' })
      .eq('auteur_id', user.id);
    if (dealError) throw dealError;

    for (const [table, column] of OPTIONAL_TABLES) {
      const { error } = await supabaseAdmin.from(table).delete().eq(column, user.id);
      if (error && !isMissingRelation(error)) throw error;
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error('[account-delete]', error);
    return res.status(500).json({ error: 'The account could not be deleted. Please contact support.' });
  }
}
