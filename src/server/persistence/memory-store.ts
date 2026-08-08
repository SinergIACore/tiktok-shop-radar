import { isDuplicateSnapshot, mergeIdentity } from "./snapshot-rules";
import type {
  ProductIdentityInput,
  ProductStore,
  SnapshotInput,
  StoredProduct,
  StoredSnapshot,
} from "./types";

/**
 * In-memory store. Used in the dev sandbox (no DATABASE_URL) and in automated
 * tests. Data is volatile: it disappears when the process restarts.
 */
export class MemoryProductStore implements ProductStore {
  readonly name = "memory";
  private products = new Map<string, StoredProduct>();
  private snapshots = new Map<string, StoredSnapshot[]>();
  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  private key(source: string, sourceProductId: string): string {
    return `${source}::${sourceProductId}`;
  }

  async ingest(
    identity: ProductIdentityInput,
    snapshot: Omit<SnapshotInput, "productId">,
    dedupWindowMs: number,
  ) {
    const now = new Date().toISOString();
    const key = this.key(identity.source, identity.sourceProductId);
    const existing = [...this.products.values()].find(
      (p) => this.key(p.source, p.sourceProductId) === key,
    );

    let product: StoredProduct;
    let created = false;

    if (!existing) {
      created = true;
      product = {
        id: this.nextId("prd"),
        ...identity,
        createdAt: now,
        updatedAt: now,
        firstSeenAt: now,
        lastSeenAt: now,
      };
    } else {
      product = {
        ...existing,
        ...mergeIdentity(existing, identity),
        updatedAt: now,
        lastSeenAt: now,
      };
    }
    this.products.set(product.id, product);

    const list = this.snapshots.get(product.id) ?? [];
    const previous = list.length > 0 ? (list[list.length - 1] ?? null) : null;
    let snapshotCreated = false;
    if (!isDuplicateSnapshot(previous, snapshot, dedupWindowMs)) {
      list.push({
        id: this.nextId("snp"),
        productId: product.id,
        createdAt: now,
        ...snapshot,
      });
      list.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
      this.snapshots.set(product.id, list);
      snapshotCreated = true;
    }

    return { created, snapshotCreated, product };
  }

  async getProduct(productId: string) {
    return this.products.get(productId) ?? null;
  }

  async findProduct(source: string, sourceProductId: string) {
    return (
      [...this.products.values()].find(
        (p) => p.source === source && p.sourceProductId === sourceProductId,
      ) ?? null
    );
  }

  async listProducts(limit = 50) {
    return [...this.products.values()]
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
      .slice(0, limit);
  }

  async listSnapshots(productId: string) {
    return [...(this.snapshots.get(productId) ?? [])].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt),
    );
  }
}
