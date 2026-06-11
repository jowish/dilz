import { useState } from 'react';

const PRODUITS = [
  {
    id: 1,
    nom: 'נוטלה 400 גרם',
    categorie: 'ארוחת בוקר',
    prix: { 'רמי לוי': 18.90, 'שופרסל': 21.50, 'אושר עד': 19.90, 'ויקטורי': 20.50 }
  },
  {
    id: 2,
    nom: 'קוקה קולה 1.5 ליטר',
    categorie: 'משקאות',
    prix: { 'רמי לוי': 6.90, 'שופרסל': 7.50, 'אושר עד': 6.50, 'ויקטורי': 7.20 }
  },
  {
    id: 3,
    nom: 'לחם אחיד',
    categorie: 'מאפים',
    prix: { 'רמי לוי': 6.50, 'שופרסל': 7.20, 'אושר עד': 6.80, 'ויקטורי': 6.90 }
  },
  {
    id: 4,
    nom: 'חלב תנובה 3% 1 ליטר',
    categorie: 'מוצרי חלב',
    prix: { 'רמי לוי': 5.90, 'שופרסל': 6.20, 'אושר עד': 5.80, 'ויקטורי': 6.00 }
  },
  {
    id: 5,
    nom: 'ביצים 12 יחידות',
    categorie: 'מוצרי חלב',
    prix: { 'רמי לוי': 14.90, 'שופרסל': 16.50, 'אושר עד': 15.20, 'ויקטורי': 15.90 }
  },
  {
    id: 6,
    nom: 'שמפו פנטן',
    categorie: 'היגיינה',
    prix: { 'רמי לוי': 12.90, 'שופרסל': 14.90, 'אושר עד': 13.50, 'ויקטורי': 14.20 }
  },
];

const MAGASINS = ['רמי לוי', 'שופרסל', 'אושר עד', 'ויקטורי'];
const COULEURS = {
  'רמי לוי': 'bg-red-100 text-red-800',
  'שופרסל': 'bg-blue-100 text-blue-800',
  'אושר עד': 'bg-green-100 text-green-800',
  'ויקטורי': 'bg-purple-100 text-purple-800',
};

export default function Home() {
  const [recherche, setRecherche] = useState('');
  const [panier, setPanier] = useState([]);
  const [afficherOptimisation, setAfficherOptimisation] = useState(false);

  const produitsFiltres = PRODUITS.filter(p =>
    p.nom.includes(recherche)
  );

  const ajouterAuPanier = (produit) => {
    if (!panier.find(p => p.id === produit.id)) {
      setPanier([...panier, produit]);
    }
  };

  const retirerDuPanier = (id) => {
    setPanier(panier.filter(p => p.id !== id));
  };

  const meilleurMagasin = () => {
    if (panier.length === 0) return null;
    return MAGASINS.map(magasin => {
      const total = panier.reduce((sum, p) => sum + (p.prix[magasin] || 0), 0);
      return { magasin, total };
    }).sort((a, b) => a.total - b.total)[0];
  };

  const optimisationMulti = () => {
    if (panier.length === 0) return null;
    const parMagasin = {};
    panier.forEach(produit => {
      const moinsCher = MAGASINS.reduce((best, mag) =>
        produit.prix[mag] < produit.prix[best] ? mag : best
      , MAGASINS[0]);
      if (!parMagasin[moinsCher]) parMagasin[moinsCher] = [];
      parMagasin[moinsCher].push({ ...produit, prixIci: produit.prix[moinsCher] });
    });
    return parMagasin;
  };

  const best = meilleurMagasin();
  const multi = optimisationMulti();
  const totalMulti = multi ? Object.values(multi).flat().reduce((s, p) => s + p.prixIci, 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* Header */}
      <header className="bg-blue-700 text-white p-4 shadow">
        <div className="max-w-3xl mx-auto text-right">
          <h1 className="text-3xl font-bold tracking-tight">💰 Dilz</h1>
          <p className="text-blue-200 text-sm mt-1">השוו מחירים בסופרמרקטים בישראל וחסכו כסף</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">

        {/* Barre de recherche */}
        <div className="my-4">
          <input
            type="text"
            placeholder="🔍 חפש מוצר..."
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-right"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
          />
        </div>

        {/* Liste des produits */}
        <div className="space-y-3 mb-8">
          {produitsFiltres.map(produit => {
            const prixTries = MAGASINS.map(m => ({ m, p: produit.prix[m] })).sort((a, b) => a.p - b.p);
            const moinsCher = prixTries[0];
            const dansPanier = panier.find(p => p.id === produit.id);

            return (
              <div key={produit.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <button
                    onClick={() => dansPanier ? retirerDuPanier(produit.id) : ajouterAuPanier(produit)}
                    className={`text-sm px-3 py-1 rounded-full font-medium ${dansPanier ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}
                  >
                    {dansPanier ? '✓ ברשימה' : '+ הוסף'}
                  </button>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 text-lg">{produit.nom}</p>
                    <p className="text-gray-400 text-xs">{produit.categorie}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  {prixTries.map(({ m, p }) => (
                    <div key={m} className={`rounded-lg p-2 text-center text-xs ${m === moinsCher.m ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-50'}`}>
                      <p className="font-semibold truncate">{m}</p>
                      <p className={`text-lg font-bold ${m === moinsCher.m ? 'text-green-700' : 'text-gray-700'}`}>{p}₪</p>
                      {m === moinsCher.m && <p className="text-green-600 text-xs">✓ הכי זול</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Panier */}
        {panier.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 mb-8">
            <h2 className="text-lg font-bold mb-3 text-right">🧺 רשימת הקניות שלי ({panier.length} מוצרים)</h2>
            <ul className="mb-4 space-y-1">
              {panier.map(p => (
                <li key={p.id} className="flex justify-between text-sm text-gray-700">
                  <button onClick={() => retirerDuPanier(p.id)} className="text-red-400 hover:text-red-600">✕</button>
                  <span>{p.nom}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setAfficherOptimisation(!afficherOptimisation)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700"
            >
              {afficherOptimisation ? 'הסתר' : '🏆 איפה הכי זול לקנות?'}
            </button>

            {afficherOptimisation && best && (
              <div className="mt-4 space-y-4">
                {/* Option 1 magasin */}
                <div className="bg-blue-50 rounded-lg p-3 text-right">
                  <p className="font-bold text-blue-800">אפשרות 1 — חנות אחת</p>
                  <p className="text-sm text-gray-600 mt-1">
                    לכו ל<strong>{best.magasin}</strong> ← סה״כ <strong>{best.total.toFixed(2)}₪</strong>
                  </p>
                </div>

                {/* Option multi */}
                <div className="bg-green-50 rounded-lg p-3 text-right">
                  <p className="font-bold text-green-800">אפשרות 2 — הכי חסכוני</p>
                  <p className="text-xs text-gray-500 mb-2">סה״כ: <strong>{totalMulti.toFixed(2)}₪</strong> — חיסכון: <strong>{(best.total - totalMulti).toFixed(2)}₪</strong></p>
                  {Object.entries(multi).map(([mag, prods]) => (
                    <div key={mag} className="mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${COULEURS[mag]}`}>{mag}</span>
                      <ul className="mt-1 mr-2">
                        {prods.map(p => (
                          <li key={p.id} className="text-xs text-gray-700 flex justify-between">
                            <span>{p.prixIci}₪</span>
                            <span>{p.nom}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}