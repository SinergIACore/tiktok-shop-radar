/**
 * Discovery commercial quality filter (Stage 02C.2B → 02C.2C).
 *
 * PURE domain module. It is NOT a trend status and NOT a viral score: it only
 * decides how relevant a freshly collected candidate is for discovery.
 *
 * Three tiers:
 *   STRONG   — clear commercial signals (sold/reviews above the cut).
 *   POSSIBLE — structurally valid but with weak or MISSING metrics. Missing
 *              data is never read as zero performance.
 *   REJECTED — structurally invalid / incoherent / provably useless.
 *
 * Only REJECTED candidates are discarded before persistence.
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

export type DiscoveryTier = "strong" | "possible" | "rejected";

export type DiscoveryRejectionReason =
  | "missing_identity"
  | "missing_link"
  | "invalid_data"
  | "no_commercial_signal";

export const REJECTION_LABELS: Record<DiscoveryRejectionReason, string> = {
  missing_identity: "sem identificação mínima",
  missing_link: "sem URL nem imagem",
  invalid_data: "dados comerciais inválidos",
  no_commercial_signal: "sem nenhum sinal comercial",
};

export interface DiscoveryClassification {
  tier: DiscoveryTier;
  /** Present only when tier === "rejected". */
  reason?: DiscoveryRejectionReason;
  /** Human-readable explanation, used in logs and diagnostics. */
  detail: string;
}

/** Candidate shape the classifier depends on — never the full provider payload. */
export type QualityCandidate = Pick<
  NormalizedProduct,
  "soldCount" | "reviewCount"
> &
  Partial<Pick<NormalizedProduct, "id" | "name" | "sourceProductId" | "productUrl" | "thumbnail" | "price" | "rating">>;

/** Accepts numbers and numeric strings; anything else stays null (unknown). */
function metric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function classifyProduct(
  product: QualityCandidate,
  rule: DiscoveryQualityRule = DEFAULT_QUALITY_RULE,
): DiscoveryClassification {
  const identity = text(product.sourceProductId) ?? text(product.id);
  const name = text(product.name);
  if (!identity || !name) {
    return {
      tier: "rejected",
      reason: "missing_identity",
      detail: `identity=${identity ?? "null"} name=${name ? "ok" : "null"}`,
    };
  }

  if (!text(product.productUrl) && !text(product.thumbnail)) {
    return { tier: "rejected", reason: "missing_link", detail: "productUrl=null thumbnail=null" };
  }

  const sold = metric(product.soldCount);
  const reviews = metric(product.reviewCount);
  const price = metric(product.price);
  const rating = metric(product.rating);

  if (
    (price !== null && price < 0) ||
    (sold !== null && sold < 0) ||
    (reviews !== null && reviews < 0) ||
    (rating !== null && (rating < 0 || rating > 5))
  ) {
    return {
      tier: "rejected",
      reason: "invalid_data",
      detail: `price=${price} sold=${sold} reviews=${reviews} rating=${rating}`,
    };
  }

  if (sold !== null && sold >= rule.minSoldCount) {
    return { tier: "strong", detail: `soldCount=${sold} >= ${rule.minSoldCount}` };
  }
  if (reviews !== null && reviews >= rule.minReviewCount) {
    return { tier: "strong", detail: `reviewCount=${reviews} >= ${rule.minReviewCount}` };
  }

  // Explicit zeros on BOTH metrics (not missing data) = provably no traction.
  if (sold === 0 && reviews === 0) {
    return {
      tier: "rejected",
      reason: "no_commercial_signal",
      detail: "soldCount=0 e reviewCount=0 (valores explícitos)",
    };
  }

  return {
    tier: "possible",
    detail: `soldCount=${sold ?? "null"} reviewCount=${reviews ?? "null"} (abaixo do corte ou ausente)`,
  };
}

/** Backwards-compatible boolean cut: only STRONG counts as "qualified". */
export function qualifies(
  product: QualityCandidate,
  rule: DiscoveryQualityRule = DEFAULT_QUALITY_RULE,
): boolean {
  return classifyProduct({ name: "x", id: "x", productUrl: "x", ...product }, rule).tier === "strong";
}

export interface QualitySplit<T> {
  /** Commercially strong candidates, kept first. */
  strong: T[];
  /** Valid candidates with weak/missing metrics — discovery fallback. */
  possible: T[];
  /** Discarded before persistence. */
  rejected: { item: T; reason: DiscoveryRejectionReason; detail: string }[];
  /** strong + possible, STRONG first — what actually gets persisted. */
  accepted: T[];
  /** Aggregated discard reasons for observability. */
  reasons: { reason: DiscoveryRejectionReason; label: string; count: number }[];
}

export function splitByQuality<T extends QualityCandidate>(
  items: T[],
  rule: DiscoveryQualityRule = DEFAULT_QUALITY_RULE,
): QualitySplit<T> {
  const strong: T[] = [];
  const possible: T[] = [];
  const rejected: { item: T; reason: DiscoveryRejectionReason; detail: string }[] = [];
  const counts = new Map<DiscoveryRejectionReason, number>();

  for (const item of items) {
    const result = classifyProduct(item, rule);
    if (result.tier === "strong") strong.push(item);
    else if (result.tier === "possible") possible.push(item);
    else {
      const reason = result.reason ?? "invalid_data";
      rejected.push({ item, reason, detail: result.detail });
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }

  return {
    strong,
    possible,
    rejected,
    accepted: [...strong, ...possible],
    reasons: [...counts.entries()].map(([reason, count]) => ({
      reason,
      label: REJECTION_LABELS[reason],
      count,
    })),
  };
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
