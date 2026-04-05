-- ============================================================
-- BillMate v2 — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Orders table ────────────────────────────────────────────
-- Supports both anonymous users and named accounts.
-- All money in INTEGER paise (no floats).

CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_number         TEXT NOT NULL,
  items               JSONB NOT NULL DEFAULT '[]',
  subtotal_paise      INTEGER NOT NULL DEFAULT 0,
  discount_paise      INTEGER NOT NULL DEFAULT 0,
  discount_type       TEXT NOT NULL DEFAULT 'flat' CHECK (discount_type IN ('flat','percent')),
  discount_value      NUMERIC NOT NULL DEFAULT 0,
  gst_percent         NUMERIC NOT NULL DEFAULT 0,
  gst_paise           INTEGER NOT NULL DEFAULT 0,
  total_paise         INTEGER NOT NULL DEFAULT 0,
  payment_method      TEXT NOT NULL CHECK (payment_method IN ('cash','upi','card')),
  cash_received_paise INTEGER,
  change_paise        INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can only see/write their own orders
CREATE POLICY "orders_owner_select" ON orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_owner_insert" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_owner_update" ON orders
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders (user_id, created_at DESC);

-- ── Business profiles table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  owner_name      TEXT,
  phone           TEXT,
  city            TEXT,
  business_type   TEXT NOT NULL,
  gst_number      TEXT,
  gst_percent     NUMERIC NOT NULL DEFAULT 0,
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses_owner" ON businesses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── IMPORTANT: Enable Anonymous Sign-ins in Supabase Dashboard ──
-- Go to: Authentication → Sign In / Up → Anonymous Sign-ins → Enable
-- Without this, background sync will silently fail.
