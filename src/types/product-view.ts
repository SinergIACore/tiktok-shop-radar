/**
 * View model consumed by /products (Stage 02B.3).
 * The UI never sees database rows or repository types — only this shape.
 */

export interface ProductLatestView {
  observedAt: string;
  price: number | null;
  soldCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  sellerVideoCount: number | null;
  gmvContribution: number | null;
}

export interface ProductMetricsView {
  soldCountDelta: number | null;
  gmvDelta: number | null;
  priceDelta: number | null;
  reviewCountDelta: number | null;
  sellerVideoCountDelta: number | null;
  timeDeltaHours: number | null;
  salesVelocity: number | null;
}

export interface ProductListViewModel {
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
  latest: ProductLatestView | null;
  metrics: ProductMetricsView;
  snapshotCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface ProductSnapshotViewModel {
  id: string;
  observedAt: string;
  price: number | null;
  soldCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  sellerVideoCount: number | null;
  gmvContribution: number | null;
}

export interface ProductListResponse {
  store: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: ProductListViewModel[];
}

export interface ProductDetailResponse {
  store: string;
  product: ProductListViewModel;
  history: ProductSnapshotViewModel[];
}

export type RealProductSort =
  "soldCount" | "gmv" | "soldCountDelta" | "gmvDelta" | "salesVelocity" | "lastObservedAt";

export interface RealProductQuery {
  page?: number;
  limit?: 10 | 25 | 50;
  search?: string;
  seller?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  minSold?: string;
  minReviews?: string;
  minRating?: string;
  hasHistory?: boolean;
  sort?: RealProductSort;
  direction?: "asc" | "desc";
}
