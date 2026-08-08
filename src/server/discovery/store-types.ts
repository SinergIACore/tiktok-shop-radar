import type {
  DiscoverySearch,
  DiscoverySearchInput,
  DiscoverySearchPatch,
  ProductDiscovery,
} from "@/types/discovery";

export interface DiscoverySearchListQuery {
  page: number;
  limit: number;
  activeOnly: boolean;
}

export interface DiscoverySearchPage {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: DiscoverySearch[];
}

export interface DiscoveryRecordInput {
  productId: string;
  searchId: string | null;
  term: string;
  discoveredAt: string;
}

/**
 * Persistence contract for the discovery layer. Two implementations exist:
 *  - PostgresDiscoveryStore (production, DATABASE_URL)
 *  - MemoryDiscoveryStore   (dev sandbox / automated tests)
 * It never calls a provider and never computes trends.
 */
export interface DiscoveryStore {
  readonly name: string;
  listSearches(query: DiscoverySearchListQuery): Promise<DiscoverySearchPage>;
  createSearch(input: Required<DiscoverySearchInput>): Promise<DiscoverySearch>;
  getSearch(id: string): Promise<DiscoverySearch | null>;
  updateSearch(id: string, patch: DiscoverySearchPatch): Promise<DiscoverySearch | null>;
  /** Increments run_count and sets last_run_at. */
  recordRun(id: string, ranAt: string): Promise<DiscoverySearch | null>;
  /** Idempotent on (product_id, search_id, term). */
  recordDiscovery(input: DiscoveryRecordInput): Promise<{ created: boolean }>;
  listDiscoveriesForProduct(productId: string, limit?: number): Promise<ProductDiscovery[]>;
}

export type DiscoveryErrorCode =
  | "validation_error"
  | "not_found"
  | "database_error"
  | "not_configured"
  | "provider_error";

export class DiscoveryError extends Error {
  readonly code: DiscoveryErrorCode;
  readonly status: number;

  constructor(code: DiscoveryErrorCode, message: string, status = 400) {
    super(message);
    this.name = "DiscoveryError";
    this.code = code;
    this.status = status;
  }
}
