import { computeProductMetrics, EMPTY_METRICS } from "../metrics/product-metrics";
import type { MetricSnapshot } from "../metrics/product-metrics";
import { PersistenceError, type StoredSnapshot } from "../persistence/types";
import type { ProductReadRepository, ProductWithMetrics } from "./types";

/**
 * PostgreSQL read repository (Stage 02B.2).
 * Read-only: only SELECT statements. The pg driver is imported lazily so it
 * never reaches the client bundle.
 */

type QueryFn = (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
interface PoolLike {
  query: QueryFn;
}

let poolPromise: Promise<PoolLike> | null = null;

async function getPool(): Promise<PoolLike> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const connectionString = process.env["DATABASE_URL"];
      if (!connectionString) {
        throw new PersistenceError("database_error", "DATABASE_URL não configurada.", 503);
      }
      const pg = await import("pg");
      const mod = pg as unknown as {
        default?: { Pool: new (c: object) => PoolLike };
        Pool?: new (c: object) => PoolLike;
      };
      const Pool = mod.Pool ?? mod.default!.Pool;
      const ssl = process.env["DATABASE_SSL"] === "true" ? { rejectUnauthorized: false } : undefined;
      return new Pool({ connectionString, max: 5, ...(ssl ? { ssl } : {}) });
    })();
  }
  return poolPromise;
}

const iso = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value ?? "");

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function snapshotFrom(row: Record<string, unknown>, prefix: string): MetricSnapshot | null {
  const observedAt = row[`${prefix}observed_at`];
  if (observedAt === null || observedAt === undefined) return null;
  return {
    observedAt: iso(observedAt),
    price: num(row[`${prefix}price`]),
    soldCount: num(row[`${prefix}sold_count`]),
    rating: num(row[`${prefix}rating`]),
    reviewCount: num(row[`${prefix}review_count`]),
    sellerVideoCount: num(row[`${prefix}seller_video_count`]),
    gmvContribution: num(row[`${prefix}gmv_contribution`]),
  };
}

function toProductWithMetrics(row: Record<string, unknown>): ProductWithMetrics {
  const latest = snapshotFrom(row, "l_");
  const previous = snapshotFrom(row, "p_");
  return {
    id: String(row["id"]),
    source: String(row["source"]),
    sourceProductId: String(row["source_product_id"]),
    name: (row["name"] as string) ?? null,
    thumbnail: (row["thumbnail"] as string) ?? null,
    productUrl: (row["product_url"] as string) ?? null,
    sellerName: (row["seller_name"] as string) ?? null,
    currency: (row["currency"] as string) ?? null,
    firstSeenAt: iso(row["first_seen_at"]),
    lastSeenAt: iso(row["last_seen_at"]),
    snapshotCount: num(row["snapshot_count"]) ?? 0,
    latest,
    previous,
    metrics: latest && previous ? computeProductMetrics(latest, previous) : { ...EMPTY_METRICS },
  };
}

const SNAPSHOT_COLS = (alias: string, prefix: string) => `
  ${alias}.observed_at AS ${prefix}observed_at,
  ${alias}.price AS ${prefix}price,
  ${alias}.sold_count AS ${prefix}sold_count,
  ${alias}.rating AS ${prefix}rating,
  ${alias}.review_count AS ${prefix}review_count,
  ${alias}.seller_video_count AS ${prefix}seller_video_count,
  ${alias}.gmv_contribution AS ${prefix}gmv_contribution`;

/**
 * Single query, no N+1: a window function ranks the snapshots per product and
 * the two most recent rows are joined back onto the product.
 */
const METRICS_QUERY = (whereClause: string, limitClause: string) => `
WITH ranked AS (
  SELECT s.*,
         row_number() OVER (PARTITION BY s.product_id ORDER BY s.observed_at DESC, s.id DESC) AS rn,
         count(*) OVER (PARTITION BY s.product_id) AS snapshot_count
    FROM product_snapshots s
)
SELECT p.id, p.source, p.source_product_id, p.name, p.thumbnail, p.product_url,
       p.seller_name, p.currency, p.first_seen_at, p.last_seen_at,
       COALESCE(l.snapshot_count, 0) AS snapshot_count,
       ${SNAPSHOT_COLS("l", "l_")},
       ${SNAPSHOT_COLS("v", "p_")}
  FROM products p
  LEFT JOIN ranked l ON l.product_id = p.id AND l.rn = 1
  LEFT JOIN ranked v ON v.product_id = p.id AND v.rn = 2
  ${whereClause}
 ORDER BY p.last_seen_at DESC
 ${limitClause}`;

export class PostgresProductReadRepository implements ProductReadRepository {
  readonly name = "postgres";

  async listProductsWithMetrics(limit = 50): Promise<ProductWithMetrics[]> {
    const pool = await getPool();
    const { rows } = await pool.query(METRICS_QUERY("", "LIMIT $1"), [
      Math.min(Math.max(limit, 1), 200),
    ]);
    return rows.map(toProductWithMetrics);
  }

  async getProductWithMetrics(productId: string): Promise<ProductWithMetrics | null> {
    const pool = await getPool();
    const { rows } = await pool.query(METRICS_QUERY("WHERE p.id = $1", "LIMIT 1"), [productId]);
    return rows[0] ? toProductWithMetrics(rows[0]) : null;
  }

  async listHistory(productId: string): Promise<StoredSnapshot[]> {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT id, product_id, observed_at, price, sold_count, rating, review_count,
              seller_video_count, gmv_contribution, discount_percent, comment_rate, created_at
         FROM product_snapshots WHERE product_id = $1 ORDER BY observed_at ASC`,
      [productId],
    );
    return rows.map((row) => ({
      id: String(row["id"]),
      productId: String(row["product_id"]),
      observedAt: iso(row["observed_at"]),
      price: num(row["price"]),
      soldCount: num(row["sold_count"]),
      rating: num(row["rating"]),
      reviewCount: num(row["review_count"]),
      sellerVideoCount: num(row["seller_video_count"]),
      gmvContribution: num(row["gmv_contribution"]),
      discountPercent: num(row["discount_percent"]),
      commentRate: num(row["comment_rate"]),
      createdAt: iso(row["created_at"]),
    }));
  }
}
