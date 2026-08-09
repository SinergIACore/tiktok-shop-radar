/**
 * Discovery commercial quality filter (Stage 02C.2B).
 *
 * PURE domain module. It is NOT a trend status and NOT a viral score: it only
 * decides whether a freshly collected candidate is commercially relevant
 * enough to be persisted as a Product/ProductSnapshot.
 *
 * A product is discarded (never persisted) when it fails EVERY criterion.
 */
import type { NormalizedProduct } from "@/services/providers/product-data/types/external-product.types";

export interface DiscoveryQualityRule {
  minSoldCount: number;
  minReviewCount: number;
}

/** Conservative initial default: soldCount >= 100 OR reviewCount >= 20. */
export const DEFAULT_QUALITY_RULE: DiscoveryQualityRule = {
  minSoldCount: 100,
  minReviewCount: 20,
};

export function qualifies(
  product: Pick<NormalizedProduct, "soldCount" | "reviewCount">,
  rule: DiscoveryQualityRule = DEFAULT_QUALITY_RULE,
): boolean {
  const sold = typeof product.soldCount === "number" ? product.soldCount : null;
  const reviews = typeof product.reviewCount === "number" ? product.reviewCount : null;
  if (sold !== null && sold >= rule.minSoldCount) return true;
  if (reviews !== null && reviews >= rule.minReviewCount) return true;
  return false;
}

export interface QualitySplit<T> {
  qualified: T[];
  discarded: T[];
}

export function splitByQuality<T extends Pick<NormalizedProduct, "soldCount" | "reviewCount">>(
  items: T[],
  rule: DiscoveryQualityRule = DEFAULT_QUALITY_RULE,
): QualitySplit<T> {
  const qualified: T[] = [];
  const discarded: T[] = [];
  for (const item of items) {
    if (qualifies(item, rule)) qualified.push(item);
    else discarded.push(item);
  }
  return { qualified, discarded };
}

/** Parses a client-provided rule, always clamped to non-negative integers. */
export function parseQualityRule(raw: unknown): DiscoveryQualityRule {
  const input = (raw ?? {}) as { minSoldCount?: unknown; minReviewCount?: unknown };
  const clamp = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(Math.trunc(parsed), 0);
  };
  return {
    minSoldCount: clamp(input.minSoldCount, DEFAULT_QUALITY_RULE.minSoldCount),
    minReviewCount: clamp(input.minReviewCount, DEFAULT_QUALITY_RULE.minReviewCount),
  };
}
