-- 0002_discovery_searches_and_product_discoveries.down.sql
-- Reverse of 0002. Destructive: run only outside production.
DROP TABLE IF EXISTS product_discoveries;
DROP TABLE IF EXISTS discovery_searches;
