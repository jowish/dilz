import { createClient } from '@supabase/supabase-js';

const { getAdminToken, secretsMatch } = require('../../../lib/adminAuth');

const DAY_MS = 24 * 60 * 60 * 1000;

function since(days) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function isMissingTable(error) {
  return error?.code === 'PGRST205' || /not exist|schema cache|Could not find/i.test(error?.message || '');
}

async function countRows(supabase, table, apply = query => query) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  query = apply(query);
  const { count, error } = await query;
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return count || 0;
}

async function selectRows(supabase, table, columns, apply = query => query, fallback = []) {
  let query = supabase.from(table).select(columns);
  query = apply(query);
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return fallback;
    throw error;
  }
  return data || fallback;
}

function groupCount(rows, key, limit = 12) {
  const counts = new Map();
  for (const row of rows || []) {
    const raw = typeof key === 'function' ? key(row) : row?.[key];
    const label = raw == null || raw === '' ? 'Unknown' : String(raw);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function sum(rows, key) {
  return (rows || []).reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

async function getUsers(supabase) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const users = data?.users || [];
  const now24 = since(1);
  const now7 = since(7);
  return {
    total: users.length,
    confirmed: users.filter(user => user.email_confirmed_at || user.confirmed_at).length,
    new24h: users.filter(user => user.created_at >= now24).length,
    new7d: users.filter(user => user.created_at >= now7).length,
    latest: users
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8)
      .map(user => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.display_name || user.user_metadata?.full_name || null,
        created_at: user.created_at,
        confirmed: Boolean(user.email_confirmed_at || user.confirmed_at),
        last_sign_in_at: user.last_sign_in_at || null,
      })),
  };
}

export default async function handler(req, res) {
  res.setHeader('Allow', 'GET');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ erreur: 'Method not allowed' });

  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_KEY: serviceKey, ADMIN_BOT_TOKEN } = process.env;
  if (!url || !serviceKey || !ADMIN_BOT_TOKEN) {
    return res.status(500).json({ erreur: 'Admin dashboard is not configured.' });
  }
  if (!secretsMatch(getAdminToken(req), ADMIN_BOT_TOKEN)) {
    return res.status(403).json({ erreur: 'Invalid admin token' });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const [
      users,
      dealsTotal,
      deals24h,
      deals7d,
      activeDeals,
      pendingDeals,
      rejectedDeals,
      expiredDeals,
      endingSoonDeals,
      dealsWithImage,
      dealsWithUrl,
      dealRows,
      topDeals,
      recentDeals,
      productsTotal,
      productsWithImage,
      productsPendingImage,
      productRows,
      priceRowsTotal,
      priceRowsRecent,
      priceRows,
      storesTotal,
      promotionsTotal,
      commentsTotal,
      recentComments,
      dealVotesTotal,
      productVotesTotal,
      savedTotal,
      savedRows,
      alertsTotal,
      activeAlerts,
      notificationsTotal,
      unreadNotifications,
      pushSubscriptions,
    ] = await Promise.all([
      getUsers(supabase),
      countRows(supabase, 'bons_plans'),
      countRows(supabase, 'bons_plans', q => q.gte('created_at', since(1))),
      countRows(supabase, 'bons_plans', q => q.gte('created_at', since(7))),
      countRows(supabase, 'bons_plans', q => q.eq('statut', 'actif')),
      countRows(supabase, 'bons_plans', q => q.eq('statut', 'pending')),
      countRows(supabase, 'bons_plans', q => q.eq('statut', 'rejete')),
      countRows(supabase, 'bons_plans', q => q.lt('date_fin', new Date().toISOString().slice(0, 10))),
      countRows(supabase, 'bons_plans', q => q.gte('date_fin', new Date().toISOString().slice(0, 10)).lte('date_fin', new Date(Date.now() + 3 * DAY_MS).toISOString().slice(0, 10))),
      countRows(supabase, 'bons_plans', q => q.not('image_url', 'is', null)),
      countRows(supabase, 'bons_plans', q => q.not('url_source', 'is', null)),
      selectRows(supabase, 'bons_plans', 'id,titre,magasin,ville,categorie,statut,prix,prix_original,votes_chaud,votes_froid,image_url,url_source,auteur_nom,created_at,date_fin', q => q.order('created_at', { ascending: false }).limit(500)),
      selectRows(supabase, 'bons_plans', 'id,titre,magasin,ville,categorie,statut,prix,votes_chaud,votes_froid,created_at', q => q.order('votes_chaud', { ascending: false }).limit(10)),
      selectRows(supabase, 'bons_plans', 'id,titre,magasin,ville,categorie,statut,prix,auteur_nom,created_at', q => q.order('created_at', { ascending: false }).limit(12)),
      countRows(supabase, 'produits'),
      countRows(supabase, 'produits', q => q.not('image', 'is', null)),
      countRows(supabase, 'produits', q => q.eq('image_status', 'pending')),
      selectRows(supabase, 'produits', 'barcode,nom,categorie,image,image_source,image_status,votes_chaud,votes_froid,created_at', q => q.order('created_at', { ascending: false }).limit(600)),
      countRows(supabase, 'prix'),
      countRows(supabase, 'prix', q => q.gte('mis_a_jour', since(1))),
      selectRows(supabase, 'prix', 'barcode,enseigne_code,store_id,prix,mis_a_jour', q => q.order('mis_a_jour', { ascending: false }).limit(1200)),
      countRows(supabase, 'magasins'),
      countRows(supabase, 'promotions'),
      countRows(supabase, 'commentaires'),
      selectRows(supabase, 'commentaires', 'id,bon_plan_id,auteur_nom,contenu,created_at', q => q.order('created_at', { ascending: false }).limit(10)),
      countRows(supabase, 'bons_plans_votes'),
      countRows(supabase, 'product_votes'),
      countRows(supabase, 'saved_items'),
      selectRows(supabase, 'saved_items', 'item_type,item_id,created_at', q => q.order('created_at', { ascending: false }).limit(500)),
      countRows(supabase, 'alerts'),
      countRows(supabase, 'alerts', q => q.eq('is_active', true)),
      countRows(supabase, 'notifications'),
      countRows(supabase, 'notifications', q => q.eq('is_read', false)),
      countRows(supabase, 'push_subscriptions'),
    ]);

    const dealsWithoutImage = Math.max((dealsTotal || 0) - (dealsWithImage || 0), 0);
    const productsWithoutImage = Math.max((productsTotal || 0) - (productsWithImage || 0), 0);
    const stalePriceCutoff = Date.now() - 3 * DAY_MS;
    const stalePriceRows = (priceRows || []).filter(row => new Date(row.mis_a_jour).getTime() < stalePriceCutoff).length;
    const storesWithPrices = new Set((priceRows || []).map(row => row.enseigne_code)).size;

    return res.status(200).json({
      generated_at: new Date().toISOString(),
      users,
      overview: {
        users: users.total,
        deals: dealsTotal,
        activeDeals,
        pendingDeals,
        products: productsTotal,
        productsWithImage,
        productsWithoutImage,
        priceRows: priceRowsTotal,
        stores: storesTotal,
        comments: commentsTotal,
        savedItems: savedTotal,
        alerts: alertsTotal,
        notifications: notificationsTotal,
      },
      deals: {
        total: dealsTotal,
        active: activeDeals,
        pending: pendingDeals,
        rejected: rejectedDeals,
        new24h: deals24h,
        new7d: deals7d,
        expired: expiredDeals,
        endingSoon: endingSoonDeals,
        withImage: dealsWithImage,
        withoutImage: dealsWithoutImage,
        withUrl: dealsWithUrl,
        imageCoveragePct: pct(dealsWithImage, dealsTotal),
        totalHotVotes: sum(dealRows, 'votes_chaud'),
        totalColdVotes: sum(dealRows, 'votes_froid'),
        byCategory: groupCount(dealRows, 'categorie'),
        byCity: groupCount(dealRows, 'ville'),
        byStore: groupCount(dealRows, 'magasin'),
        byStatus: groupCount(dealRows, 'statut'),
        top: topDeals,
        recent: recentDeals,
      },
      products: {
        total: productsTotal,
        withImage: productsWithImage,
        withoutImage: productsWithoutImage,
        pendingImage: productsPendingImage,
        imageCoveragePct: pct(productsWithImage, productsTotal),
        totalHotVotes: sum(productRows, 'votes_chaud'),
        totalColdVotes: sum(productRows, 'votes_froid'),
        byCategory: groupCount(productRows, 'categorie'),
        byImageStatus: groupCount(productRows, 'image_status'),
        byImageSource: groupCount(productRows, 'image_source'),
        topVoted: (productRows || [])
          .slice()
          .sort((a, b) => (Number(b.votes_chaud || 0) - Number(b.votes_froid || 0)) - (Number(a.votes_chaud || 0) - Number(a.votes_froid || 0)))
          .slice(0, 10),
      },
      supermarkets: {
        storesTotal,
        storesWithPrices,
        priceRows: priceRowsTotal,
        priceRowsUpdated24h: priceRowsRecent,
        stalePriceRows,
        promotionsTotal,
        rowsByStore: groupCount(priceRows, 'enseigne_code', 20),
      },
      engagement: {
        commentsTotal,
        recentComments,
        dealVotesTotal,
        productVotesTotal,
        savedTotal,
        savedByType: groupCount(savedRows, 'item_type'),
        alertsTotal,
        activeAlerts,
        notificationsTotal,
        unreadNotifications,
        pushSubscriptions,
      },
      health: {
        pendingDeals,
        dealsWithoutImage,
        productsWithoutImage,
        productsPendingImage,
        stalePriceRows,
        unreadNotifications,
        warnings: [
          pendingDeals ? `${pendingDeals} pending deals need moderation.` : null,
          dealsWithoutImage ? `${dealsWithoutImage} community deals have no image.` : null,
          productsWithoutImage ? `${productsWithoutImage} supermarket products have no image.` : null,
          stalePriceRows ? `${stalePriceRows} price rows are older than 3 days in the sampled data.` : null,
        ].filter(Boolean),
      },
    });
  } catch (error) {
    return res.status(500).json({ erreur: error.message || 'Unable to build dashboard.' });
  }
}
