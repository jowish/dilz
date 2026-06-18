import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

function formatNumber(value) {
  if (value == null) return 'n/a';
  return Number(value).toLocaleString('en-US');
}

function formatDate(value) {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MetricCard({ label, value, detail, tone = 'default' }) {
  return (
    <article className={`admin-metric admin-metric--${tone}`}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      {detail && <p>{detail}</p>}
    </article>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel__header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BarList({ items = [], empty = 'No data yet' }) {
  const max = Math.max(...items.map(item => Number(item.value || 0)), 1);
  if (!items.length) return <p className="admin-empty">{empty}</p>;
  return (
    <div className="admin-bars">
      {items.map(item => (
        <div key={item.label} className="admin-bar">
          <div className="admin-bar__top">
            <span>{item.label}</span>
            <strong>{formatNumber(item.value)}</strong>
          </div>
          <div className="admin-bar__track">
            <span style={{ width: `${Math.max(4, (Number(item.value || 0) / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ columns, rows = [], empty = 'No data yet' }) {
  if (!rows.length) return <p className="admin-empty">{empty}</p>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>{columns.map(col => <th key={col.key}>{col.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.barcode || index}>
              {columns.map(col => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TokenGate({ token, setToken, onSubmit, loading, error }) {
  const [draft, setDraft] = useState(token || '');
  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <span className="admin-kicker">Dilz Admin</span>
        <h1>Dashboard admin</h1>
        <p>Entre ton token admin pour voir les donnees internes, la sante du contenu et les signaux utilisateur.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setToken(draft.trim());
            onSubmit(draft.trim());
          }}
        >
          <input
            type="password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="ADMIN_BOT_TOKEN"
            autoComplete="current-password"
          />
          <button disabled={!draft.trim() || loading}>{loading ? 'Chargement...' : 'Ouvrir le dashboard'}</button>
        </form>
        {error && <p className="admin-error">{error}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadDashboard = async (nextToken = token) => {
    if (!nextToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${nextToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erreur || 'Impossible de charger le dashboard.');
      setData(json);
      try { localStorage.setItem('dilzAdminToken', nextToken); } catch {}
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dilzAdminToken') || '';
      if (saved) {
        setToken(saved);
        loadDashboard(saved);
      }
    } catch {}
  }, []);

  const healthTone = useMemo(() => {
    const count = data?.health?.warnings?.length || 0;
    if (count >= 3) return 'danger';
    if (count >= 1) return 'warn';
    return 'good';
  }, [data]);

  if (!data) {
    return (
      <>
        <Head><title>Dilz Admin Dashboard</title></Head>
        <TokenGate token={token} setToken={setToken} onSubmit={loadDashboard} loading={loading} error={error} />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dilz Admin Dashboard</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main className="admin-dashboard">
        <header className="admin-hero">
          <div>
            <span className="admin-kicker">Dilz Admin</span>
            <h1>Dashboard complet</h1>
            <p>Vue centrale sur les utilisateurs, Dilz, promotions, produits, votes, sauvegardes, alertes et qualite data.</p>
          </div>
          <div className="admin-hero__actions">
            <span>Updated {formatDate(data.generated_at)}</span>
            <button onClick={() => loadDashboard()} disabled={loading}>{loading ? 'Refresh...' : 'Refresh'}</button>
            <button
              className="is-ghost"
              onClick={() => {
                try { localStorage.removeItem('dilzAdminToken'); } catch {}
                setToken('');
                setData(null);
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="admin-metrics">
          <MetricCard label="Users" value={data.overview.users} detail={`${data.users.new7d} new in 7d`} />
          <MetricCard label="Dilz" value={data.overview.deals} detail={`${data.deals.new7d} new in 7d`} />
          <MetricCard label="Pending moderation" value={data.deals.pending} detail="Deals to review" tone={data.deals.pending ? 'warn' : 'good'} />
          <MetricCard label="Products" value={data.overview.products} detail={`${data.products.imageCoveragePct}% with image`} />
          <MetricCard label="Price rows" value={data.overview.priceRows} detail={`${data.supermarkets.priceRowsUpdated24h} updated 24h`} />
          <MetricCard label="Health" value={data.health.warnings.length} detail={data.health.warnings.length ? 'Warnings' : 'All clear'} tone={healthTone} />
        </section>

        <section className="admin-grid admin-grid--two">
          <Panel title="Sante contenu" subtitle="Ce qui bloque la qualite produit et la moderation">
            {data.health.warnings.length ? (
              <ul className="admin-warning-list">
                {data.health.warnings.map(item => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p className="admin-empty">Aucune alerte critique detectee.</p>
            )}
            <div className="admin-mini-grid">
              <MetricCard label="Deals sans image" value={data.deals.withoutImage} detail={`${data.deals.imageCoveragePct}% coverage`} tone={data.deals.withoutImage ? 'warn' : 'good'} />
              <MetricCard label="Produits sans image" value={data.products.withoutImage} detail={`${data.products.pendingImage || 0} pending`} tone={data.products.withoutImage ? 'warn' : 'good'} />
              <MetricCard label="Prix stale sample" value={data.supermarkets.stalePriceRows} detail="Older than 3 days" tone={data.supermarkets.stalePriceRows ? 'warn' : 'good'} />
              <MetricCard label="Unread notifications" value={data.engagement.unreadNotifications} detail="In-app notifications" />
            </div>
          </Panel>

          <Panel title="Engagement" subtitle="Votes, sauvegardes, alertes et notifications">
            <div className="admin-mini-grid">
              <MetricCard label="Deal votes" value={data.engagement.dealVotesTotal} />
              <MetricCard label="Product votes" value={data.engagement.productVotesTotal} />
              <MetricCard label="Saved items" value={data.engagement.savedTotal} />
              <MetricCard label="Active alerts" value={data.engagement.activeAlerts} />
              <MetricCard label="Push subs" value={data.engagement.pushSubscriptions} />
              <MetricCard label="Comments" value={data.engagement.commentsTotal} />
            </div>
            <BarList items={data.engagement.savedByType} empty="Aucune sauvegarde." />
          </Panel>
        </section>

        <section className="admin-grid admin-grid--three">
          <Panel title="Dilz par categorie"><BarList items={data.deals.byCategory} /></Panel>
          <Panel title="Dilz par ville"><BarList items={data.deals.byCity} /></Panel>
          <Panel title="Dilz par magasin"><BarList items={data.deals.byStore} /></Panel>
        </section>

        <section className="admin-grid admin-grid--three">
          <Panel title="Produits par categorie"><BarList items={data.products.byCategory} /></Panel>
          <Panel title="Images produits"><BarList items={data.products.byImageStatus} /></Panel>
          <Panel title="Prix par enseigne"><BarList items={data.supermarkets.rowsByStore} /></Panel>
        </section>

        <section className="admin-grid admin-grid--two">
          <Panel title="Top Dilz" subtitle="Classement par votes chauds">
            <DataTable
              rows={data.deals.top}
              columns={[
                { key: 'titre', label: 'Deal' },
                { key: 'magasin', label: 'Store' },
                { key: 'votes_chaud', label: 'Hot' },
                { key: 'votes_froid', label: 'Cold' },
                { key: 'statut', label: 'Status' },
              ]}
            />
          </Panel>

          <Panel title="Dilz recents" subtitle="Derniers deals postes">
            <DataTable
              rows={data.deals.recent}
              columns={[
                { key: 'titre', label: 'Deal' },
                { key: 'magasin', label: 'Store' },
                { key: 'auteur_nom', label: 'Author', render: row => row.auteur_nom || 'Unknown' },
                { key: 'created_at', label: 'Date', render: row => formatDate(row.created_at) },
                { key: 'statut', label: 'Status' },
              ]}
            />
          </Panel>
        </section>

        <section className="admin-grid admin-grid--two">
          <Panel title="Users recents" subtitle="Derniers comptes crees">
            <DataTable
              rows={data.users.latest}
              columns={[
                { key: 'email', label: 'Email' },
                { key: 'name', label: 'Name', render: row => row.name || '-' },
                { key: 'confirmed', label: 'Confirmed', render: row => row.confirmed ? 'yes' : 'no' },
                { key: 'created_at', label: 'Created', render: row => formatDate(row.created_at) },
              ]}
            />
          </Panel>

          <Panel title="Commentaires recents" subtitle="Feedback et activite communaute">
            <DataTable
              rows={data.engagement.recentComments}
              columns={[
                { key: 'bon_plan_id', label: 'Deal ID' },
                { key: 'auteur_nom', label: 'Author' },
                { key: 'contenu', label: 'Comment', render: row => String(row.contenu || '').slice(0, 80) },
                { key: 'created_at', label: 'Date', render: row => formatDate(row.created_at) },
              ]}
            />
          </Panel>
        </section>
      </main>
    </>
  );
}
