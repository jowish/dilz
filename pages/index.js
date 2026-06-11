import { useState, useEffect } from 'react';

export default function Home() {
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [panier, setPanier] = useState([]);
  const [erreur, setErreur] = useState('');
  const [derniereMaj, setDerniereMaj] = useState('');

  useEffect(() => {
    if (recherche.length < 2) {
      setResultats([]);
      return;
    }
    const timer = setTimeout(async () => {
      setChargement(true);
      setErreur('');
      try {
        const res = await fetch('/api/prix?q=' + encodeURIComponent(recherche));
        const data = await res.json();
        if (data.erreur) throw new Error(data.erreur);
        setResultats(data.produits || []);
        setDerniereMaj(data.derniereMaj);
      } catch (e) {
        setErreur('שגיאה בטעינת המחירים');
        setResultats([]);
      }
      setChargement(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [recherche]);

  const ajouterAuPanier = (produit) => {
    if (!panier.find(p => p.code === produit.code)) {
      setPanier([...panier, produit]);
    }
  };

  const retirerDuPanier = (code) => {
    setPanier(panier.filter(p => p.code !== code));
  };

  const totalPanier = panier.reduce((sum, p) => sum + p.prix, 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      <header className="bg-blue-700 text-white p-4 shadow sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            {panier.length > 0 && (
              <span className="bg-white text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                {panier.length} | {totalPanier.toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold">Dilz</h1>
            <p className="text-blue-200 text-xs">השוואת מחירים בסופרמרקטים</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">

        <div className="my-4">
          <input
            type="text"
            placeholder="חפש מוצר... נוטלה, קוקה קולה"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-right"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
          />
        </div>

        {derniereMaj && (
          <p className="text-xs text-gray-400 text-right mb-3">
            מחירי שופרסל בזמן אמת
          </p>
        )}

        {chargement && (
          <div className="text-center text-gray-400 py-4">טוען מחירים...</div>
        )}

        {erreur && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-right mb-3">
            {erreur}
          </div>
        )}

        {resultats.length > 0 && (
          <div className="space-y-2 mb-6">
            <p className="text-sm text-gray-500 text-right">{resultats.length} תוצאות משופרסל</p>
            {resultats.map(produit => {
              const dansPanier = panier.find(p => p.code === produit.code);
              return (
                <div key={produit.code} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
                  <button
                    onClick={() => dansPanier ? retirerDuPanier(produit.code) : ajouterAuPanier(produit)}
                    className={`text-sm px-3 py-1 rounded-full font-medium ${dansPanier ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}
                  >
                    {dansPanier ? 'X' : '+'}
                  </button>
                  <div className="text-right mx-3 flex-1">
                    <p className="font-bold text-gray-800">{produit.nom}</p>
                    <p className="text-gray-400 text-xs">{produit.quantite} {produit.unite}</p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-2xl font-bold text-blue-700">{produit.prix}</p>
                    <p className="text-xs text-gray-400">שופרסל</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {recherche.length >= 2 && !chargement && resultats.length === 0 && !erreur && (
          <div className="text-center text-gray-400 py-8">
            <p>לא נמצאו מוצרים</p>
          </div>
        )}

        {recherche.length < 2 && (
          <div className="text-center text-gray-400 py-8">
            <p className="text-lg font-medium text-gray-600">חפש מוצר כדי להשוות מחירים</p>
            <p className="text-sm mt-1">המחירים מתעדכנים בזמן אמת משופרסל</p>
          </div>
        )}

        {panier.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 mt-4">
            <h2 className="text-lg font-bold mb-3 text-right">רשימת הקניות ({panier.length})</h2>
            <ul className="space-y-2 mb-4">
              {panier.map(p => (
                <li key={p.code} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <button onClick={() => retirerDuPanier(p.code)} className="text-red-400">X</button>
                    <span className="font-bold text-blue-700">{p.prix}</span>
                  </div>
                  <span className="text-gray-700">{p.nom}</span>
                </li>
              ))}
            </ul>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-xl font-bold text-green-700">{totalPanier.toFixed(2)}</span>
              <span className="font-bold text-gray-700">סה״כ</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}