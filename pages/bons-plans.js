import { useState, useEffect } from 'react';
import Link from 'next/link';

const MAGASINS = ['רמי לוי', 'שופרסל', 'ויקטורי', 'אושר עד', 'יוחננוף', 'קרפור', 'אחר'];
const COULEURS = {
  'שופרסל': 'bg-blue-100 text-blue-700',
  'רמי לוי': 'bg-red-100 text-red-700',
  'ויקטורי': 'bg-purple-100 text-purple-700',
  'אושר עד': 'bg-green-100 text-green-700',
  'יוחננוף': 'bg-yellow-100 text-yellow-700',
  'קרפור': 'bg-orange-100 text-orange-700',
  'אחר': 'bg-gray-100 text-gray-700',
};

function CarteBonPlan({ bp, onVote }) {
  const [commentaires, setCommentaires] = useState([]);
  const [voirCommentaires, setVoirCommentaires] = useState(false);
  const [nouveauCommentaire, setNouveauCommentaire] = useState('');
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

  const chargerCommentaires = async () => {
    const res = await fetch(`/api/commentaires?bon_plan_id=${bp.id}`);
    const data = await res.json();
    setCommentaires(data.commentaires || []);
  };

  const toggleCommentaires = async () => {
    if (!voirCommentaires) await chargerCommentaires();
    setVoirCommentaires(!voirCommentaires);
  };

  const envoyerCommentaire = async () => {
    if (!nouveauCommentaire.trim()) return;
    await fetch('/api/commentaires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bon_plan_id: bp.id, contenu: nouveauCommentaire })
    });
    setNouveauCommentaire('');
    await chargerCommentaires();
  };

  const tempsPasse = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'לפני כמה דקות';
    if (h < 24) return `לפני ${h} שעות`;
    return `לפני ${Math.floor(h/24)} ימים`;
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-3">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-400">{tempsPasse(bp.created_at)}</span>
        <div className="text-right">
          <h3 className="font-bold text-gray-800">{bp.titre}</h3>
          {bp.description && <p className="text-sm text-gray-500 mt-1">{bp.description}</p>}
        </div>
      </div>

      {/* Image */}
      {bp.image_url && (
        <img src={bp.image_url} alt={bp.titre} className="w-full h-48 object-cover rounded-lg mb-3" />
      )}

      {/* Prix et magasin */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${COULEURS[bp.magasin] || 'bg-gray-100 text-gray-700'}`}>
            {bp.magasin}
          </span>
          {bp.ville && <span className="text-xs text-gray-400">{bp.ville}</span>}
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-green-700">{bp.prix}&#8362;</span>
          {bp.prix_original && (
            <span className="text-sm text-gray-400 line-through mr-2">{bp.prix_original}&#8362;</span>
          )}
          {reduction && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-1">
              -{reduction}%
            </span>
          )}
        </div>
      </div>

      {/* Votes et commentaires */}
      <div className="flex justify-between items-center pt-2 border-t">
        <button onClick={toggleCommentaires} className="text-xs text-gray-500 flex items-center gap-1">
          💬 {bp.commentaires?.[0]?.count || 0}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => voter('froid')}
            className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full border ${monVote === 'froid' ? 'bg-blue-100 border-blue-300' : 'border-gray-200'}`}
          >
            ❄️ {votes.froid}
          </button>
          <button
            onClick={() => voter('chaud')}
            className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full border ${monVote === 'chaud' ? 'bg-red-100 border-red-300' : 'border-gray-200'}`}
          >
            🔥 {votes.chaud}
          </button>
        </div>
        <span className="text-xs text-gray-400">by {bp.auteur_nom}</span>
      </div>

      {/* Commentaires */}
      {voirCommentaires && (
        <div className="mt-3 pt-3 border-t">
          {commentaires.map(c => (
            <div key={c.id} className="mb-2 text-right">
              <span className="text-xs font-bold text-gray-600">{c.auteur_nom}</span>
              <p className="text-sm text-gray-700">{c.contenu}</p>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <button onClick={envoyerCommentaire} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full">
              שלח
            </button>
            <input
              type="text"
              value={nouveauCommentaire}
              onChange={e => setNouveauCommentaire(e.target.value)}
              placeholder="הוסף תגובה..."
              className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-1 text-right"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FormulaireNouveauBonPlan({ onAjoute }) {
  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState({ titre: '', description: '', prix: '', prix_original: '', magasin: 'רמי לוי', ville: '', auteur_nom: '' });
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async () => {
    if (!form.titre || !form.prix || !form.magasin) return;
    setEnvoi(true);
    await fetch('/api/bons-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, prix: parseFloat(form.prix), prix_original: form.prix_original ? parseFloat(form.prix_original) : null })
    });
    setForm({ titre: '', description: '', prix: '', prix_original: '', magasin: 'רמי לוי', ville: '', auteur_nom: '' });
    setEnvoi(false);
    setOuvert(false);
    onAjoute();
  };

  if (!ouvert) return (
    <button onClick={() => setOuvert(true)}
      className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg mb-4">
      + שתף דיל חדש
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-4">
      <h3 className="font-bold text-right mb-3">דיל חדש</h3>
      <div className="space-y-3">
        <input type="text" placeholder="כותרת הדיל *" value={form.titre}
          onChange={e => setForm({...form, titre: e.target.value})}
          className="w-full border rounded-lg px-3 py-2 text-right text-sm" />
        <textarea placeholder="תיאור (אופציונלי)" value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          className="w-full border rounded-lg px-3 py-2 text-right text-sm h-20" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="מחיר *" value={form.prix}
            onChange={e => setForm({...form, prix: e.target.value})}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" placeholder="מחיר מקורי" value={form.prix_original}
            onChange={e => setForm({...form, prix_original: e.target.value})}
            className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.magasin} onChange={e => setForm({...form, magasin: e.target.value})}
            className="border rounded-lg px-3 py-2 text-sm">
            {MAGASINS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="text" placeholder="עיר" value={form.ville}
            onChange={e => setForm({...form, ville: e.target.value})}
            className="border rounded-lg px-3 py-2 text-sm text-right" />
        </div>
        <input type="text" placeholder="שם (אופציונלי)" value={form.auteur_nom}
          onChange={e => setForm({...form, auteur_nom: e.target.value})}
          className="w-full border rounded-lg px-3 py-2 text-right text-sm" />
        <div className="flex gap-2">
          <button onClick={() => setOuvert(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">ביטול</button>
          <button onClick={envoyer} disabled={envoi}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold">
            {envoi ? 'שולח...' : 'פרסם דיל'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BonsPlans() {
  const [bonsPlans, setBonsPlans] = useState([]);
  const [chargement, setChargement] = useState(true);

  const charger = async () => {
    setChargement(true);
    const res = await fetch('/api/bons-plans');
    const data = await res.json();
    setBonsPlans(data.bons_plans || []);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-blue-700 text-white p-4 shadow sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-blue-200 text-sm">השוואת מחירים</Link>
          <div className="text-right">
            <h1 className="text-2xl font-bold">Dilz</h1>
            <p className="text-blue-200 text-xs">דילים מהקהילה</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <FormulaireNouveauBonPlan onAjoute={charger} />

        {chargement ? (
          <div className="text-center text-gray-400 py-8">טוען דילים...</div>
        ) : (
          bonsPlans.map(bp => <CarteBonPlan key={bp.id} bp={bp} />)
        )}
      </main>
    </div>
  );
}