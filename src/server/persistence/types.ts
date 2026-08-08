/**
 * Persistence contracts for Stage 02B.1.
 *
 * The application depends only on these interfaces, never on a concrete
 * database driver. Two implementations exist:
 *  - PostgresProductStore  (production, DATABASE_URL)
 *  - MemoryProductStore    (dev sandbox / automated tests)
 */

export interface StoredProduct {
  id: string;
  source: string;
  sourceProductId: string;
  name: string | null;
  thumbnail: string | null;
  productUrl: string | null;
  category: string | null;
  currency: string | null;
  sellerName: string | null;
  brand: string | null;
  businessName: string | null;
  countryCode: string | null;
  createdAt: string;
  updatedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** Identity/metadata fields that a new observation may refresh. */
export interface ProductIdentityInput {
  source: string;
  sourceProductId: string;
  name: string | null;
  thumbnail: string | null;
  productUrl: string | null;
  category: string | null;
  currency: string | null;
  sellerName: string | null;
  brand: string | null;
  businessName: string | null;
  countryCode: string | null;
}

export interface StoredSnapshot {
  id: string;
  productId: string;
  observedAt: string;
  price: number | null;
  soldCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  sellerVideoCount: number | null;
  gmvContribution: number | null;
  discountPercent: number | null;
  commentRate: number | null;
  createdAt: string;
}

export type SnapshotInput = Omit<StoredSnapshot, "id" | "createdAt">;

export interface UpsertProductResult {
  product: StoredProduct;
  created: boolean;
}

export interface ProductStore {
  readonly name: string;
  /** Upsert product identity + append snapshot atomically when supported. */
  ingest(
    identity: ProductIdentityInput,
    snapshot: Omit<SnapshotInput, "productId">,
    dedupWindowMs: number,
  ): Promise<{ created: boolean; snapshotCreated: boolean; product: StoredProduct }>;
  getProduct(productId: string): Promise<StoredProduct | null>;
  findProduct(source: string, sourceProductId: string): Promise<StoredProduct | null>;
  listProducts(limit?: number): Promise<StoredProduct[]>;
  /** Chronological order: observedAt ASC. */
  listSnapshots(productId: string): Promise<StoredSnapshot[]>;
}

export type PersistenceErrorCode = "database_error" | "validation_error" | "not_found";

export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;
  readonly status: number;

  constructor(code: PersistenceErrorCode, message: string, status = 500) {
    super(message);
    this.name = "PersistenceError";
    this.code = code;
    this.status = status;
  }
}
