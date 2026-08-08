import { computeProductMetrics, EMPTY_METRICS } from "../metrics/product-metrics";
import type { MetricSnapshot } from "../metrics/product-metrics";
import { PersistenceError, type StoredSnapshot } from "../persistence/types";
import type { DashboardSummary } from "../dashboard/types";
import type {
  ProductListPage,
  ProductListQuery,
  ProductListSort,
  ProductReadRepository,
  ProductWithMetrics,
} from "./types";

/**
 * PostgreSQL read repository (Stage 02B.2 / 02B.3).
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
      const ssl =
        process.env["DATABASE_SSL"] === "true" ? { rejectUnauthorized: false } : undefined;
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

function text(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
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
    name: text(row["name"]),
    thumbnail: text(row["thumbnail"]),
    productUrl: text(row["product_url"]),
    category: text(row["category"]),
    sellerName: text(row["seller_name"]),
    brand: text(row["brand"]),
    businessName: text(row["business_name"]),
    countryCode: text(row["country_code"]),
    currency: text(row["currency"]),
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

const PRODUCT_COLS = `p.id, p.source, p.source_product_id, p.name, p.thumbnail, p.product_url,
       p.category, p.seller_name, p.brand, p.business_name, p.country_code, p.currency,
       p.first_seen_at, p.last_seen_at`;

/**
 * Single query, no N+1: a window function ranks the snapshots per product and
 * the two most recent rows are joined back onto the product.
 */
const METRICS_QUERY = (
  whereClause: string,
  limitClause: string,
  orderBy = "p.last_seen_at DESC",
) => `
WITH ranked AS (
  SELECT s.*,
         row_number() OVER (PARTITION BY s.product_id ORDER BY s.observed_at DESC, s.id DESC) AS rn,
         count(*) OVER (PARTITION BY s.product_id) AS snapshot_count
    FROM product_snapshots s
)
SELECT ${PRODUCT_COLS},
       COALESCE(l.snapshot_count, 0) AS snapshot_count,
       ${SNAPSHOT_COLS("l", "l_")},
       ${SNAPSHOT_COLS("v", "p_")}
  FROM products p
  LEFT JOIN ranked l ON l.product_id = p.id AND l.rn = 1
  LEFT JOIN ranked v ON v.product_id = p.id AND v.rn = 2
  ${whereClause}
 ORDER BY ${orderBy}
 ${limitClause}`;

const SORT_EXPRESSIONS: Record<ProductListSort, string> = {
  soldCount: "l.sold_count",
  gmv: "l.gmv_contribution",
  soldCountDelta: "(l.sold_count - v.sold_count)",
  gmvDelta: "(l.gmv_contribution - v.gmv_contribution)",
  salesVelocity:
    "CASE WHEN v.observed_at IS NULL OR l.observed_at <= v.observed_at THEN NULL ELSE (l.sold_count - v.sold_count) / (EXTRACT(EPOCH FROM (l.observed_at - v.observed_at)) / 3600) END",
  lastObservedAt: "l.observed_at",
};

/** Builds the WHERE clause + bound values for the listing filters. */
function buildFilters(query: ProductListQuery) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(sql.replace("$?", `$${values.length}`));
  };

  if (query.search) push("p.name ILIKE $?", `%${query.search}%`);
  if (query.seller) push("p.seller_name ILIKE $?", `%${query.seller}%`);
  if (query.category) push("p.category = $?", query.category);
  if (query.hasHistory) clauses.push("COALESCE(l.snapshot_count, 0) >= 2");
  if (query.minPrice !== null && query.minPrice !== undefined)
    push("l.price >= $?", query.minPrice);
  if (query.maxPrice !== null && query.maxPrice !== undefined)
    push("l.price <= $?", query.maxPrice);
  if (query.minSold !== null && query.minSold !== undefined)
    push("l.sold_count >= $?", query.minSold);
  if (query.minReviews !== null && query.minReviews !== undefined)
    push("l.review_count >= $?", query.minReviews);
  if (query.minRating !== null && query.minRating !== undefined)
    push("l.rating >= $?", query.minRating);

  return { where: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "", values };
}

export class PostgresProductReadRepository implements ProductReadRepository {
  readonly name = "postgres";

  async listProductsWithMetrics(limit = 50): Promise<ProductWithMetrics[]> {
    const pool = await getPool();
    const { rows } = await pool.query(METRICS_QUERY("", "LIMIT $1"), [
      Math.min(Math.max(limit, 1), 200),
    ]);
    return rows.map(toProductWithMetrics);
  }

  async listProductsPage(query: ProductListQuery): Promise<ProductListPage> {
    const pool = await getPool();
    const { where, values } = buildFilters(query);

    const countSql = `
WITH ranked AS (
  SELECT s.product_id,
         row_number() OVER (PARTITION BY s.product_id ORDER BY s.observed_at DESC, s.id DESC) AS rn,
         count(*) OVER (PARTITION BY s.product_id) AS snapshot_count,
         s.price, s.sold_count, s.rating, s.review_count
    FROM product_snapshots s
)
SELECT count(*)::bigint AS total
  FROM products p
  LEFT JOIN ranked l ON l.product_id = p.id AND l.rn = 1
  ${where}`;
    const countResult = await pool.query(countSql, values);
    const total = num(countResult.rows[0]?.["total"]) ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);
    const page = totalPages > 0 ? Math.min(query.page, totalPages) : 1;
    const offset = (page - 1) * query.limit;

    const direction = query.direction === "asc" ? "ASC" : "DESC";
    const orderBy = `${SORT_EXPRESSIONS[query.sort]} ${direction} NULLS LAST, p.last_seen_at DESC`;
    const listValues = [...values, query.limit, offset];
    const sql = METRICS_QUERY(
      where,
      `LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      orderBy,
    );
    const { rows } = await pool.query(sql, listValues);

    return { page, limit: query.limit, total, totalPages, items: rows.map(toProductWithMetrics) };
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

  /**
   * Single aggregated query — no N+1, no history loaded.
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const pool = await getPool();
    const { rows } = await pool.query(`
WITH counts AS (
  SELECT product_id, count(*) AS c FROM product_snapshots GROUP BY product_id
)
SELECT (SELECT count(*) FROM products)::bigint AS products_monitored,
       (SELECT count(*) FROM counts WHERE c >= 2)::bigint AS products_with_history,
       (SELECT count(*) FROM product_snapshots)::bigint AS snapshots_collected,
       (SELECT max(observed_at) FROM product_snapshots) AS last_observation_at,
       (SELECT count(*) FROM products WHERE first_seen_at >= now() - interval '24 hours')::bigint AS new_products_24h,
       (SELECT count(*) FROM product_snapshots WHERE observed_at >= now() - interval '24 hours')::bigint AS snapshots_24h`);
    const row = rows[0] ?? {};
    const lastObservationAt = row["last_observation_at"];
    return {
      productsMonitored: num(row["products_monitored"]) ?? 0,
      productsWithHistory: num(row["products_with_history"]) ?? 0,
      snapshotsCollected: num(row["snapshots_collected"]) ?? 0,
      lastObservationAt:
        lastObservationAt === null || lastObservationAt === undefined
          ? null
          : iso(lastObservationAt),
      newProducts24h: num(row["new_products_24h"]) ?? 0,
      snapshots24h: num(row["snapshots_24h"]) ?? 0,
    };
  }
}
