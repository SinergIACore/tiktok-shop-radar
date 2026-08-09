-- 0003 — Discovery market/country support (Stage 02C.2B)
-- A saved search must remember which TikTok Shop market it targets.
-- Values are constrained to the markets the provider Actor really supports.

ALTER TABLE discovery_searches
  ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'US';

CREATE INDEX IF NOT EXISTS idx_discovery_searches_market
  ON discovery_searches (market);
