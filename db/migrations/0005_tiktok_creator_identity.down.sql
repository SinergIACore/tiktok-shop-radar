ALTER TABLE tiktok_authorizations
  DROP COLUMN IF EXISTS open_id,
  DROP COLUMN IF EXISTS user_type,
  DROP COLUMN IF EXISTS granted_scopes;
