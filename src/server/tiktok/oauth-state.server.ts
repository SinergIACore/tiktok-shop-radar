import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * State anti-CSRF do OAuth Creator (server-only).
 *
 * Requisitos atendidos:
 * - aleatório e imprevisível (32 bytes de crypto.randomBytes);
 * - associado à sessão do navegador (cookie HttpOnly);
 * - single-use (consumido do registro server-side);
 * - expira (TTL) e é invalidado após o uso.
 */
export const OAUTH_STATE_COOKIE = "tiktok_oauth_state";
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const issued = new Map<string, number>();

function purge(now: number): void {
  for (const [state, expiresAt] of issued) {
    if (expiresAt <= now) issued.delete(state);
  }
}

export function createOAuthState(): string {
  const now = Date.now();
  purge(now);
  const state = randomBytes(32).toString("hex");
  issued.set(state, now + OAUTH_STATE_TTL_MS);
  return state;
}

export type StateValidation = "ok" | "missing_state" | "state_mismatch" | "state_expired";

/** Valida e invalida o state. Nunca aceita um state já usado ou expirado. */
export function consumeOAuthState(
  received: string | null | undefined,
  fromCookie: string | null | undefined,
): StateValidation {
  if (!received || !fromCookie) return "missing_state";

  const a = Buffer.from(received);
  const b = Buffer.from(fromCookie);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "state_mismatch";

  const expiresAt = issued.get(received);
  // Invalida imediatamente: single-use, mesmo que expirado.
  issued.delete(received);
  if (!expiresAt) return "state_mismatch";
  if (expiresAt <= Date.now()) return "state_expired";
  return "ok";
}

/** Apenas para testes: limpa o registro em memória. */
export function __resetOAuthStates(): void {
  issued.clear();
}
