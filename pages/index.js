import { useState, useEffect } from 'react';
import Link from 'next/link';

const COULEURS_ENSEIGNE = {
  'שופרסל': { bg: '#dbeafe', text: '#1e40af' },
  'רמי לוי': { bg: '#fee2e2', text: '#991b1b' },
  'ויקטורי': { bg: '#ede9fe', text: '#5b21b6' },
};

const EMOJIS_CATEGORIE = ['🧴', '🥛', '🍫', '🥤', '🧀', '🍞', '🥚', '🧹', '🫙', '🍖'];

function getEmoji(nom) {
  if (nom.includes('שמפו') || nom.includes('סבון')) return '🧴';
  if (nom.includes('חלב') || nom.includes('גבינה')) return '🥛';
  if (nom.includes('נוטלה') || nom.includes('שוקולד')) return '🍫';
  if (nom.includes('קולה') || nom.includes('משקה')) return '🥤';
  if (nom.includes('ביצ')) return '🥚';
  if (nom.includes('לחם') || nom.includes('פיתה')) return '🍞';
  if (nom.includes('עוף') || nom.includes('בשר')) return '🍖';
  const h = nom.charCodeAt(0) % EMOJIS_CATEGORIE.length;
  return EMOJIS_CATEGORIE[h];
}

const COULEURS_BG = ['#d1fae5', '#dbeafe', '#ffedd5', '#ede9fe', '#fce7f3', '#cffafe'];
function getBg(barcode) {
  return COULEURS_BG[parseInt(barcode?.slice(-1) || '0') % COULEURS_BG.length];
}

function StoreTag({ enseigne }) {
  const c = COULEURS_ENSEIGNE[enseigne] || { bg: '#f3f4f6', text: '#374151' };
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>
      {enseigne}
    </span>
  );
}

function CartePromo({ promo }) {
  const emoji = getEmoji(promo.nom);
  const bg = getBg(promo.barcode);
  return (
    <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, overflow: 'hidden', border: '0.5px solid var(--color-border-tertiary)' }}>
      <div style={{ height: 90, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
        {emoji}
      </div>
      <div style={{ padding: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 500, textAlign: 'right', marginBottom: 6, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>{promo.nom}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 7px', borderRadius: 20, background: '#dcfce7', color: '#15803d' }}>-{promo.reduction}%</span>
          <span style={{ fontSize: 18, fontWeight: 500, color: '#16a34a' }}>{promo.prixMin}₪</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>{promo.prixMax}₪</span>
          <StoreTag enseigne={promo.meilleurEnseigne} />
        </div>
      </div>
    </div>
  );
}

function CarteDeal({ bp }) {
  const [votes, setVotes] = useState({ chaud: bp.votes_chaud, froid: bp.votes_froid });
  const [monVote, setMonVote] = useState(null);
  const reduction = bp.prix_original ? Math.round((bp.prix_original - bp.prix) / bp.prix_original * 100) : null;

  const voter = async (type) => {
    if (monVote) return;
    setMonVote(type);
    setVotes(v => ({ ...v, [type === 'chaud' ? 'chaud' : 'froid']: v[type === 'chaud' ? 'chaud' : 'froid'] + 1 }));
    await fetch('/api/bons-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bp.id, vote: type })
    });
  };

  return (
    <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: 14, border: '0.5px solid var(--color-border-tertiary)', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <StoreTag enseigne={bp.magasin} />
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', textAlign: 'right', flex: 1, marginRight: 8 }}>{bp.titre}</p>
      </div>
      {bp.description && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right', marginBottom: 8 }}>{bp.description}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => voter('froid')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '0.5px solid var(--color-border-secondary)', background: monVote === 'froid' ? '#dbeafe' : 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            ❄️ {votes.froid}
          </button>
          <button onClick={() => voter('chaud')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '0.5px solid var(--color-border-secondary)', background: monVote === 'chaud' ? '#fff7ed' : 'var(--color-background-secondary)', color: monVote === 'chaud' ? '#c2410c' : 'var(--color-text-secondary)', cursor: 'pointer' }}>
            🔥 {votes.chaud}
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          {bp.prix_original && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textDecoration: 'line-through', marginLeft: 4 }}>{bp.prix_original}₪</span>}
          <span style={{ fontSize: 22, fontWeight: 500, color: '#16a34a' }}>{bp.prix}₪</span>
          {reduction && <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 20, background: '#dcfce7', color: '#15803d', marginRight: 4 }}>-{reduction}%</span>}
        </div>
      </div>
    </div>
  );
}

function CarteRecherche({ produit, dansPanier, onAjouter, onRetirer }) {
  const tousLesPrix = produit.tousLesPrix;
  const meilleurPrix = Math.min(...tousLesPrix.map(p => p.prix));
  const prixIdentiques = tousLesPrix.every(p => p.prix === meilleurPrix);

  return (
    <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: 14, border: '0.5px solid var(--color-border-tertiary)', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <button onClick={() => dansPanier ? onRetirer(produit.barcode) : onAjouter(produit)}
          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 500, background: dansPanier ? '#fee2e2' : '#dbeafe', color: dansPanier ? '#991b1b' : '#1e40af' }}>
          {dansPanier ? '✓ ברשימה' : '+ הוסף'}
        </button>
        <div style={{ textAlign: 'right', flex: 1, marginRight: 10 }}>
          <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--color-text-primary)' }}>{produit.nom}</p>
          {produit.quantite && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{produit.quantite} {produit.unite}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tousLesPrix.map(p => {
          const estMeilleur = p.prix === meilleurPrix;
          return (
            <div key={p.enseigne} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: estMeilleur && !prixIdentiques ? '#f0fdf4' : 'var(--color-background-secondary)', border: estMeilleur && !prixIdentiques ? '1px solid #bbf7d0' : '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StoreTag enseigne={p.enseigne} />
                {estMeilleur && !prixIdentiques && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 500 }}>הכי זול</span>}
                {!estMeilleur && !prixIdentiques && <span style={{ fontSize: 11, color: '#dc2626' }}>+{(p.prix - meilleurPrix).toFixed(2)}₪</span>}
              </div>
              <span style={{ fontSize: 18, fontWeight: 500, color: estMeilleur && !prixIdentiques ? '#16a34a' : 'var(--color-text-secondary)' }}>{p.prix}₪</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OptimisationPanier({ panier }) {
  const ENSEIGNES = ['שופרסל', 'רמי לוי', 'ויקטורי'];
  const totalParMagasin = ENSEIGNES.map(enseigne => {
    let total = 0, manquants = 0;
    panier.forEach(p => {
      const px = p.tousLesPrix.find(x => x.enseigne === enseigne);
      if (px) total += px.prix; else manquants++;
    });
    return { enseigne, total, manquants };
  }).filter(x => x.manquants < panier.length).sort((a, b) => a.total - b.total);

  const repartitionMulti = {};
  let totalMulti = 0;
  panier.forEach(p => {
    const meilleur = p.tousLesPrix.reduce((best, x) => x.prix < best.prix ? x : best);
    if (!repartitionMulti[meilleur.enseigne]) repartitionMulti[meilleur.enseigne] = [];
    repartitionMulti[meilleur.enseigne].push({ nom: p.nom, prix: meilleur.prix });
    totalMulti += meilleur.prix;
  });

  const meilMagasin = totalParMagasin[0];
  const economiMulti = meilMagasin ? (meilMagasin.total - totalMulti).toFixed(2) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: 14, border: '0.5px solid var(--color-border-tertiary)' }}>
        <p style={{ fontWeight: 500, textAlign: 'right', marginBottom: 10, fontSize: 14, color: 'var(--color-text-primary)' }}>אפשרות 1 — חנות אחת</p>
        {totalParMagasin.map((m, i) => (
          <div key={m.enseigne} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, marginBottom: 6, background: i === 0 ? '#f0fdf4' : 'var(--color-background-secondary)', border: i === 0 ? '1px solid #bbf7d0' : '0.5px solid var(--color-border-tertiary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StoreTag enseigne={m.enseigne} />
              {i === 0 && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 500 }}>הכי זול</span>}
            </div>
            <span style={{ fontSize: 18, fontWeight: 500, color: i === 0 ? '#16a34a' : 'var(--color-text-secondary)' }}>{m.total.toFixed(2)}₪</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: 14, border: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: '#15803d', fontWeight: 500, background: '#dcfce7', padding: '3px 10px', borderRadius: 20 }}>חיסכון: {economiMulti}₪</span>
          <p style={{ fontWeight: 500, textAlign: 'right', fontSize: 14, color: 'var(--color-text-primary)' }}>אפשרות 2 — הכי חסכוני</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: '#15803d' }}>סה״כ</span>
          <span style={{ fontSize: 22, fontWeight: 500, color: '#16a34a' }}>{totalMulti.toFixed(2)}₪</span>
        </div>
        {Object.entries(repartitionMulti).map(([enseigne, items]) => (
          <div key={enseigne} style={{ marginBottom: 10 }}>
            <StoreTag enseigne={enseigne} />
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                <span style={{ fontWeight: 500 }}>{item.prix}₪</span>
                <span>{item.nom}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [onglet, setOnglet] = useState('promos');
  const [promos, setPromos] = useState([]);
  const [deals, setDeals] = useState([]);
  const [chargementPromos, setChargementPromos] = useState(true);
  const [chargementDeals, setChargementDeals] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [produits, setProduits] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [panier, setPanier] = useState([]);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    fetch('/api/promos').then(r => r.json()).then(d => { setPromos(d.promos || []); setChargementPromos(false); }).catch(() => setChargementPromos(false));
    fetch('/api/bons-plans').then(r => r.json()).then(d => { setDeals(d.bons_plans || []); setChargementDeals(false); }).catch(() => setChargementDeals(false));
  }, []);

  useEffect(() => {
    if (recherche.length < 2) { setProduits([]); return; }
    const timer = setTimeout(async () => {
      setChargement(true);
      setErreur('');
      try {
        const res = await fetch('/api/prix?q=' + encodeURIComponent(recherche));
        const data = await res.json();
        if (data.erreur) throw new Error(data.erreur);
        setProduits((data.produits || []).filter(p => p.nom && p.nom.includes(recherche)));
      } catch(e) { setErreur('שגיאה'); }
      setChargement(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [recherche]);

  const ajouterAuPanier = (p) => { if (!panier.find(x => x.barcode === p.barcode)) setPanier([...panier, p]); };
  const retirerDuPanier = (barcode) => setPanier(panier.filter(p => p.barcode !== barcode));
  const totalMeilleur = panier.reduce((s, p) => s + Math.min(...p.tousLesPrix.map(x => x.prix)), 0);

  const ongletActif = recherche.length >= 2 ? 'recherche' : onglet;

  const navItems = [
    { id: 'panier', icon: '🛒', label: 'סל', badge: panier.length > 0 ? panier.length : null },
    { id: 'recherche', icon: '🔍', label: 'חיפוש' },
    { id: 'promos', icon: '🏷️', label: 'מבצעים' },
    { id: 'deals', icon: '🔥', label: 'דילים' },
  ];

  const handleNav = (id) => {
    if (id === 'recherche') { document.getElementById('search-input')?.focus(); return; }
    if (id !== 'panier') setRecherche('');
    setOnglet(id === 'panier' ? onglet : id);
    if (id === 'panier') setOnglet('panier');
  };

  const ongletVisible = onglet === 'panier' || (recherche.length === 0 && onglet !== 'panier') ? onglet : 'recherche';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary)', fontFamily: 'var(--font-sans)', paddingBottom: 80 }} dir="rtl">

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '16px 20px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div></div>
            <span style={{ fontSize: 26, fontWeight: 500, color: '#fff', letterSpacing: -0.5 }}>
              dil<span style={{ color: '#4ade80' }}>z</span>
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>🔍</span>
            <input id="search-input" type="text" placeholder="חפש מוצר... נוטלה, קוקה קולה"
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, flex: 1, outline: 'none', textAlign: 'right' }}
              value={recherche} onChange={e => setRecherche(e.target.value)} />
            {recherche && <button onClick={() => setRecherche('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16 }}>✕</button>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>

        {/* Vue Panier */}
        {onglet === 'panier' && recherche.length < 2 && (
          <div>
            {panier.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                <p style={{ fontSize: 16 }}>הסל שלך ריק</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>חפש מוצרים והוסף לסל</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 16, fontWeight: 500, textAlign: 'right', marginBottom: 12, color: 'var(--color-text-primary)' }}>רשימת הקניות ({panier.length})</p>
                <div style={{ background: 'var(--color-background-primary)', borderRadius: 16, padding: 14, border: '0.5px solid var(--color-border-tertiary)', marginBottom: 12 }}>
                  {panier.map((p, i) => {
                    const meilPrix = Math.min(...p.tousLesPrix.map(x => x.prix));
                    const meilEnseigne = p.tousLesPrix.find(x => x.prix === meilPrix);
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < panier.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => retirerDuPanier(p.barcode)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>✕</button>
                          <span style={{ fontSize: 16, fontWeight: 500, color: '#16a34a' }}>{meilPrix}₪</span>
                          <StoreTag enseigne={meilEnseigne?.enseigne} />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right', maxWidth: 180 }}>{p.nom}</span>
                      </div>
                    );
                  })}
                </div>
                <OptimisationPanier panier={panier} />
              </div>
            )}
          </div>
        )}

        {/* Vue Recherche */}
        {recherche.length >= 2 && (
          <div>
            {chargement && <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 20 }}>טוען...</p>}
            {produits.length > 0 && !chargement && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right', marginBottom: 10 }}>{produits.length} מוצרים</p>
                {produits.map(p => (
                  <CarteRecherche key={p.barcode} produit={p}
                    dansPanier={!!panier.find(x => x.barcode === p.barcode)}
                    onAjouter={ajouterAuPanier} onRetirer={retirerDuPanier} />
                ))}
              </div>
            )}
            {!chargement && produits.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 40 }}>לא נמצאו מוצרים</p>
            )}
          </div>
        )}

        {/* Vue Promos */}
        {onglet === 'promos' && recherche.length < 2 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right', marginBottom: 12 }}>המבצעים הכי טובים היום</p>
            {chargementPromos ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 40 }}>טוען מבצעים...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {promos.map(promo => <CartePromo key={promo.barcode} promo={promo} />)}
              </div>
            )}
          </div>
        )}

        {/* Vue Deals */}
        {onglet === 'deals' && recherche.length < 2 && (
          <div>
            <Link href="/bons-plans"
              style={{ display: 'block', textAlign: 'center', background: '#1a1a2e', color: '#4ade80', padding: 14, borderRadius: 14, textDecoration: 'none', fontWeight: 500, fontSize: 14, marginBottom: 16 }}>
              + שתף דיל חדש
            </Link>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right', marginBottom: 12 }}>דילים חמים מהקהילה 🔥</p>
            {chargementDeals ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 20 }}>טוען דילים...</p>
            ) : (
              deals.slice(0, 5).map(bp => <CarteDeal key={bp.id} bp={bp} />)
            )}
            <Link href="/bons-plans" style={{ display: 'block', textAlign: 'center', padding: 12, color: 'var(--color-text-secondary)', fontSize: 13, textDecoration: 'none' }}>
              כל הדילים →
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderTop: '0.5px solid rgba(255,255,255,0.3)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 16px', zIndex: 20, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
        {navItems.map(item => {
          const actif = item.id === 'panier' ? onglet === 'panier' : item.id === 'recherche' ? recherche.length >= 2 : onglet === item.id && recherche.length < 2;
          return (
            <button key={item.id} onClick={() => { setOnglet(item.id); if (item.id !== 'recherche') setRecherche(''); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', position: 'relative', minWidth: 60 }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 10, color: actif ? '#1a1a2e' : 'var(--color-text-secondary)', fontWeight: actif ? 500 : 400 }}>{item.label}</span>
              {item.badge && (
                <span style={{ position: 'absolute', top: -4, right: 8, background: '#4ade80', color: '#1a1a2e', fontSize: 9, fontWeight: 500, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.badge}
                </span>
              )}
              {actif && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ade80', marginTop: 2 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}