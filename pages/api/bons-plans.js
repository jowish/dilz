import { createClient } from '@supabase/supabase-js';
import { processNewDeal } from '../../lib/alerts';

const { clampLimit, normalizeDealInput } = require('../../lib/dealValidation');

export default async function handler(req, res) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;

  if (!url || !anonKey) {
    return res.status(500).json({ erreur: 'Missing Supabase configuration' });
  }

  const supabase = createClient(url, anonKey);
  const supabaseAdmin = serviceKey ? createClient(url, serviceKey) : null;

  // Verify JWT from Authorization header, return { user, error }
  async function verifyUser() {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return { user: null, error: 'Sign in to continue.' };
    if (!supabaseAdmin) return { user: null, error: 'Server authentication is not configured.' };
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return { user: null, error: 'Session expired. Please sign in again.' };
    return { user, error: null };
  }

  try {
    // ─── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { ville, categorie, limit = 50, tri = 'hot', auteur_id: filterAuteurId } = req.query;
      let query = supabase
        .from('bons_plans')
        .select('*, commentaires(count)')
        .or('statut.eq.actif,statut.is.null');

      if (tri === 'oldest') query = query.order('created_at', { ascending: true });
      else if (tri === 'latest') query = query.order('created_at', { ascending: false });
      else if (tri === 'ending') {
        query = query
          .not('date_fin', 'is', null)
          .gt('date_fin', new Date().toISOString())
          .order('date_fin', { ascending: true });
      }
      else query = query.order('votes_chaud', { ascending: false });

      query = query.limit(clampLimit(limit));

      if (ville) query = query.eq('ville', ville);
      if (categorie && categorie !== 'all') query = query.eq('categorie', categorie);
      if (filterAuteurId) query = query.eq('auteur_id', filterAuteurId);

      const { data, error } = await query;
      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(200).json({ bons_plans: data });
    }

    // ─── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      if (!supabaseAdmin) {
        return res.status(500).json({ erreur: 'SUPABASE_SERVICE_KEY is required for deal creation.' });
      }
      // Auth required — identity comes from JWT, never from body
      const { user, error: authErr } = await verifyUser();
      if (!user) return res.status(401).json({ erreur: authErr });

      const normalized = normalizeDealInput(req.body);
      if (normalized.errors.length) {
        return res.status(400).json({ erreur: normalized.errors[0], errors: normalized.errors });
      }

      const auteur_nom =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Anonymous';

      const insertData = {
        ...normalized.value,
        auteur_id: user.id,
        auteur_nom,
        statut: 'actif',
      };

      const { data: rows, error } = await supabaseAdmin
        .from('bons_plans')
        .insert([insertData])
        .select('id');

      if (error) {
        return res.status(500).json({
          erreur: error.message,
          code: error.code || null,
          hint: error.hint || error.details || null,
        });
      }
      const newId = rows?.[0]?.id || null;

      // Finish alert matching before returning so serverless runtimes cannot drop it.
      if (newId) {
        await processNewDeal({ id: newId, ...insertData }, supabaseAdmin).catch(e => {
          console.error('[alerts] processNewDeal error:', e.message);
        });
      }

      return res.status(201).json({
        bon_plan: { id: newId, ...insertData, created_at: new Date().toISOString() },
      });
    }

    // ─── PATCH ────────────────────────────────────────────────────────────────
    if (req.method === 'PATCH') {
      const { action, id } = req.body;

      if (!action) {
        return res.status(400).json({
          erreur: 'Missing action field. Use action="vote" or action="edit".',
        });
      }

      if (!id) {
        return res.status(400).json({ erreur: 'Missing deal id.' });
      }
      const dealId = Number(id);
      if (!Number.isSafeInteger(dealId) || dealId <= 0) {
        return res.status(400).json({ erreur: 'Invalid deal id.' });
      }

      // ── action = "vote" ─────────────────────────────────────────────────────
      if (action === 'vote') {
        if (!supabaseAdmin) {
          return res.status(500).json({ erreur: 'SUPABASE_SERVICE_KEY is required for voting.' });
        }
        const { user, error: authErr } = await verifyUser();
        if (!user) return res.status(401).json({ erreur: authErr });

        const { type } = req.body;
        if (!['chaud', 'froid'].includes(type)) {
          return res.status(400).json({ erreur: 'type must be "chaud" or "froid".' });
        }

        const { data, error } = await supabaseAdmin.rpc('cast_bon_plan_vote', {
          p_bon_plan_id: dealId,
          p_user_id: user.id,
          p_type: type,
        });

        if (error) {
          const migrationMissing = error.code === 'PGRST202' || error.message?.includes('cast_bon_plan_vote');
          return res.status(migrationMissing ? 503 : 500).json({
            erreur: migrationMissing
              ? 'Voting is not configured. Run supabase-votes-setup.sql.'
              : error.message,
          });
        }

        const result = Array.isArray(data) ? data[0] : data;
        return res.status(200).json({
          ok: true,
          newType: result?.new_type || null,
          votes_chaud: result?.votes_chaud || 0,
          votes_froid: result?.votes_froid || 0,
        });
      }

      // ── action = "edit" ─────────────────────────────────────────────────────
      if (action === 'edit') {
        if (!supabaseAdmin) {
          return res.status(500).json({ erreur: 'SUPABASE_SERVICE_KEY is required for editing.' });
        }
        const { user, error: authErr } = await verifyUser();
        if (!user) return res.status(401).json({ erreur: authErr });

        // Verify ownership from JWT (not from body)
        const { data: existing } = await supabaseAdmin
          .from('bons_plans')
          .select('auteur_id,image_url,categorie,date_debut,date_fin')
          .eq('id', dealId)
          .single();
        if (!existing || existing.auteur_id !== user.id) {
          return res.status(403).json({ erreur: 'You can only edit your own deals.' });
        }

        const normalized = normalizeDealInput({
          ...req.body,
          image_url: req.body.image_url || existing.image_url,
          categorie: req.body.categorie || existing.categorie,
          date_debut: req.body.date_debut ?? existing.date_debut,
          date_fin: req.body.date_fin ?? existing.date_fin,
        });
        if (normalized.errors.length) {
          return res.status(400).json({ erreur: normalized.errors[0], errors: normalized.errors });
        }

        const { error } = await supabaseAdmin.from('bons_plans').update(normalized.value).eq('id', dealId);
        if (error) return res.status(500).json({ erreur: error.message });
        return res.status(200).json({ ok: true });
      }

      // ── action = "delete" ────────────────────────────────────────────────────
      if (action === 'delete') {
        if (!supabaseAdmin) {
          return res.status(500).json({ erreur: 'SUPABASE_SERVICE_KEY is required for deletion.' });
        }
        const { user, error: authErr } = await verifyUser();
        if (!user) return res.status(401).json({ erreur: authErr });

        const { data: existing } = await supabaseAdmin
          .from('bons_plans').select('auteur_id').eq('id', dealId).single();
        if (!existing || existing.auteur_id !== user.id) {
          return res.status(403).json({ erreur: 'You can only delete your own deals.' });
        }

        const { error } = await supabaseAdmin.from('bons_plans').delete().eq('id', dealId);
        if (error) return res.status(500).json({ erreur: error.message });
        return res.status(200).json({ ok: true });
      }

      // ── Unknown action ────────────────────────────────────────────────────
      return res.status(400).json({
        erreur: `Unknown action "${action}". Supported actions: "vote", "edit", "delete".`,
      });
    }

    res.status(405).end();
  } catch (e) {
    return res.status(500).json({ erreur: e.message || 'Internal server error' });
  }
}
