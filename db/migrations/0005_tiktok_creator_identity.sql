-- Correção Creator OAuth: identidade e scopes concedidos.
-- Colunas aditivas na tabela isolada; nada existente é alterado.

ALTER TABLE tiktok_authorizations
  ADD COLUMN IF NOT EXISTS open_id        text,
  ADD COLUMN IF NOT EXISTS user_type      integer,
  ADD COLUMN IF NOT EXISTS granted_scopes text[] NOT NULL DEFAULT '{}';
