-- ============================================================
-- Dilz — alerts + notifications + push subscriptions
-- Run in your Supabase project's SQL Editor.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL,
  city                TEXT,
  category            TEXT,
  online_only         BOOLEAN NOT NULL DEFAULT false,
  min_discount_percent NUMERIC(5,2),
  keyword             TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_alerts_user  ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active) WHERE is_active = true;
DROP INDEX IF EXISTS idx_alerts_unique_criteria;
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique_criteria
  ON alerts (
    user_id,
    COALESCE(city, ''),
    COALESCE(category, ''),
    online_only,
    COALESCE(min_discount_percent, -1),
    COALESCE(keyword, '')
  );

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'Users manage own alerts'
  ) THEN
    CREATE POLICY "Users manage own alerts"
    ON alerts FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Service role can read all active alerts (for matching after deal creation)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'Service role reads all alerts'
  ) THEN
    CREATE POLICY "Service role reads all alerts"
    ON alerts FOR SELECT TO service_role USING (true);
  END IF;
END $$;


-- 2. notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id   UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  deal_id    BIGINT NOT NULL,
  user_id    UUID NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alert_id, deal_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_user   ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_deal   ON notifications(deal_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users read own notifications'
  ) THEN
    CREATE POLICY "Users read own notifications"
    ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users update own notifications'
  ) THEN
    CREATE POLICY "Users update own notifications"
    ON notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Service role can insert notifications (triggered server-side after deal creation)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Service role manages notifications'
  ) THEN
    CREATE POLICY "Service role manages notifications"
    ON notifications FOR ALL TO service_role USING (true);
  END IF;
END $$;


-- 3. push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Users manage own subscriptions'
  ) THEN
    CREATE POLICY "Users manage own subscriptions"
    ON push_subscriptions FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Service role reads push subscriptions'
  ) THEN
    CREATE POLICY "Service role reads push subscriptions"
    ON push_subscriptions FOR SELECT TO service_role USING (true);
  END IF;
END $$;
