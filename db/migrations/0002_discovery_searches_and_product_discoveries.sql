-- 0002_discovery_searches_and_product_discoveries.sql
-- Stage 02C.2 — saved searches + discovery origin.
-- Incremental and non-destructive: 0001 is never modified.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS discovery_searches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  type         text        NOT NULL CHECK (type IN ('keyword', 'product_name', 'niche')),
  query        text,
  niche_key    text,
  terms        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  last_run_at  timestamptz,
  run_count    integer     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS discovery_searches_active_created_at_idx
  ON discovery_searches (active, created_at DESC);

-- Origin of a discovery. Different from product_snapshots:
--   product_snapshots  = metric observation over time
--   product_discoveries = how/where the product was found
CREATE TABLE IF NOT EXISTS product_discoveries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  search_id     uuid        REFERENCES discovery_searches (id) ON DELETE SET NULL,
  term          text        NOT NULL,
  discovered_at timestamptz NOT NULL DEFAULT now()
);

-- Saved-search discoveries are unique per (product, search, term).
CREATE UNIQUE INDEX IF NOT EXISTS product_discoveries_product_search_term_key
  ON product_discoveries (product_id, search_id, term)
  WHERE search_id IS NOT NULL;

-- Manual (ad-hoc) discoveries have no search: unique per (product, term).
CREATE UNIQUE INDEX IF NOT EXISTS product_discoveries_product_term_manual_key
  ON product_discoveries (product_id, term)
  WHERE search_id IS NULL;

CREATE INDEX IF NOT EXISTS product_discoveries_product_id_discovered_at_idx
  ON product_discoveries (product_id, discovered_at DESC);
