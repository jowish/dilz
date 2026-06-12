import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

function StoreTag({ enseigne }) {
  const styles = {
    'שופרסל': { background: '#e6f1fb', color: '#0c447c' },
    'רמי לוי': { background: '#fcebeb', color: '#a32d2d' },
    'ויקטורי': { background: '#eeedfe', color: '#3c3489' },
  };
  const s = styles[enseigne] || { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6, background: s.background, color: s.color }}>
      {enseigne}
    </span>
  );
}

function CartePromo({ promo }) {
  const config = {
    'שופרסל': { bg: '#e6f1fb', iconBg: '#185fa5' },
    'רמי לוי': { bg: '#faeeda', iconBg: '#ba7517' },
    'ויקטורי': { bg: '#eeedfe', iconBg: '#534ab7' },
  };
  const c = config[promo.meilleurEnseigne] || { bg: '#e1f5ee', iconBg: '#0f6e56' };
  const initiales = promo.nom.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div style={{ height: 80, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{initiales}</span>
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right', marginBottom: 8, lineHeight: 1.4 }}>{promo.nom}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#e1f5ee', color: '#0f6e56' }}>-{promo.reduction}%</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{promo.prixMin}₪</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'line-through' }}>{promo.prixMax}₪</span>
          <StoreTag enseigne={promo.meilleurEnseigne} />
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
    <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, marginBottom: 10, boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <button onClick={() => dansPanier ? onRetirer(produit.barcode) : onAjouter(produit)}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, background: dansPanier ? '#fcebeb' : '#e6f1fb', color: dansPanier ? '#a32d2d' : '#0c447c' }}>
          {dansPanier ? 'הסר' : 'הוסף +'}
        </button>
        <div style={{ textAlign: 'right', flex: 1, marginRight: 12 }}>
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>{produit.nom}</p>
          {produit.quantite && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{produit.quantite} {produit.unite}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tousLesPrix.map(p => {
          const estMeilleur = p.prix === meilleurPrix;
          return (
            <div key={p.enseigne} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: estMeilleur && !prixIdentiques ? '#f0fdf4' : 'var(--bg-secondary)', border: estMeilleur && !prixIdentiques ? '1px solid #bbf7d0' : '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StoreTag enseigne={p.enseigne} />
                {estMeilleur && !prixIdentiques && <span style={{ fontSize: 11, color: '#0f6e56', fontWeight: 600 }}>הכי זול</span>}
                {!estMeilleur && !prixIdentiques && <span style={{ fontSize: 11, color: '#a32d2d' }}>+{(p.prix - meilleurPrix).toFixed(2)}₪</span>}
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: estMeilleur && !prixIdentiques ? '#0f6e56' : 'var(--text-secondary)' }}>{p.prix}₪</span>
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
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow)' }}>
        <p style={{ fontWeight: 600, textAlign: 'right', marginBottom: 12, fontSize: 15, color: 'var(--text-primary)' }}>אפשרות 1 — חנות אחת</p>
        {totalParMagasin.map((m, i) => (
          <div key={m.enseigne} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 12, marginBottom: 8, background: i === 0 ? '#f0fdf4' : 'var(--bg-secondary)', border: i === 0 ? '1px solid #bbf7d0' : '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StoreTag enseigne={m.enseigne} />
              {i === 0 && <span style={{ fontSize: 11, color: '#0f6e56', fontWeight: 600 }}>הכי זול</span>}
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: i === 0 ? '#0f6e56' : 'var(--text-secondary)' }}>{m.total.toFixed(2)}₪</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#0f6e56', fontWeight: 600, background: '#e1f5ee', padding: '4px 10px', borderRadius: 20 }}>חיסכון: {economiMulti}₪</span>
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>אפשרות 2 — הכי חסכוני</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#0f6e56' }}>סה״כ</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#0f6e56' }}>{totalMulti.toFixed(2)}₪</span>
        </div>
        {Object.entries(repartitionMulti).map(([enseigne, items]) => (
          <div key={enseigne} style={{ marginBottom: 12 }}>
            <StoreTag enseigne={enseigne} />
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600 }}>{item.prix}₪</span>
                <span>{item.nom}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const isDark = resolvedTheme === 'dark';
  return (
    <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}
      aria-label="toggle theme">
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  );
}

export default function Home() {
  const [onglet, setOnglet] = useState('promos');
  const [promos, setPromos] = useState([]);
  const [deals, setDeals] = useState([]);
  const [chargementPromos, setChargementPromos] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [produits, setProduits] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [panier, setPanier] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/promos').then(r => r.json()).then(d => { setPromos(d.promos || []); setChargementPromos(false); }).catch(() => setChargementPromos(false));
    fetch('/api/bons-plans').then(r => r.json()).then(d => { setDeals((d.bons_plans || []).slice(0, 5)); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (recherche.length < 2) { setProduits([]); return; }
    const timer = setTimeout(async () => {
      setChargement(true);
      try {
        const res = await fetch('/api/prix?q=' + encodeURIComponent(recherche));
        const data = await res.json();
        setProduits((data.produits || []).filter(p => p.nom && p.nom.includes(recherche)));
      } catch(e) {}
      setChargement(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [recherche]);

  const ajouterAuPanier = (p) => { if (!panier.find(x => x.barcode === p.barcode)) setPanier([...panier, p]); };
  const retirerDuPanier = (barcode) => setPanier(panier.filter(p => p.barcode !== barcode));
  const totalMeilleur = panier.reduce((s, p) => s + Math.min(...p.tousLesPrix.map(x => x.prix)), 0);

  if (!mounted) return null;

  const ongletActif = recherche.length >= 2 ? 'recherche' : onglet;

  const navItems = [
    { id: 'deals', label: 'דילים', icon: (actif) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={actif ? 'var(--accent)' : 'var(--text-tertiary)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { id: 'promos', label: 'מבצעים', icon: (actif) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={actif ? 'var(--accent)' : 'var(--text-tertiary)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { id: 'recherche', label: 'חיפוש', icon: (actif) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={actif ? 'var(--accent)' : 'var(--text-tertiary)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
    { id: 'panier', label: 'סל', badge: panier.length || null, icon: (actif) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={actif ? 'var(--accent)' : 'var(--text-tertiary)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: 88 }} dir="rtl">

      {/* Header */}
      <div style={{ background: 'var(--header-bg)', borderBottom: '0.5px solid var(--border)', padding: '12px 20px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ThemeToggle />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-secondary)', padding: '5px 12px', borderRadius: 20, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, border: '0.5px solid var(--border)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0 }}></div>
                כל הארץ
              </div>
            </div>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
              dil<span style={{ color: 'var(--accent)' }}>z</span>
            </span>
          </div>
          <div style={{ background: 'var(--bg-input)', borderRadius: 12, display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="חפש מוצר..."
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 15, flex: 1, outline: 'none', textAlign: 'right' }}
              value={recherche} onChange={e => { setRecherche(e.target.value); if (e.target.value.length >= 2) setOnglet('recherche'); }} />
            {recherche && <button onClick={() => { setRecherche(''); setOnglet('promos'); }} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px 0' }}>

        {/* Promos */}
        {ongletActif === 'promos' && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5, textAlign: 'right', marginBottom: 12, textTransform: 'uppercase' }}>
              הכי זול בכל הארץ היום
            </p>
            {chargementPromos ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>טוען מבצעים...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {promos.map(p => <CartePromo key={p.barcode} promo={p} />)}
              </div>
            )}
            {deals.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5, textAlign: 'right', marginBottom: 10, textTransform: 'uppercase' }}>דילים חמים מהקהילה</p>
                <div style={{ background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)', marginBottom: 12 }}>
                  {deals.map((bp, i) => {
                    const reduction = bp.prix_original ? Math.round((bp.prix_original - bp.prix) / bp.prix_original * 100) : null;
                    return (
                      <div key={bp.id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < deals.length - 1 ? '0.5px solid var(--border-light)' : 'none' }}>
                        <div style={{ textAlign: 'left', minWidth: 64 }}>
                          <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--accent-green)' }}>{bp.prix}₪</span>
                          {reduction && <div style={{ fontSize: 11, fontWeight: 600, color: '#0f6e56', background: '#e1f5ee', padding: '1px 6px', borderRadius: 10, marginTop: 2, display: 'inline-block' }}>-{reduction}%</div>}
                        </div>
                        <div style={{ flex: 1, textAlign: 'right', marginRight: 12 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{bp.titre}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <StoreTag enseigne={bp.magasin} />
                            {bp.ville && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{bp.ville}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Link href="/bons-plans" style={{ display: 'block', textAlign: 'center', fontSize: 14, color: 'var(--accent)', padding: '8px 0 16px', textDecoration: 'none', fontWeight: 500 }}>
                  כל הדילים של הקהילה ←
                </Link>
              </>
            )}
          </div>
        )}

        {/* Deals */}
        {ongletActif === 'deals' && (
          <div>
            <Link href="/bons-plans"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent)', color: '#fff', padding: 14, borderRadius: 14, textDecoration: 'none', fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
              + שתף דיל חדש
            </Link>
            {deals.map((bp) => {
              const reduction = bp.prix_original ? Math.round((bp.prix_original - bp.prix) / bp.prix_original * 100) : null;
              return (
                <div key={bp.id} style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ textAlign: 'left', minWidth: 64 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)' }}>{bp.prix}₪</span>
                      {bp.prix_original && <div style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'line-through' }}>{bp.prix_original}₪</div>}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right', marginRight: 12 }}>
                      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>{bp.titre}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <StoreTag enseigne={bp.magasin} />
                        {bp.ville && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{bp.ville}</span>}
                      </div>
                    </div>
                  </div>
                  {bp.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right', marginBottom: 10 }}>{bp.description}</p>}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}>❄️ {bp.votes_froid}</span>
                    <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: '#faeeda', color: '#854f0b' }}>🔥 {bp.votes_chaud}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recherche */}
        {ongletActif === 'recherche' && (
          <div>
            {chargement && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>טוען...</p>}
            {produits.length > 0 && !chargement && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5, textAlign: 'right', marginBottom: 12, textTransform: 'uppercase' }}>{produits.length} תוצאות</p>
                {produits.map(p => (
                  <CarteRecherche key={p.barcode} produit={p}
                    dansPanier={!!panier.find(x => x.barcode === p.barcode)}
                    onAjouter={ajouterAuPanier} onRetirer={retirerDuPanier} />
                ))}
              </div>
            )}
            {!chargement && produits.length === 0 && recherche.length >= 2 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>לא נמצאו מוצרים</p>
            )}
          </div>
        )}

        {/* Panier */}
        {ongletActif === 'panier' && (
          <div>
            {panier.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" style={{ marginBottom: 12 }} strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 4 }}>הסל שלך ריק</p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>חפש מוצרים והוסף לסל</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, textAlign: 'right', marginBottom: 12, color: 'var(--text-primary)' }}>רשימת הקניות ({panier.length})</p>
                <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '4px 16px', boxShadow: 'var(--shadow)', marginBottom: 16 }}>
                  {panier.map((p, i) => {
                    const meilPrix = Math.min(...p.tousLesPrix.map(x => x.prix));
                    const meilEnseigne = p.tousLesPrix.find(x => x.prix === meilPrix);
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < panier.length - 1 ? '0.5px solid var(--border-light)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button onClick={() => retirerDuPanier(p.barcode)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
                          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-green)' }}>{meilPrix}₪</span>
                          <StoreTag enseigne={meilEnseigne?.enseigne} />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right', maxWidth: 160 }}>{p.nom}</span>
                      </div>
                    );
                  })}
                </div>
                <OptimisationPanier panier={panier} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--nav-bg)', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 24px', zIndex: 20, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        {navItems.map(item => {
          const actif = ongletActif === item.id;
          return (
            <button key={item.id}
              onClick={() => { if (item.id !== 'recherche') setRecherche(''); setOnglet(item.id); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', position: 'relative', minWidth: 64, padding: '4px 0' }}>
              {item.icon(actif)}
              <span style={{ fontSize: 10, fontWeight: actif ? 600 : 400, color: actif ? 'var(--accent)' : 'var(--text-tertiary)' }}>{item.label}</span>
              {actif && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', position: 'absolute', bottom: -2 }} />}
              {item.badge && (
                <span style={{ position: 'absolute', top: 0, right: 8, background: 'var(--accent-red)', color: '#fff', fontSize: 10, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}