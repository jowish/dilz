import { createClient } from '@supabase/supabase-js';
import { processFollowerNotifications, processNewDeal } from '../../lib/alerts';
import { moderateFields } from '../../lib/contentModeration';

const { clampLimit, dateOnlyInTimeZone, dateOnlyPart, normalizeDealImageUrls, normalizeDealInput } = require('../../lib/dealValidation');

function normalizeDealDates(deal) {
  return {
    ...deal,
    image_urls: normalizeDealImageUrls(deal.image_urls, deal.image_url),
    date_debut: dateOnlyPart(deal.date_debut),
    date_fin: dateOnlyPart(deal.date_fin),
  };
}

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
      const { ville, categorie, limit = 25, offset = 0, tri = 'hot', auteur_id: filterAuteurId } = req.query;
      const responseLimit = clampLimit(limit, 25, 500);
      const responseOffset = Math.max(0, Number.parseInt(String(offset), 10) || 0);
      let query = supabase
        .from('bons_plans')
        .select('*, commentaires(count)', { count: 'exact' })
        .or('statut.eq.actif,statut.is.null');

      if (tri === 'oldest') query = query.order('created_at', { ascending: true });
      else if (tri === 'latest') query = query.order('created_at', { ascending: false });
      else if (tri === 'ending') {
        const today = dateOnlyInTimeZone();
        query = query
          .not('date_fin', 'is', null)
          .gte('date_fin', today)
          .order('date_fin', { ascending: true });
      }
      else if (tri === 'comments') query = query.order('created_at', { ascending: false });
      else query = query.order('votes_chaud', { ascending: false });

      query = query.range(responseOffset, responseOffset + responseLimit - 1);

      if (ville) query = query.eq('ville', ville);
      if (categorie && categorie !== 'all') query = query.eq('categorie', categorie);
      if (filterAuteurId) query = query.eq('auteur_id', filterAuteurId);

      const { data, error, count } = await query;
      if (error) return res.status(500).json({ erreur: error.message });
      const rows = (data || []).map(normalizeDealDates);
      if (tri === 'comments') {
        rows.sort((a, b) => {
          const ac = Number(a.commentaires?.[0]?.count || 0);
          const bc = Number(b.commentaires?.[0]?.count || 0);
          return bc - ac || new Date(b.created_at) - new Date(a.created_at);
        });
      }
      return res.status(200).json({
        bons_plans: rows,
        total: count || 0,
        limit: responseLimit,
        offset: responseOffset,
        hasMore: responseOffset + rows.length < (count || 0),
      });
    }

    // ─── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      if (!supabaseAdmin) {
        return res.status(500).json({ erreur: 'SUPABASE_SERVICE_KEY is required for deal creation.' });
      }
      // Auth required — identity comes from JWT, never from body
      const { user, error: authErr } = await verifyUser();
      if (!user) return res.status(401).json({ erreur: authErr });

      const imageUrls = normalizeDealImageUrls(req.body.image_urls, req.body.image_url);
      const normalized = normalizeDealInput({ ...req.body, image_url: imageUrls[0] });
      if (normalized.errors.length) {
        return res.status(400).json({ erreur: normalized.errors[0], errors: normalized.errors });
      }
      const moderation = moderateFields([normalized.value.titre, normalized.value.description, normalized.value.magasin]);
      if (!moderation.allowed) {
        return res.status(400).json({ erreur: moderation.reason, code: 'CONTENT_REJECTED' });
      }

      const auteur_nom =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Anonymous';

      const insertData = {
        ...normalized.value,
        image_urls: imageUrls,
        auteur_id: user.id,
        auteur_nom,
        statut: 'actif',
      };

      let { data: rows, error } = await supabaseAdmin.from('bons_plans').insert([insertData]).select('id');

      // The gallery column is optional during rollout. Location data is not:
      // never silently discard an exact address or coordinates from a new deal.
      if (error && /image_urls/i.test([error.message, error.details, error.hint].filter(Boolean).join(' '))) {
        const compatibleInsert = { ...insertData };
        delete compatibleInsert.image_urls;
        ({ data: rows, error } = await supabaseAdmin.from('bons_plans').insert([compatibleInsert]).select('id'));
      }

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
        const createdDeal = { id: newId, ...insertData };
        await Promise.allSettled([
          processNewDeal(createdDeal, supabaseAdmin),
          processFollowerNotifications(createdDeal, supabaseAdmin),
        ]).then((results) => results.forEach((result) => {
          if (result.status === 'rejected') console.error('[alerts] notification processing error:', result.reason?.message);
        }));
      }

      return res.status(201).json({
        bon_plan: normalizeDealDates({ id: newId, ...insertData, created_at: new Date().toISOString() }),
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
          .select('*')
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
          adresse: req.body.adresse ?? existing.adresse,
          latitude: req.body.latitude ?? existing.latitude,
          longitude: req.body.longitude ?? existing.longitude,
        });
        if (normalized.errors.length) {
          return res.status(400).json({ erreur: normalized.errors[0], errors: normalized.errors });
        }
        const moderation = moderateFields([normalized.value.titre, normalized.value.description, normalized.value.magasin]);
        if (!moderation.allowed) {
          return res.status(400).json({ erreur: moderation.reason, code: 'CONTENT_REJECTED' });
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
