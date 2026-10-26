-- Mowy CS AI - skema database PostgreSQL
-- Jalankan sekali: npm run init-db

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Satu lead = satu calon klien interior = satu percakapan.
CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT,
  phone       TEXT,
  source      TEXT DEFAULT 'web_chat',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Riwayat pesan per lead.
CREATE TABLE IF NOT EXISTS messages (
  id          BIGSERIAL PRIMARY KEY,
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('customer', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id, id);

-- Hasil scoring 13 KPI per lead.
-- criteria = JSON: { "<key>": { "met": bool, "value": "<ringkasan/output>" }, ... }
CREATE TABLE IF NOT EXISTS lead_scores (
  lead_id      UUID PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  criteria     JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score  NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
