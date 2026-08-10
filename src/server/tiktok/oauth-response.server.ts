import { buildTikTokAuthorizeUrl } from "./authorize-url.server";
import { createOAuthState, OAUTH_STATE_COOKIE, OAUTH_STATE_TTL_MS } from "./oauth-state.server";

/**
 * Respostas do OAuth Creator construídas SEMPRE com Headers mutáveis.
 *
 * `Response.redirect()` devolve uma Response com headers imutáveis (guard
 * "immutable"): quando o runtime SSR tenta mesclar/remover headers depois,
 * ele dispara `TypeError: immutable` em `_Headers.delete`. Por isso montamos
 * `new Response(null, { status: 302, headers })` manualmente.
 */
export function redirectResponse(location: string, setCookie?: string): Response {
  const headers = new Headers();
  headers.set("Location", location);
  headers.set("Cache-Control", "no-store");
  if (setCookie) headers.append("Set-Cookie", setCookie);
  return new Response(null, { status: 302, headers });
}

export function settingsUrl(request: Request, params: Record<string, string>): string {
  const url = new URL("/settings", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

/** Serializa o cookie de state (HttpOnly, Secure, SameSite=Lax, TTL). */
export function serializeStateCookie(
  state: string,
  options: { secure: boolean; maxAgeSeconds?: number } = { secure: true },
): string {
  const maxAge = options.maxAgeSeconds ?? Math.floor(OAUTH_STATE_TTL_MS / 1000);
  const parts = [
    `${OAUTH_STATE_COOKIE}=${state}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

/** Cookie de expiração imediata usado no callback (single-use). */
export function clearStateCookie(secure: boolean): string {
  const parts = [`${OAUTH_STATE_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Monta a resposta 302 do /connect (ou o redirect de erro para /settings). */
export function buildConnectResponse(request: Request): Response {
  const state = createOAuthState();
  const result = buildTikTokAuthorizeUrl(state);
  if (!result.ok) {
    console.warn(`[tiktok-oauth] status=connect_blocked reason=${result.reason}`);
    return redirectResponse(settingsUrl(request, { tiktok: "error", reason: result.reason }));
  }

  const secure = new URL(request.url).protocol === "https:";
  return redirectResponse(result.url, serializeStateCookie(state, { secure }));
}
