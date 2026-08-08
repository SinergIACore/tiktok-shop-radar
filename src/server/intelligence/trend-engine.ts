/**
 * Trend engine entry point (Stage 02C.1).
 *
 * PURE: no fetch, no database access, no `pg` import, no writes.
 * Input: chronological snapshots of ONE product (order is normalised ASC).
 */

import type { MetricSnapshot } from "../metrics/product-metrics";
import { classifyEvidence, classifyTrend } from "./trend-classifier";
import { explainTrend } from "./trend-explanation";
import {
  buildIntervals,
  growthConsistency,
  salesAcceleration,
  signalOf,
  sortSnapshotsAsc,
  velocityRatio,
} from "./trend-metrics";
import type { ProductTrendAnalysis, TrendInterval } from "./trend-types";

export * from "./trend-types";
export {
  buildIntervals,
  buildInterval,
  growthConsistency,
  ratePerHour,
  salesAcceleration,
  signalOf,
  sortSnapshotsAsc,
  velocityRatio,
} from "./trend-metrics";
export { classifyEvidence, classifyTrend } from "./trend-classifier";
export { explainTrend } from "./trend-explanation";

const EMPTY_LATEST = {
  observedAt: null,
  soldCount: null,
  gmv: null,
  reviews: null,
  sellerVideoCount: null,
  price: null,
};

export function analyzeProductTrend(input: MetricSnapshot[]): ProductTrendAnalysis {
  const snapshots = sortSnapshotsAsc(input);
  const intervals: TrendInterval[] = buildIntervals(snapshots);
  const last = snapshots[snapshots.length - 1] ?? null;

  const latest = last
    ? {
        observedAt: last.observedAt,
        soldCount: last.soldCount,
        gmv: last.gmvContribution,
        reviews: last.reviewCount,
        sellerVideoCount: last.sellerVideoCount,
        price: last.price,
      }
    : { ...EMPTY_LATEST };

  const lastInterval = intervals[intervals.length - 1] ?? null;
  const previousInterval = intervals[intervals.length - 2] ?? null;

  const velocityCurrent = lastInterval?.salesVelocity ?? null;
  const velocityPrevious = previousInterval?.salesVelocity ?? null;
  const acceleration = salesAcceleration(velocityCurrent, velocityPrevious);

  const validIntervals = intervals.filter((interval) => interval.validForSales);
  const positiveIntervals = validIntervals.filter((i) => (i.soldCountDelta ?? 0) > 0).length;
  const negativeIntervals = validIntervals.filter((i) => (i.soldCountDelta ?? 0) < 0).length;
  const neutralIntervals = validIntervals.filter((i) => i.soldCountDelta === 0).length;

  // A snapshot counts as valid evidence when it participates in a valid interval.
  const validSnapshotIndexes = new Set<number>();
  intervals.forEach((interval, index) => {
    if (interval.validForSales) {
      validSnapshotIndexes.add(index);
      validSnapshotIndexes.add(index + 1);
    }
  });

  const status = classifyTrend({
    delta: lastInterval?.soldCountDelta ?? null,
    velocityCurrent,
    velocityPrevious,
    acceleration,
  });

  const base: Omit<ProductTrendAnalysis, "explanation"> = {
    status,
    evidence: classifyEvidence(validSnapshotIndexes.size),
    snapshotCount: snapshots.length,
    validIntervals: validIntervals.length,
    latest,
    sales: {
      delta: lastInterval?.soldCountDelta ?? null,
      velocity: velocityCurrent,
      previousVelocity: velocityPrevious,
      acceleration,
      velocityRatio: velocityRatio(velocityCurrent, velocityPrevious),
      positiveIntervals,
      negativeIntervals,
      neutralIntervals,
      consistency: growthConsistency(positiveIntervals, validIntervals.length),
    },
    gmv: {
      delta: lastInterval?.gmvDelta ?? null,
      velocity: lastInterval?.gmvVelocity ?? null,
    },
    reviews: {
      delta: lastInterval?.reviewCountDelta ?? null,
      velocity: lastInterval?.reviewVelocity ?? null,
    },
    sellerVideos: {
      delta: lastInterval?.sellerVideoCountDelta ?? null,
      velocity: lastInterval?.sellerVideoVelocity ?? null,
    },
    signals: {
      soldCountDelta: signalOf(lastInterval?.soldCountDelta ?? null),
      salesVelocity: signalOf(velocityCurrent),
      salesAcceleration: signalOf(acceleration),
      gmvDelta: signalOf(lastInterval?.gmvDelta ?? null),
      gmvVelocity: signalOf(lastInterval?.gmvVelocity ?? null),
      reviewCountDelta: signalOf(lastInterval?.reviewCountDelta ?? null),
      sellerVideoCountDelta: signalOf(lastInterval?.sellerVideoCountDelta ?? null),
    },
    intervals,
  };

  return { ...base, explanation: explainTrend(base, lastInterval?.timeDeltaHours ?? null) };
}
