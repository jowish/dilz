import test from 'node:test';
import assert from 'node:assert/strict';
import { isAppMessageLive, localizeAppMessage, messageTargetsPlatform, normalizeAppMessageInput } from '../lib/appMessages.js';

const valid = {
  type: 'yellow_note',
  target: 'ios',
  body_en: 'Download Dilz for iPhone.',
  body_he: 'הורידו את Dilz ל-iPhone.',
  is_active: true,
};

test('normalizes a bilingual admin message', () => {
  const message = normalizeAppMessageInput({ ...valid, priority: 250, cta_url: '/download' });
  assert.equal(message.type, 'yellow_note');
  assert.equal(message.target, 'ios');
  assert.equal(message.priority, 100);
  assert.equal(message.cta_url, '/download');
});

test('requires English and Hebrew bodies', () => {
  assert.throws(() => normalizeAppMessageInput({ ...valid, body_he: '' }), /required/i);
});

test('rejects unsafe CTA URLs and invalid schedules', () => {
  assert.throws(() => normalizeAppMessageInput({ ...valid, cta_url: 'javascript:alert(1)' }), /CTA URL/);
  assert.throws(() => normalizeAppMessageInput({ ...valid, starts_at: '2026-07-02', ends_at: '2026-07-01' }), /after start/);
});

test('detects whether a message is live at a given time', () => {
  const now = new Date('2026-07-01T12:00:00.000Z');
  assert.equal(isAppMessageLive({ ...valid, starts_at: '2026-07-01T10:00:00.000Z', ends_at: '2026-07-01T14:00:00.000Z' }, now), true);
  assert.equal(isAppMessageLive({ ...valid, starts_at: '2026-07-01T13:00:00.000Z' }, now), false);
  assert.equal(isAppMessageLive({ ...valid, is_active: false }, now), false);
});

test('localizes messages without mixing languages', () => {
  const message = { ...valid, title_en: 'Install the app', title_he: 'התקינו את האפליקציה', cta_label_en: 'Download', cta_label_he: 'הורדה' };
  assert.equal(localizeAppMessage(message, 'en').body, valid.body_en);
  assert.equal(localizeAppMessage(message, 'he').body, valid.body_he);
  assert.equal(localizeAppMessage(message, 'he').ctaLabel, 'הורדה');
});

test('filters messages by web and iOS target', () => {
  assert.equal(messageTargetsPlatform({ target: 'all' }, 'web'), true);
  assert.equal(messageTargetsPlatform({ target: 'ios' }, 'ios'), true);
  assert.equal(messageTargetsPlatform({ target: 'ios' }, 'web'), false);
});
