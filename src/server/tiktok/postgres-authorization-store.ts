import type {
  TikTokAuthorization,
  TikTokAuthorizationInput,
  TikTokAuthorizationStore,
} from "./authorization-store";
import { encryptToken } from "./token-crypto";

/**
 * Persistência das autorizações TikTok em PostgreSQL (tabela isolada
 * `tiktok_authorizations`, migrations 0004 + 0005). Server-only: importa `pg`.
 */
export class PostgresTikTokAuthorizationStore implements TikTokAuthorizationStore {
  readonly name = "postgres";
  private pool: unknown;

  private async getPool() {
    if (!this.pool) {
      const pg = await import("pg");
      const Pool = (pg.default ?? pg).Pool;
      this.pool = new Pool({
        connectionString: process.env["DATABASE_URL"],
        ...(process.env["DATABASE_SSL"] === "true"
          ? { ssl: { rejectUnauthorized: false } }
          : {}),
      });
    }
    return this.pool as { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> };
  }

  async save(input: TikTokAuthorizationInput): Promise<TikTokAuthorization> {
    const pool = await this.getPool();
    const { rows } = await pool.query(
      `INSERT INTO tiktok_authorizations
         (authorization_type, market, access_token_encrypted, refresh_token_encrypted,
          access_token_expires_at, refresh_token_expires_at, open_id, user_type, granted_scopes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.authorizationType,
        input.market,
        encryptToken(input.accessToken),
        input.refreshToken ? encryptToken(input.refreshToken) : null,
        input.accessTokenExpiresAt,
        input.refreshTokenExpiresAt,
        input.openId,
        input.userType,
        input.grantedScopes,
      ],
    );
    return mapRow(rows[0]);
  }

  async getLatest(authorizationType: string): Promise<TikTokAuthorization | null> {
    const pool = await this.getPool();
    const { rows } = await pool.query(
      `SELECT * FROM tiktok_authorizations
        WHERE authorization_type = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [authorizationType],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }
}

function mapRow(row: any): TikTokAuthorization {
  return {
    id: String(row.id),
    authorizationType: row.authorization_type,
    market: row.market ?? null,
    accessToken: row.access_token_encrypted,
    refreshToken: row.refresh_token_encrypted ?? null,
    accessTokenExpiresAt: row.access_token_expires_at
      ? new Date(row.access_token_expires_at).toISOString()
      : null,
    refreshTokenExpiresAt: row.refresh_token_expires_at
      ? new Date(row.refresh_token_expires_at).toISOString()
      : null,
    openId: row.open_id ?? null,
    userType: row.user_type ?? null,
    grantedScopes: Array.isArray(row.granted_scopes) ? row.granted_scopes : [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
