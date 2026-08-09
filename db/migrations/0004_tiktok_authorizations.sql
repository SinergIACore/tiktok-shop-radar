-- Etapa TikTok Oficial 01 — autorizações da TikTok Shop Open API.
-- Tabela isolada e mínima: nada nas tabelas existentes é alterado.
-- Tokens são gravados SEMPRE criptografados (AES-256-GCM na aplicação).

CREATE TABLE IF NOT EXISTS tiktok_authorizations (
  id                        bigserial PRIMARY KEY,
  authorization_type        text NOT NULL,
  market                    text,
  access_token_encrypted    text NOT NULL,
  refresh_token_encrypted   text,
  access_token_expires_at   timestamptz,
  refresh_token_expires_at  timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tiktok_authorizations_type_created_idx
  ON tiktok_authorizations (authorization_type, created_at DESC);
