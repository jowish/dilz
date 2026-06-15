import { createClient } from '@supabase/supabase-js';

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
  const supabaseAdmin = (() => {
    try { return serviceKey ? createClient(url, serviceKey) : supabase; }
    catch { return supabase; }
  })();

  // Verify JWT from Authorization header, return { user, error }
  async function verifyUser() {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return { user: null, error: 'Sign in to continue.' };
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
        .select('*, commentaires(count)');

      if (tri === 'oldest') query = query.order('created_at', { ascending: true });
      else if (tri === 'latest') query = query.order('created_at', { ascending: false });
      else if (tri === 'ending') {
        query = query
          .not('date_fin', 'is', null)
          .gt('date_fin', new Date().toISOString())
          .order('date_fin', { ascending: true });
      }
      else query = query.order('votes_chaud', { ascending: false });

      query = query.limit(Number(limit));

      if (ville) query = query.eq('ville', ville);
      if (categorie && categorie !== 'all') query = query.eq('categorie', categorie);
      if (filterAuteurId) query = query.eq('auteur_id', filterAuteurId);

      const { data, error } = await query;
      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(200).json({ bons_plans: data });
    }

    // ─── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      // Auth required — identity comes from JWT, never from body
      const { user, error: authErr } = await verifyUser();
      if (!user) return res.status(401).json({ erreur: authErr });

      const {
        titre, description, prix, prix_original, magasin, ville,
        categorie, url_source, image_url,
        date_debut, date_fin,
      } = req.body;

      if (!titre || !prix || !magasin) {
        return res.status(400).json({ erreur: 'titre, prix and magasin are required.' });
      }
      if (!image_url) {
        return res.status(400).json({ erreur: 'image_url is required.' });
      }

      const auteur_nom =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Anonymous';

      const insertData = {
        titre,
        description: description || null,
        prix: Number(prix) || 0,
        prix_original: prix_original ? Number(prix_original) : null,
        magasin,
        ville: ville || null,
        auteur_id: user.id,
        auteur_nom,
        image_url,
      };
      if (categorie) insertData.categorie = categorie;
      if (url_source && url_source.startsWith('http')) insertData.url_source = url_source;
      if (date_debut && String(date_debut).trim()) insertData.date_debut = date_debut;
      if (date_fin && String(date_fin).trim()) insertData.date_fin = date_fin;

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

      // ── action = "vote" ─────────────────────────────────────────────────────
      if (action === 'vote') {
        const { user, error: authErr } = await verifyUser();
        if (!user) return res.status(401).json({ erreur: authErr });

        const { type } = req.body;
        if (!['chaud', 'froid'].includes(type)) {
          return res.status(400).json({ erreur: 'type must be "chaud" or "froid".' });
        }

        // Attempt to use votes table (prevents double-voting)
        const { data: existingVote, error: voteQueryErr } = await supabaseAdmin
          .from('bons_plans_votes')
          .select('type')
          .eq('bon_plan_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        const votesTableMissing = voteQueryErr && (
          voteQueryErr.code === '42P01' ||
          voteQueryErr.message?.toLowerCase().includes('exist') ||
          voteQueryErr.message?.toLowerCase().includes('relation')
        );

        let newType, chaud_delta = 0, froid_delta = 0;

        if (votesTableMissing) {
          // Votes table not yet created — apply client-provided deltas as fallback
          const { chaud_delta: cd, froid_delta: fd } = req.body;
          const { data: cur } = await supabaseAdmin
            .from('bons_plans').select('votes_chaud,votes_froid').eq('id', id).single();
          const fallback = {
            votes_chaud: Math.max(0, (cur?.votes_chaud || 0) + (typeof cd === 'number' ? cd : (type === 'chaud' ? 1 : 0))),
            votes_froid: Math.max(0, (cur?.votes_froid || 0) + (typeof fd === 'number' ? fd : (type === 'froid' ? 1 : 0))),
          };
          await supabaseAdmin.from('bons_plans').update(fallback).eq('id', id);
          return res.status(200).json({ ok: true, newType: type, ...fallback, _warning: 'Run supabase-votes-setup.sql to enable proper vote deduplication.' });
        }

        // Toggle logic
        const oldType = existingVote?.type || null;
        newType = oldType === type ? null : type;

        if (newType === null) {
          await supabaseAdmin.from('bons_plans_votes').delete()
            .eq('bon_plan_id', id).eq('user_id', user.id);
        } else {
          const { error: upsertErr } = await supabaseAdmin.from('bons_plans_votes').upsert(
            { bon_plan_id: id, user_id: user.id, type: newType },
            { onConflict: 'bon_plan_id,user_id' }
          );
          if (upsertErr) return res.status(500).json({ erreur: upsertErr.message });
        }

        if (oldType === 'chaud') chaud_delta -= 1;
        if (oldType === 'froid') froid_delta -= 1;
        if (newType === 'chaud') chaud_delta += 1;
        if (newType === 'froid') froid_delta += 1;

        const { data: cur } = await supabaseAdmin
          .from('bons_plans').select('votes_chaud,votes_froid').eq('id', id).single();
        const newCounts = {
          votes_chaud: Math.max(0, (cur?.votes_chaud || 0) + chaud_delta),
          votes_froid: Math.max(0, (cur?.votes_froid || 0) + froid_delta),
        };
        const { error: updateErr } = await supabaseAdmin.from('bons_plans').update(newCounts).eq('id', id);
        if (updateErr) return res.status(500).json({ erreur: updateErr.message });

        return res.status(200).json({ ok: true, newType, ...newCounts });
      }

      // ── action = "edit" ─────────────────────────────────────────────────────
      if (action === 'edit') {
        const { user, error: authErr } = await verifyUser();
        if (!user) return res.status(401).json({ erreur: authErr });

        const {
          titre, description, prix, prix_original,
          magasin, ville, categorie, url_source, image_url,
        } = req.body;

        // Verify ownership from JWT (not from body)
        const { data: existing } = await supabaseAdmin
          .from('bons_plans').select('auteur_id').eq('id', id).single();
        if (!existing || existing.auteur_id !== user.id) {
          return res.status(403).json({ erreur: 'You can only edit your own deals.' });
        }

        const updateData = {
          titre,
          description: description || null,
          prix: Number(prix) || 0,
          prix_original: prix_original ? Number(prix_original) : null,
          magasin,
          ville: ville || null,
          image_url: image_url || null,
        };
        if (categorie) updateData.categorie = categorie;
        updateData.url_source = (url_source && url_source.startsWith('http')) ? url_source : null;

        const { error } = await supabaseAdmin.from('bons_plans').update(updateData).eq('id', id);
        if (error) return res.status(500).json({ erreur: error.message });
        return res.status(200).json({ ok: true });
      }

      // ── action = "delete" ────────────────────────────────────────────────────
      if (action === 'delete') {
        const { user, error: authErr } = await verifyUser();
        if (!user) return res.status(401).json({ erreur: authErr });

        const { data: existing } = await supabaseAdmin
          .from('bons_plans').select('auteur_id').eq('id', id).single();
        if (!existing || existing.auteur_id !== user.id) {
          return res.status(403).json({ erreur: 'You can only delete your own deals.' });
        }

        const { error } = await supabaseAdmin.from('bons_plans').delete().eq('id', id);
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
