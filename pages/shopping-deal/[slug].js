import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { services } from '../bons-plans-shopping';
import { VoteEmoji } from '../../components/ui/VoteEmoji';
import { supabase } from '../../lib/supabase';
import { useAppLanguage } from '../../lib/useAppLanguage';

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function ShoppingDealDetail() {
  const router = useRouter();
  const { lang, dir } = useAppLanguage();
  const service = useMemo(() => services.find((item) => slugify(item.name) === router.query.slug), [router.query.slug]);
  const [engagement, setEngagement] = useState({ hot: 0, cold: 0, comments: [] });
  const [comment, setComment] = useState('');
  const load = () => fetch(`/api/shopping-deals/${router.query.slug}`).then((response) => response.json()).then(setEngagement).catch(() => {});
  useEffect(() => { if (router.isReady) load(); }, [router.isReady, router.query.slug]);
  const act = async (body) => { const { data } = await supabase.auth.getSession(); if (!data.session) return router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`); await fetch(`/api/shopping-deals/${router.query.slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(body) }); setComment(''); load(); };
  if (!service) return null;
  return <div className="dilz-shopping-detail" dir={dir}><Head><title>{service.name} | Dilz</title></Head><header className="dilz-alerts-route__header"><Link href="/bons-plans-shopping">Back</Link></header><main><section className="dilz-shopping-detail__hero"><span style={{ background: service.accent }}>{service.mark}</span><div><h1>{service.name}</h1><p>{service.title[lang]}</p></div></section><p className="dilz-shopping-detail__description">{service.detail[lang]}</p><div className="dilz-shopping-detail__votes"><button onClick={() => act({ action: 'vote', type: 'chaud' })}><VoteEmoji type="chaud"/> {engagement.hot}</button><button onClick={() => act({ action: 'vote', type: 'froid' })}><VoteEmoji type="froid"/> {engagement.cold}</button></div><a className="dilz-button dilz-button--primary" href={service.url} target="_blank" rel="noreferrer">Visit {service.name}</a><section className="dilz-shopping-comments"><h2>Comments ({engagement.comments.length})</h2><form onSubmit={(event) => { event.preventDefault(); act({ action: 'comment', content: comment }); }}><input className="dilz-input" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..."/><button className="dilz-button" type="submit">Send</button></form>{engagement.comments.map((item) => <article key={item.id}><strong>{item.author_name}</strong><p>{item.content}</p></article>)}</section></main></div>;
}
