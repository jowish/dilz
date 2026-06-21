import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const sql = await readFile(path.join(process.cwd(), 'supabase-user-follows-setup.sql'), 'utf8');

test('follow migration is user-scoped and supports author notifications', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_follows/);
  assert.match(sql, /CHECK \(follower_id <> followed_user_id\)/);
  assert.match(sql, /USING \(follower_id = auth\.uid\(\)\)/);
  assert.match(sql, /ALTER TABLE notifications ALTER COLUMN alert_id DROP NOT NULL/);
  assert.match(sql, /notification_type IN \('alert', 'follow'\)/);
  assert.match(sql, /UNIQUE INDEX IF NOT EXISTS idx_notifications_follow_deal/);
});
