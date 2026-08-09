import { createHmac } from "node:crypto";

/**
 * Assinatura das requisições da TikTok Shop Open API.
 *
 * ADAPTER ISOLADO — o algoritmo abaixo segue a documentação pública do
 * TikTok Shop Partner Center ("Signature Generation"):
 *
 *   1. ordenar os query params (exceto `sign` e `access_token`) por chave
 *   2. concatenar `key + value` na ordem
 *   3. prefixar/sufixar com o `path` do request e envolver com o app_secret
 *   4. HMAC-SHA256 com o app_secret, em hexadecimal
 *
 * PENDÊNCIA DE VALIDAÇÃO: enquanto não houver uma resposta 200 real da API
 * oficial, este algoritmo permanece NÃO COMPROVADO em produção. Ele está
 * isolado neste arquivo justamente para poder ser corrigido em um único ponto.
 */
export function signTikTokRequest(input: {
  appSecret: string;
  path: string;
  query: Record<string, string>;
  /** Corpo JSON serializado, quando houver (POST). */
  body?: string;
}): string {
  const entries = Object.entries(input.query)
    .filter(([key]) => key !== "sign" && key !== "access_token")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  let base = input.path;
  for (const [key, value] of entries) base += `${key}${value}`;
  if (input.body) base += input.body;

  const payload = `${input.appSecret}${base}${input.appSecret}`;
  return createHmac("sha256", input.appSecret).update(payload).digest("hex");
}
