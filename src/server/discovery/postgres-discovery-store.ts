import type {
  DiscoverySearch,
  DiscoverySearchInput,
  DiscoverySearchPatch,
  ProductDiscovery,
  SearchType,
} from "@/types/discovery";
import {
  DiscoveryError,
  type DiscoveryRecordInput,
  type DiscoverySearchListQuery,
  type DiscoverySearchPage,
  type DiscoveryStore,
} from "./store-types";

/**
 * PostgreSQL discovery store. The `pg` driver is imported lazily so it never
 * reaches the client bundle.
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
        throw new DiscoveryError("database_error", "DATABASE_URL não configurada.", 503);
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

const isoOrNull = (value: unknown): string | null =>
  value === null || value === undefined ? null : iso(value);

const SEARCH_COLS = `id, name, type, query, niche_key, market, terms, active,
       created_at, updated_at, last_run_at, run_count`;

function toSearch(row: Record<string, unknown>): DiscoverySearch {
  const rawTerms = row["terms"];
  const terms = Array.isArray(rawTerms)
    ? rawTerms.filter((entry): entry is string => typeof entry === "string")
    : typeof rawTerms === "string"
      ? (JSON.parse(rawTerms) as string[])
      : [];
  return {
    id: String(row["id"]),
    name: String(row["name"]),
    type: String(row["type"]) as SearchType,
    query: (row["query"] as string) ?? null,
    nicheKey: (row["niche_key"] as string) ?? null,
    market: String(row["market"] ?? "US"),
    terms,
    active: Boolean(row["active"]),
    createdAt: iso(row["created_at"]),
    updatedAt: iso(row["updated_at"]),
    lastRunAt: isoOrNull(row["last_run_at"]),
    runCount: Number(row["run_count"] ?? 0),
  };
}

export class PostgresDiscoveryStore implements DiscoveryStore {
  readonly name = "postgres";

  async listSearches(query: DiscoverySearchListQuery): Promise<DiscoverySearchPage> {
    const pool = await getPool();
    const where = query.activeOnly ? "WHERE active = true" : "";
    const countResult = await pool.query(
      `SELECT count(*)::bigint AS total FROM discovery_searches ${where}`,
    );
    const total = Number(countResult.rows[0]?.["total"] ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);
    const page = totalPages > 0 ? Math.min(query.page, totalPages) : 1;
    const offset = (page - 1) * query.limit;
    const { rows } = await pool.query(
      `SELECT ${SEARCH_COLS} FROM discovery_searches ${where}
        ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [query.limit, offset],
    );
    return { page, limit: query.limit, total, totalPages, items: rows.map(toSearch) };
  }

  async createSearch(input: Required<DiscoverySearchInput>): Promise<DiscoverySearch> {
    const pool = await getPool();
    const { rows } = await pool.query(
      `INSERT INTO discovery_searches (name, type, query, niche_key, market, terms, active)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING ${SEARCH_COLS}`,
      [
        input.name,
        input.type,
        input.query ?? null,
        input.nicheKey ?? null,
        input.market,
        JSON.stringify(input.terms ?? []),
        input.active,
      ],
    );
    return toSearch(rows[0]!);
  }

  async getSearch(id: string): Promise<DiscoverySearch | null> {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT ${SEARCH_COLS} FROM discovery_searches WHERE id = $1`,
      [id],
    );
    return rows[0] ? toSearch(rows[0]) : null;
  }

  async updateSearch(id: string, patch: DiscoverySearchPatch): Promise<DiscoverySearch | null> {
    const pool = await getPool();
    const sets: string[] = [];
    const values: unknown[] = [];
    const push = (sql: string, value: unknown) => {
      values.push(value);
      sets.push(sql.replace("$?", `$${values.length}`));
    };
    if (patch.name !== undefined) push("name = $?", patch.name);
    if (patch.query !== undefined) push("query = $?", patch.query);
    if (patch.nicheKey !== undefined) push("niche_key = $?", patch.nicheKey);
    if (patch.market !== undefined) push("market = $?", patch.market);
    if (patch.terms !== undefined) push("terms = $?::jsonb", JSON.stringify(patch.terms));
    if (patch.active !== undefined) push("active = $?", patch.active);
    if (sets.length === 0) return this.getSearch(id);
    sets.push("updated_at = now()");
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE discovery_searches SET ${sets.join(", ")}
        WHERE id = $${values.length} RETURNING ${SEARCH_COLS}`,
      values,
    );
    return rows[0] ? toSearch(rows[0]) : null;
  }

  async recordRun(id: string, ranAt: string): Promise<DiscoverySearch | null> {
    const pool = await getPool();
    const { rows } = await pool.query(
      `UPDATE discovery_searches
          SET run_count = run_count + 1, last_run_at = $2, updated_at = now()
        WHERE id = $1 RETURNING ${SEARCH_COLS}`,
      [id, ranAt],
    );
    return rows[0] ? toSearch(rows[0]) : null;
  }

  async recordDiscovery(input: DiscoveryRecordInput): Promise<{ created: boolean }> {
    const pool = await getPool();
    const { rows } = await pool.query(
      `INSERT INTO product_discoveries (product_id, search_id, term, discovered_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [input.productId, input.searchId, input.term, input.discoveredAt],
    );
    return { created: rows.length > 0 };
  }

  async listDiscoveriesForProduct(productId: string, limit = 50): Promise<ProductDiscovery[]> {
    const pool = await getPool();
    const { rows } = await pool.query(
      `SELECT d.id, d.product_id, d.search_id, d.term, d.discovered_at,
              s.name AS search_name, s.type AS search_type, s.niche_key
         FROM product_discoveries d
         LEFT JOIN discovery_searches s ON s.id = d.search_id
        WHERE d.product_id = $1
        ORDER BY d.discovered_at DESC
        LIMIT $2`,
      [productId, limit],
    );
    return rows.map((row) => ({
      id: String(row["id"]),
      productId: String(row["product_id"]),
      searchId: row["search_id"] ? String(row["search_id"]) : null,
      searchName: (row["search_name"] as string) ?? null,
      searchType: (row["search_type"] as SearchType) ?? null,
      nicheKey: (row["niche_key"] as string) ?? null,
      term: String(row["term"]),
      discoveredAt: iso(row["discovered_at"]),
    }));
  }
}
