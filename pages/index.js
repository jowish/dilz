import { useState, useEffect } from 'react';

const ENSEIGNES = ['שופרסל', 'רמי לוי'];
const COULEURS = {
  'שופרסל': 'bg-blue-100 text-blue-700 border-blue-300',
  'רמי לוי': 'bg-red-100 text-red-700 border-red-300',
};

function CarteProuit({ produit, dansPanier, onAjouter, onRetirer }) {
  const tousLesPrix = produit.tousLesPrix;
  const meilleurPrix = Math.min(...tousLesPrix.map(p => p.prix));
  const prixIdentiques = tousLesPrix.every(p => p.prix === meilleurPrix);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-start mb-3">
        <button
          onClick={() => dansPanier ? onRetirer(produit.barcode) : onAjouter(produit)}
          className={`text-xs px-3 py-1 rounded-full font-bold flex-shrink-0 ${dansPanier ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}
        >
          {dansPanier ? 'X' : '+'}
        </button>
        <div className="text-right mr-3 flex-1">
          <p className="font-bold text-gray-800 text-sm">{produit.nom}</p>
          {produit.quantite && (
            <p className="text-gray-400 text-xs">{produit.quantite} {produit.unite}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {tousLesPrix.map(p => {
          const estMeilleur = p.prix === meilleurPrix;
          return (
            <div key={p.enseigne} className={`flex justify-between items-center rounded-lg px-3 py-2 border ${estMeilleur && !prixIdentiques ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${COULEURS[p.enseigne]}`}>{p.enseigne}</span>
                {estMeilleur && !prixIdentiques && <span className="text-xs text-green-600 font-bold">הכי זול</span>}
                {prixIdentiques && <span className="text-xs text-gray-400">אותו מחיר</span>}
                {!estMeilleur && !prixIdentiques && <span className="text-xs text-red-400">+{(p.prix - meilleurPrix).toFixed(2)}&#8362;</span>}
              </div>
              <span className={`text-xl font-bold ${estMeilleur && !prixIdentiques ? 'text-green-700' : 'text-gray-600'}`}>{p.prix}&#8362;</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OptimisationPanier({ panier }) {
  // Calcul option 1 : 1 seul magasin
  const totalParMagasin = ENSEIGNES.map(enseigne => {
    let total = 0;
    let manquants = 0;
    panier.forEach(p => {
      const prix = p.tousLesPrix.find(x => x.enseigne === enseigne);
      if (prix) total += prix.prix;
      else manquants++;
    });
    return { enseigne, total, manquants };
  }).filter(x => x.manquants < panier.length)
    .sort((a, b) => a.total - b.total);

  // Calcul option 2 : meilleur prix absolu
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
    <div className="bg-white rounded-xl shadow p-4 mt-4 space-y-4">
      <h2 className="text-lg font-bold text-right">איפה הכי זול לקנות?</h2>

      {/* Option 1 — 1 magasin */}
      <div className="border rounded-xl p-3">
        <p className="font-bold text-right mb-2 text-blue-800">אפשרות 1 — חנות אחת</p>
        <div className="space-y-2">
          {totalParMagasin.map((m, i) => (
            <div key={m.enseigne} className={`flex justify-between items-center rounded-lg px-3 py-2 ${i === 0 ? 'bg-green-50 border border-green-300' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${COULEURS[m.enseigne]}`}>{m.enseigne}</span>
                {i === 0 && <span className="text-xs text-green-600 font-bold">הכי זול</span>}
                {m.manquants > 0 && <span className="text-xs text-orange-500">{m.manquants} מוצרים חסרים</span>}
              </div>
              <span className={`text-xl font-bold ${i === 0 ? 'text-green-700' : 'text-gray-500'}`}>{m.total.toFixed(2)}&#8362;</span>
            </div>
          ))}
        </div>
      </div>

      {/* Option 2 — multi-magasins */}
      <div className="border rounded-xl p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-green-600 font-bold">חיסכון: {economiMulti}&#8362;</span>
          <p className="font-bold text-right text-green-800">אפשרות 2 — הכי חסכוני (כמה חנויות)</p>
        </div>
        <div className="flex justify-between items-center bg-green-50 border border-green-300 rounded-lg px-3 py-2 mb-3">
          <span className="text-xs text-green-600">סה״כ</span>
          <span className="text-xl font-bold text-green-700">{totalMulti.toFixed(2)}&#8362;</span>
        </div>
        {Object.entries(repartitionMulti).map(([enseigne, items]) => (
          <div key={enseigne} className="mb-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${COULEURS[enseigne]}`}>{enseigne}</span>
            <ul className="mt-1 space-y-1">
              {items.map((item, i) => (
                <li key={i} className="flex justify-between text-xs text-gray-600 px-2">
                  <span className="font-bold">{item.prix}&#8362;</span>
                  <span className="text-right">{item.nom}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [recherche, setRecherche] = useState('');
  const [produits, setProduits] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [panier, setPanier] = useState([]);
  const [erreur, setErreur] = useState('');
  const [voirPanier, setVoirPanier] = useState(false);

  useEffect(() => {
    if (recherche.length < 2) { setProduits([]); return; }
    const timer = setTimeout(async () => {
      setChargement(true);
      setErreur('');
      try {
        const res = await fetch('/api/prix?q=' + encodeURIComponent(recherche));
        const data = await res.json();
        if (data.erreur) throw new Error(data.erreur);
        const filtres = (data.produits || []).filter(p => p.nom && p.nom.includes(recherche));
        setProduits(filtres);
      } catch (e) {
        setErreur('שגיאה בטעינת המחירים');
      }
      setChargement(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [recherche]);

  const ajouterAuPanier = (p) => {
    if (!panier.find(x => x.barcode === p.barcode)) setPanier([...panier, p]);
  };
  const retirerDuPanier = (barcode) => setPanier(panier.filter(p => p.barcode !== barcode));
  const totalMeilleur = panier.reduce((s, p) => s + Math.min(...p.tousLesPrix.map(x => x.prix)), 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-blue-700 text-white p-4 shadow sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            {panier.length > 0 && (
              <button
                onClick={() => setVoirPanier(!voirPanier)}
                className="bg-white text-blue-700 text-xs font-bold px-3 py-1 rounded-full"
              >
                {voirPanier ? 'חזור לחיפוש' : `סל ${panier.length} | ${totalMeilleur.toFixed(2)}&#8362;`}
              </button>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold">Dilz</h1>
            <p className="text-blue-200 text-xs">השוואת מחירים בסופרמרקטים</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">

        {/* Vue Panier */}
        {voirPanier && panier.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-right mb-3">רשימת הקניות ({panier.length})</h2>
            <ul className="space-y-2 mb-4 bg-white rounded-xl shadow p-4">
              {panier.map((p, i) => {
                const meilPrix = Math.min(...p.tousLesPrix.map(x => x.prix));
                const meilEnseigne = p.tousLesPrix.find(x => x.prix === meilPrix);
                return (
                  <li key={i} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => retirerDuPanier(p.barcode)} className="text-red-400 font-bold">X</button>
                      <span className="font-bold text-green-700">{meilPrix}&#8362;</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${COULEURS[meilEnseigne?.enseigne]}`}>{meilEnseigne?.enseigne}</span>
                    </div>
                    <span className="text-gray-700 text-right text-xs">{p.nom}</span>
                  </li>
                );
              })}
            </ul>
            <OptimisationPanier panier={panier} />
          </div>
        )}

        {/* Vue Recherche */}
        {!voirPanier && (
          <>
            <div className="my-4">
              <input
                type="text"
                placeholder="חפש מוצר... נוטלה, קוקה קולה"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-right"
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
              />
            </div>

            {chargement && <div className="text-center text-gray-400 py-4">טוען מחירים...</div>}
            {erreur && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-right mb-3">{erreur}</div>}

            {produits.length > 0 && !chargement && (
              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-500 text-right">{produits.length} מוצרים</p>
                {produits.map(p => (
                  <CarteProuit
                    key={p.barcode}
                    produit={p}
                    dansPanier={!!panier.find(x => x.barcode === p.barcode)}
                    onAjouter={ajouterAuPanier}
                    onRetirer={retirerDuPanier}
                  />
                ))}
              </div>
            )}

            {recherche.length >= 2 && !chargement && produits.length === 0 && !erreur && (
              <div className="text-center text-gray-400 py-8">לא נמצאו מוצרים</div>
            )}

            {recherche.length < 2 && (
              <div className="text-center text-gray-400 py-8">
                <p className="text-lg font-medium text-gray-600">חפש מוצר כדי להשוות מחירים</p>
                <p className="text-sm mt-1">שופרסל ורמי לוי בזמן אמת</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}