import { MemoryProductReadRepository } from "./memory-read-repository";
import type { ProductReadRepository } from "./types";

/**
 * Single place where the active READ repository is chosen.
 * Postgres when DATABASE_URL is set; otherwise the volatile memory store
 * (same instance used by the ingestion layer).
 */
let memorySingleton: ProductReadRepository | null = null;
let postgresSingleton: ProductReadRepository | null = null;

export async function getProductReadRepository(): Promise<ProductReadRepository> {
  if (process.env["DATABASE_URL"]) {
    if (!postgresSingleton) {
      const { PostgresProductReadRepository } = await import("./postgres-read-repository");
      postgresSingleton = new PostgresProductReadRepository();
    }
    return postgresSingleton;
  }
  if (!memorySingleton) {
    const { getProductStore } = await import("../persistence/index.server");
    memorySingleton = new MemoryProductReadRepository(await getProductStore());
  }
  return memorySingleton;
}
