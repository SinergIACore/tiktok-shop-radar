import { decryptToken, encryptToken } from "./token-crypto";

/**
 * Autorização TikTok persistida (server-only).
 * Tokens SEMPRE ficam criptografados no armazenamento.
 */
export interface TikTokAuthorization {
  id: string;
  authorizationType: string;
  market: string | null;
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TikTokAuthorizationInput {
  authorizationType: string;
  market: string | null;
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
}

export interface TikTokAuthorizationStore {
  readonly name: string;
  save(input: TikTokAuthorizationInput): Promise<TikTokAuthorization>;
  getLatest(authorizationType: string): Promise<TikTokAuthorization | null>;
}

/** Store volátil para desenvolvimento sem banco. */
export class MemoryTikTokAuthorizationStore implements TikTokAuthorizationStore {
  readonly name = "memory";
  private readonly rows: TikTokAuthorization[] = [];

  async save(input: TikTokAuthorizationInput): Promise<TikTokAuthorization> {
    const now = new Date().toISOString();
    const row: TikTokAuthorization = {
      id: `${input.authorizationType}-${this.rows.length + 1}`,
      ...input,
      // Mesmo em memória o token fica cifrado: o formato de armazenamento é o
      // mesmo do Postgres, evitando divergência de comportamento.
      accessToken: encryptToken(input.accessToken),
      refreshToken: input.refreshToken ? encryptToken(input.refreshToken) : null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.unshift(row);
    return row;
  }

  async getLatest(authorizationType: string): Promise<TikTokAuthorization | null> {
    return this.rows.find((row) => row.authorizationType === authorizationType) ?? null;
  }
}

/** Descriptografa o access token de uma autorização persistida. */
export function readAccessToken(auth: TikTokAuthorization): string {
  return decryptToken(auth.accessToken);
}
