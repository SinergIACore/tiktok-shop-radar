DROP INDEX IF EXISTS idx_discovery_searches_market;

ALTER TABLE discovery_searches
  DROP COLUMN IF EXISTS market;
