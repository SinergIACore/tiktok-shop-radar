import { isDuplicateSnapshot, mergeIdentity } from "./snapshot-rules";
import { PersistenceError } from "./types";
import type {
  ProductIdentityInput,
  ProductStore,
  SnapshotInput,
  StoredProduct,
  StoredSnapshot,
} from "./types";

/**
 * PostgreSQL implementation (node-postgres). Used whenever DATABASE_URL is set.
 * The driver is imported lazily so the module never loads outside a Node
 * runtime that actually needs it.
 */

type QueryFn = (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

interface PoolLike {
  connect(): Promise<{ query: QueryFn; release(): void }>;
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
      const Pool = (pg as unknown as { default?: { Pool: new (c: object) => PoolLike }; Pool?: new (c: object) => PoolLike })
        .Pool ?? (pg as unknown as { default: { Pool: new (c: object) => PoolLike } }).default.Pool;
      const ssl = process.env["DATABASE_SSL"] === "true" ? { rejectUnauthorized: false } : undefined;
      return new Pool({ connectionString, max: 5, ...(ssl ? { ssl } : {}) });
    })();
  }
  return poolPromise;
}

function toProduct(row: Record<string, unknown>): StoredProduct {
  const iso = (value: unknown) =>
    value instanceof Date ? value.toISOString() : String(value ?? "");
  return {
    id: String(row["id"]),
    source: String(row["source"]),
    sourceProductId: String(row["source_product_id"]),
    name: (row["name"] as string) ?? null,
    thumbnail: (row["thumbnail"] as string) ?? null,
    productUrl: (row["product_url"] as string) ?? null,
    category: (row["category"] as string) ?? null,
    currency: (row["currency"] as string) ?? null,
    sellerName: (row["seller_name"] as string) ?? null,
    brand: (row["brand"] as string) ?? null,
    businessName: (row["business_name"] as string) ?? null,
    countryCode: (row["country_code"] as string) ?? null,
    createdAt: iso(row["created_at"]),
    updatedAt: iso(row["updated_at"]),
    firstSeenAt: iso(row["first_seen_at"]),
    lastSeenAt: iso(row["last_seen_at"]),
  };
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSnapshot(row: Record<string, unknown>): StoredSnapshot {
  const iso = (value: unknown) =>
    value instanceof Date ? value.toISOString() : String(value ?? "");
  return {
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
  };
}

const PRODUCT_COLUMNS = `id, source, source_product_id, name, thumbnail, product_url, category,
  currency, seller_name, brand, business_name, country_code,
  created_at, updated_at, first_seen_at, last_seen_at`;

export class PostgresProductStore implements ProductStore {
  readonly name = "postgres";

  async ingest(
    identity: ProductIdentityInput,
    snapshot: Omit<SnapshotInput, "productId">,
    dedupWindowMs: number,
  ) {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const found = await client.query(
        `SELECT ${PRODUCT_COLUMNS} FROM products WHERE source = $1 AND source_product_id = $2 FOR UPDATE`,
        [identity.source, identity.sourceProductId],
      );
      const existing = found.rows[0] ? toProduct(found.rows[0]) : null;
      const merged = existing ? mergeIdentity(existing, identity) : identity;

      const upserted = await client.query(
        `INSERT INTO products (
            source, source_product_id, name, thumbnail, product_url, category,
            currency, seller_name, brand, business_name, country_code,
            first_seen_at, last_seen_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now())
         ON CONFLICT (source, source_product_id) DO UPDATE SET
            name = $3, thumbnail = $4, product_url = $5, category = $6,
            currency = $7, seller_name = $8, brand = $9, business_name = $10,
            country_code = $11, last_seen_at = now(), updated_at = now()
         RETURNING ${PRODUCT_COLUMNS}`,
        [
          merged.source,
          merged.sourceProductId,
          merged.name,
          merged.thumbnail,
          merged.productUrl,
          merged.category,
          merged.currency,
          merged.sellerName,
          merged.brand,
          merged.businessName,
          merged.countryCode,
        ],
      );
      const product = toProduct(upserted.rows[0]!);

      const last = await client.query(
        `SELECT observed_at, price, sold_count, rating, review_count,
                seller_video_count, gmv_contribution, discount_percent, comment_rate, id, product_id, created_at
           FROM product_snapshots WHERE product_id = $1 ORDER BY observed_at DESC LIMIT 1`,
        [product.id],
      );
      const previous = last.rows[0] ? toSnapshot(last.rows[0]) : null;

      let snapshotCreated = false;
      if (!isDuplicateSnapshot(previous, snapshot, dedupWindowMs)) {
        await client.query(
          `INSERT INTO product_snapshots (
              product_id, observed_at, price, sold_count, rating, review_count,
              seller_video_count, gmv_contribution, discount_percent, comment_rate
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            product.id,
            snapshot.observedAt,
            snapshot.price,
            snapshot.soldCount,
            snapshot.rating,
            snapshot.reviewCount,
            snapshot.sellerVideoCount,
            snapshot.gmvContribution,
            snapshot.discountPercent,
            snapshot.commentRate,
          ],
        );
        snapshotCreated = true;
      }

      await client.query("COMMIT");
      return { created: existing === null, snapshotCreated, product };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (error instanceof PersistenceError) throw error;
      throw new PersistenceError(
        "database_error",
        error instanceof Error ? error.message : "Falha ao persistir produto.",
      );
    } finally {
      client.release();
    }
  }

  async getProduct(productId: string) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = $1`,
      [productId],
    );
    return rows[0] ? toProduct(rows[0]) : null;
  }

  async findProduct(source: string, sourceProductId: string) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT ${PRODUCT_COLUMNS} FROM products WHERE source = $1 AND source_product_id = $2`,
      [source, sourceProductId],
    );
    return rows[0] ? toProduct(rows[0]) : null;
  }

  async listProducts(limit = 50) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY last_seen_at DESC LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map(toProduct);
  }

  async listSnapshots(productId: string) {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT id, product_id, observed_at, price, sold_count, rating, review_count,
              seller_video_count, gmv_contribution, discount_percent, comment_rate, created_at
         FROM product_snapshots WHERE product_id = $1 ORDER BY observed_at ASC`,
      [productId],
    );
    return rows.map(toSnapshot);
  }
}
