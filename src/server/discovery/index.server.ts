import { MemoryDiscoveryStore } from "./memory-discovery-store";
import type { DiscoveryStore } from "./store-types";

/**
 * Single place where the active discovery store is chosen.
 * Postgres when DATABASE_URL is set; otherwise the volatile memory store.
 */
let memorySingleton: DiscoveryStore | null = null;
let postgresSingleton: DiscoveryStore | null = null;

export async function getDiscoveryStore(): Promise<DiscoveryStore> {
  if (process.env["DATABASE_URL"]) {
    if (!postgresSingleton) {
      const { PostgresDiscoveryStore } = await import("./postgres-discovery-store");
      postgresSingleton = new PostgresDiscoveryStore();
    }
    return postgresSingleton;
  }
  if (!memorySingleton) memorySingleton = new MemoryDiscoveryStore();
  return memorySingleton;
}
