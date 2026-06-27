import { createClient } from '@supabase/supabase-js';

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanName(value, email) {
  const fallback = email.split('@')[0] || 'Dilz member';
  return String(value || fallback).trim().slice(0, 80) || fallback;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'Method not allowed.' });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ erreur: 'Server signup is not configured.' });

  const email = cleanEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const displayName = cleanName(req.body?.name, email);

  if (!email || !email.includes('@') || password.length < 6) {
    return res.status(400).json({ erreur: 'Enter a valid email and a password of at least 6 characters.' });
  }

  const admin = createClient(url, serviceKey);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (error) {
    const message = /already|registered|exists/i.test(error.message)
      ? 'An account already exists for this email. Sign in instead.'
      : error.message;
    return res.status(400).json({ erreur: message });
  }

  return res.status(201).json({
    user: {
      id: data.user?.id || null,
      email: data.user?.email || email,
      display_name: displayName,
    },
  });
}
