import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Criptografia dos tokens TikTok em repouso (server-only).
 *
 * A chave vem de TIKTOK_TOKEN_ENCRYPTION_KEY (base64 de 32 bytes, ou qualquer
 * string forte — nesse caso é derivada via SHA-256). Sem a chave definida,
 * a persistência de tokens é recusada: nunca gravamos token em texto aberto.
 */
export class TokenCryptoError extends Error {}

function key(): Buffer {
  const raw = process.env["TIKTOK_TOKEN_ENCRYPTION_KEY"];
  if (!raw) {
    throw new TokenCryptoError("TIKTOK_TOKEN_ENCRYPTION_KEY não configurada.");
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  return createHash("sha256").update(raw).digest();
}

export function hasTokenEncryptionKey(): boolean {
  return Boolean(process.env["TIKTOK_TOKEN_ENCRYPTION_KEY"]);
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptToken(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
