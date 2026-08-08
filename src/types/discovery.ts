/**
 * Discovery domain types (Stage 02C.2) — shared by server and UI.
 *
 * Vocabulary (see docs/ARCHITECTURE.md):
 *   Search    — the INTENTION of looking for products (saved or ad-hoc).
 *   Discovery — WHERE/HOW a product was found (search + term + timestamp).
 *   Ingestion — writing product identity + snapshot.
 *   Snapshot  — one metric observation.
 *   Trend     — how the metrics of a product evolved (Stage 02C.1).
 */

export type SearchType = "keyword" | "product_name" | "niche";

export interface DiscoverySearch {
  id: string;
  name: string;
  type: SearchType;
  query: string | null;
  nicheKey: string | null;
  terms: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  runCount: number;
}

export interface DiscoverySearchInput {
  name: string;
  type: SearchType;
  query?: string | null;
  nicheKey?: string | null;
  terms?: string[];
  active?: boolean;
}

export interface DiscoverySearchPatch {
  name?: string;
  query?: string | null;
  nicheKey?: string | null;
  terms?: string[];
  active?: boolean;
}

export interface ProductDiscovery {
  id: string;
  productId: string;
  searchId: string | null;
  searchName: string | null;
  searchType: SearchType | null;
  nicheKey: string | null;
  term: string;
  discoveredAt: string;
}

export interface DiscoveryRunLimits {
  maxTermsPerRun: number;
  maxProductsPerTerm: number;
}

export interface DiscoveryTermResult {
  term: string;
  status: "ok" | "failed";
  received?: number;
  productIds?: string[];
  message?: string;
}

export interface DiscoveryRunSummary {
  startedAt: string;
  finishedAt: string;
  termsExecuted: number;
  received: number;
  uniqueProducts: number;
  productsCreated: number;
  productsUpdated: number;
  snapshotsCreated: number;
  snapshotsSkipped: number;
  discoveriesCreated: number;
  discoveriesSkipped: number;
}

/** Product card shown after a run. TrendStatus always comes from the engine. */
export interface DiscoveryProductResult {
  id: string;
  name: string | null;
  thumbnail: string | null;
  productUrl: string | null;
  sellerName: string | null;
  currency: string | null;
  price: number | null;
  soldCount: number | null;
  gmv: number | null;
  trendStatus: string;
  trendEvidence: string;
  snapshotCount: number;
}

export interface DiscoveryRunResponse {
  search: DiscoverySearch;
  run: DiscoveryRunSummary;
  limits: DiscoveryRunLimits;
  terms: DiscoveryTermResult[];
  errors: { term: string; status: "failed"; message: string }[];
  products: DiscoveryProductResult[];
}

export interface DiscoverySearchListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: DiscoverySearch[];
}
