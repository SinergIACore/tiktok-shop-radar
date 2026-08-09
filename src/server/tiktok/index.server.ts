import {
  MemoryTikTokAuthorizationStore,
  type TikTokAuthorizationStore,
} from "./authorization-store";

/**
 * Escolha única do adapter de persistência das autorizações TikTok.
 * Postgres quando DATABASE_URL existe; caso contrário, memória (dev).
 */
let memorySingleton: MemoryTikTokAuthorizationStore | null = null;
let postgresSingleton: TikTokAuthorizationStore | null = null;

export async function getTikTokAuthorizationStore(): Promise<TikTokAuthorizationStore> {
  if (process.env["DATABASE_URL"]) {
    if (!postgresSingleton) {
      const { PostgresTikTokAuthorizationStore } = await import("./postgres-authorization-store");
      postgresSingleton = new PostgresTikTokAuthorizationStore();
    }
    return postgresSingleton;
  }
  if (!memorySingleton) memorySingleton = new MemoryTikTokAuthorizationStore();
  return memorySingleton;
}
