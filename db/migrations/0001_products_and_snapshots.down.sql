-- 0001_products_and_snapshots.down.sql
-- Reverse of 0001. Destructive: run only outside production.
DROP TABLE IF EXISTS product_snapshots;
DROP TABLE IF EXISTS products;
