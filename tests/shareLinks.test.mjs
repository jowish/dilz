import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareLinks, buildShareMessage } from '../lib/shareLinks.js';

test('share message keeps the deal title and canonical URL together', () => {
  assert.equal(buildShareMessage('50% off coffee', 'https://dilz.vercel.app/deal/42'), '50% off coffee\nhttps://dilz.vercel.app/deal/42');
});

test('WhatsApp, Telegram and SMS links safely encode deal content', () => {
  const links = buildShareLinks({ title: 'מבצע 50% & more', url: 'https://dilz.vercel.app/deal/42?from=feed' });
  const whatsapp = new URL(links.whatsapp);
  const telegram = new URL(links.telegram);

  assert.equal(whatsapp.hostname, 'wa.me');
  assert.equal(whatsapp.searchParams.get('text'), 'מבצע 50% & more\nhttps://dilz.vercel.app/deal/42?from=feed');
  assert.equal(telegram.searchParams.get('url'), 'https://dilz.vercel.app/deal/42?from=feed');
  assert.equal(telegram.searchParams.get('text'), 'מבצע 50% & more');
  assert.equal(decodeURIComponent(links.sms.replace('sms:?&body=', '')), 'מבצע 50% & more\nhttps://dilz.vercel.app/deal/42?from=feed');
});
