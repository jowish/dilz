import { createClient } from '@supabase/supabase-js';
import { normalizeAppMessageInput } from '../../../lib/appMessages';

const { getAdminToken, secretsMatch } = require('../../../lib/adminAuth');

const DEAL_FIELDS = new Set([
  'titre',
  'description',
  'prix',
  'prix_original',
  'magasin',
  'ville',
  'categorie',
  'url_source',
  'image_url',
  'statut',
  'date_debut',
  'date_fin',
]);

const STATUSES = new Set(['pending', 'actif', 'rejete']);
const CATEGORIES = new Set(['Food', 'Tech', 'Fashion', 'Activities', 'Online']);

function cleanText(value, max = 2000) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function cleanPrice(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) throw new Error('Invalid price.');
  return n;
}

function cleanDate(value) {
  if (value == null || value === '') return null;
  const text = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Invalid date.');
  return text;
}

function normalizeDealUpdates(input = {}) {
  const updates = {};

  for (const [key, value] of Object.entries(input)) {
    if (!DEAL_FIELDS.has(key)) continue;
    if (key === 'titre') updates.titre = cleanText(value, 160);
    else if (key === 'description') updates.description = cleanText(value, 2000);
    else if (key === 'magasin') updates.magasin = cleanText(value, 120);
    else if (key === 'ville') updates.ville = cleanText(value, 120);
    else if (key === 'url_source' || key === 'image_url') updates[key] = cleanText(value, 2000);
    else if (key === 'prix' || key === 'prix_original') updates[key] = cleanPrice(value);
    else if (key === 'date_debut' || key === 'date_fin') updates[key] = cleanDate(value);
    else if (key === 'categorie') {
      const category = cleanText(value, 40);
      if (category && !CATEGORIES.has(category)) throw new Error('Invalid category.');
      updates.categorie = category;
    } else if (key === 'statut') {
      const status = cleanText(value, 20);
      if (!STATUSES.has(status)) throw new Error('Invalid status.');
      updates.statut = status;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'titre') && !updates.titre) {
    throw new Error('Title is required.');
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'magasin') && !updates.magasin) {
    throw new Error('Store is required.');
  }
  if (updates.date_debut && updates.date_fin && updates.date_fin < updates.date_debut) {
    throw new Error('End date must be after start date.');
  }

  return updates;
}

export default async function handler(req, res) {
  res.setHeader('Allow', 'POST');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Method not allowed' });

  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_KEY: serviceKey, ADMIN_BOT_TOKEN } = process.env;
  if (!url || !serviceKey || !ADMIN_BOT_TOKEN) {
    return res.status(500).json({ erreur: 'Admin actions are not configured.' });
  }
  if (!secretsMatch(getAdminToken(req), ADMIN_BOT_TOKEN)) {
    return res.status(403).json({ erreur: 'Invalid admin token' });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { action } = req.body || {};
    if (action === 'delete_deal') {
      const id = Number(req.body.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ erreur: 'Valid deal id required.' });
      const { error } = await supabase.from('bons_plans').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'update_deal') {
      const id = Number(req.body.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ erreur: 'Valid deal id required.' });
      const updates = normalizeDealUpdates(req.body.updates || {});
      if (!Object.keys(updates).length) return res.status(400).json({ erreur: 'No valid fields to update.' });
      const { data, error } = await supabase
        .from('bons_plans')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return res.status(200).json({ ok: true, deal: data });
    }

    if (action === 'delete_comment') {
      const id = Number(req.body.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ erreur: 'Valid comment id required.' });
      const { error } = await supabase.from('commentaires').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'review_report') {
      const id = String(req.body.id || '').trim();
      const status = String(req.body.status || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ erreur: 'Valid report id required.' });
      if (!['reviewed', 'actioned', 'dismissed'].includes(status)) return res.status(400).json({ erreur: 'Invalid report status.' });
      const { error } = await supabase
        .from('content_reports')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === 'ban_user' || action === 'unban_user') {
      const userId = String(req.body.user_id || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return res.status(400).json({ erreur: 'Valid user id required.' });
      const banDuration = action === 'ban_user' ? String(req.body.duration || '876000h') : 'none';
      const { data, error } = await supabase.auth.admin.updateUserById(userId, { ban_duration: banDuration });
      if (error) throw error;
      return res.status(200).json({ ok: true, user: data?.user || null });
    }

    if (action === 'upsert_app_message') {
      const message = normalizeAppMessageInput(req.body.message || {});
      const id = String(req.body.id || '').trim();
      let query;
      if (id) {
        if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ erreur: 'Valid message id required.' });
        query = supabase
          .from('app_messages')
          .update({ ...message, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single();
      } else {
        query = supabase.from('app_messages').insert(message).select('*').single();
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ ok: true, message: data });
    }

    if (action === 'delete_app_message') {
      const id = String(req.body.id || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ erreur: 'Valid message id required.' });
      const { error } = await supabase.from('app_messages').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ erreur: 'Unknown admin action.' });
  } catch (error) {
    return res.status(500).json({ erreur: error.message || 'Admin action failed.' });
  }
}
