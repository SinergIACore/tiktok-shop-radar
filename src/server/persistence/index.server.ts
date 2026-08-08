import { MemoryProductStore } from "./memory-store";
import type { ProductStore } from "./types";

/**
 * Single place where the active persistence adapter is chosen.
 * Postgres when DATABASE_URL is present (production/EasyPanel), otherwise a
 * volatile in-memory store so the LAB keeps working in dev without a database.
 */
let memorySingleton: MemoryProductStore | null = null;
let postgresSingleton: ProductStore | null = null;

export async function getProductStore(): Promise<ProductStore> {
  if (process.env["DATABASE_URL"]) {
    if (!postgresSingleton) {
      const { PostgresProductStore } = await import("./postgres-store");
      postgresSingleton = new PostgresProductStore();
    }
    return postgresSingleton;
  }
  if (!memorySingleton) memorySingleton = new MemoryProductStore();
  return memorySingleton;
}
