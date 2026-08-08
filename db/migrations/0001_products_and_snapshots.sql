-- 0001_products_and_snapshots.sql
-- Stage 02B.1 — product identity + historical snapshots.
-- Incremental and non-destructive: only creates objects if they do not exist.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source             text        NOT NULL,
  source_product_id  text        NOT NULL,
  name               text,
  thumbnail          text,
  product_url        text,
  category           text,
  currency           text,
  seller_name        text,
  brand              text,
  business_name      text,
  country_code       text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_source_source_product_id_key
  ON products (source, source_product_id);

CREATE TABLE IF NOT EXISTS product_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  observed_at         timestamptz NOT NULL,
  price               numeric(18, 4),
  sold_count          bigint,
  rating              numeric(6, 3),
  review_count        bigint,
  seller_video_count  bigint,
  gmv_contribution    numeric(20, 4),
  discount_percent    numeric(8, 3),
  comment_rate        numeric(10, 5),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_snapshots_product_id_observed_at_idx
  ON product_snapshots (product_id, observed_at);
