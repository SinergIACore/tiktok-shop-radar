/**
 * Domain types for product intelligence.
 * These are provider-agnostic: no TikTok/API specific fields here.
 */

export type ProductCategory =
  | "beauty"
  | "home"
  | "fashion"
  | "electronics"
  | "fitness"
  | "pets"
  | "kitchen";

export interface ProductMetrics {
  /** 0-100 composite virality indicator (algorithm not implemented yet). */
  viralScore: number;
  /** Percentage growth over the selected period. */
  growthRate: number;
  /** Percentage engagement rate. */
  engagementRate: number;
  videoCount: number;
  creatorCount: number;
  /** 0-100 market saturation indicator. */
  saturation: number;
}

export interface Product extends ProductMetrics {
  id: string;
  name: string;
  thumbnail: string;
  category: ProductCategory;
  /** ISO 8601 date string. */
  firstDetectedAt: string;
  /** ISO 8601 date string. */
  lastUpdatedAt: string;
}

export type TimeRange = "24h" | "3d" | "7d" | "30d";

export type ProductSortKey =
  | "viralScore"
  | "growthRate"
  | "engagementRate"
  | "creatorCount";

export interface ProductQuery {
  range?: TimeRange;
  category?: ProductCategory | "all";
  sortBy?: ProductSortKey;
  limit?: number;
}
