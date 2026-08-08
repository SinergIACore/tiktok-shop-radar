/**
 * Pure historical metrics (Stage 02B.2).
 *
 * No percentages, no acceleration, no forecast, no Viral Score.
 * Only raw deltas between the two most recent snapshots plus a simple
 * sales velocity. Every rule is auditable and NULL-safe:
 *  - NULL is never converted to 0;
 *  - if either operand is NULL the derived metric is NULL;
 *  - timeDeltaHours <= 0 => salesVelocity NULL.
 */

export interface MetricSnapshot {
  observedAt: string;
  price: number | null;
  soldCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  sellerVideoCount: number | null;
  gmvContribution: number | null;
}

export interface ProductMetricsResult {
  soldCountDelta: number | null;
  gmvDelta: number | null;
  priceDelta: number | null;
  reviewCountDelta: number | null;
  sellerVideoCountDelta: number | null;
  timeDeltaHours: number | null;
  salesVelocity: number | null;
}

export const EMPTY_METRICS: ProductMetricsResult = {
  soldCountDelta: null,
  gmvDelta: null,
  priceDelta: null,
  reviewCountDelta: null,
  sellerVideoCountDelta: null,
  timeDeltaHours: null,
  salesVelocity: null,
};

/** Raw difference; NULL whenever one of the two values is unknown. */
export function delta(current: number | null, previous: number | null): number | null {
  if (typeof current !== "number" || typeof previous !== "number") return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return current - previous;
}

/** Hours between two ISO timestamps; NULL when either date is invalid. */
export function hoursBetween(currentIso: string, previousIso: string): number | null {
  const current = new Date(currentIso).getTime();
  const previous = new Date(previousIso).getTime();
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return (current - previous) / 3_600_000;
}

/**
 * Compute the metrics for one product.
 * `previous` null (single snapshot) => every metric is NULL.
 */
export function computeProductMetrics(
  latest: MetricSnapshot | null,
  previous: MetricSnapshot | null,
): ProductMetricsResult {
  if (!latest || !previous) return { ...EMPTY_METRICS };

  const soldCountDelta = delta(latest.soldCount, previous.soldCount);
  const timeDeltaHours = hoursBetween(latest.observedAt, previous.observedAt);

  const salesVelocity =
    soldCountDelta === null || timeDeltaHours === null || timeDeltaHours <= 0
      ? null
      : soldCountDelta / timeDeltaHours;

  return {
    soldCountDelta,
    gmvDelta: delta(latest.gmvContribution, previous.gmvContribution),
    priceDelta: delta(latest.price, previous.price),
    reviewCountDelta: delta(latest.reviewCount, previous.reviewCount),
    sellerVideoCountDelta: delta(latest.sellerVideoCount, previous.sellerVideoCount),
    timeDeltaHours,
    salesVelocity,
  };
}
