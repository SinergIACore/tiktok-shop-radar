/**
 * Pure trend metrics (Stage 02C.1).
 *
 * Definitions (all deterministic, all auditable):
 *   timeDeltaHours       = (current.observedAt - previous.observedAt) in hours
 *   salesVelocity        = soldCountDelta / timeDeltaHours          (timeDeltaHours > 0)
 *   gmvVelocity          = gmvDelta / timeDeltaHours
 *   reviewVelocity       = reviewCountDelta / timeDeltaHours
 *   sellerVideoVelocity  = sellerVideoCountDelta / timeDeltaHours
 *   salesAcceleration    = velocityCurrent - velocityPrevious  (difference between
 *                          two OBSERVED velocities, not a time-normalised
 *                          physical acceleration)
 *   velocityRatio        = velocityCurrent / velocityPrevious  (only when
 *                          velocityPrevious > 0)
 *   growthConsistency    = positiveSalesIntervals / validSalesIntervals
 *
 * NULL rules: NULL is never coerced to 0. Any operand NULL => result NULL.
 * timeDeltaHours <= 0 (zero or out-of-order) => every time-dependent metric NULL.
 */

import { delta, hoursBetween, type MetricSnapshot } from "../metrics/product-metrics";
import type { SignalDirection, TrendInterval } from "./trend-types";

/** Chronological ASC ordering. Snapshots received out of order are normalised. */
export function sortSnapshotsAsc(snapshots: MetricSnapshot[]): MetricSnapshot[] {
  return [...snapshots]
    .filter((snapshot) => Number.isFinite(new Date(snapshot.observedAt).getTime()))
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
}

/** value / hours, NULL-safe; NULL when hours <= 0. */
export function ratePerHour(value: number | null, hours: number | null): number | null {
  if (value === null || hours === null || hours <= 0) return null;
  return value / hours;
}

export function buildInterval(previous: MetricSnapshot, current: MetricSnapshot): TrendInterval {
  const timeDeltaHours = hoursBetween(current.observedAt, previous.observedAt);
  const hours = timeDeltaHours !== null && timeDeltaHours > 0 ? timeDeltaHours : null;

  const soldCountDelta = delta(current.soldCount, previous.soldCount);
  const gmvDelta = delta(current.gmvContribution, previous.gmvContribution);
  const reviewCountDelta = delta(current.reviewCount, previous.reviewCount);
  const sellerVideoCountDelta = delta(current.sellerVideoCount, previous.sellerVideoCount);

  return {
    fromObservedAt: previous.observedAt,
    toObservedAt: current.observedAt,
    timeDeltaHours,
    soldCountDelta,
    salesVelocity: ratePerHour(soldCountDelta, hours),
    gmvDelta,
    gmvVelocity: ratePerHour(gmvDelta, hours),
    reviewCountDelta,
    reviewVelocity: ratePerHour(reviewCountDelta, hours),
    sellerVideoCountDelta,
    sellerVideoVelocity: ratePerHour(sellerVideoCountDelta, hours),
    validForSales: hours !== null && soldCountDelta !== null,
  };
}

/** All consecutive intervals of an ASC-ordered snapshot list. */
export function buildIntervals(snapshots: MetricSnapshot[]): TrendInterval[] {
  const intervals: TrendInterval[] = [];
  for (let index = 1; index < snapshots.length; index += 1) {
    intervals.push(buildInterval(snapshots[index - 1]!, snapshots[index]!));
  }
  return intervals;
}

/** velocityCurrent - velocityPrevious. NULL when either velocity is NULL. */
export function salesAcceleration(
  velocityCurrent: number | null,
  velocityPrevious: number | null,
): number | null {
  if (velocityCurrent === null || velocityPrevious === null) return null;
  return velocityCurrent - velocityPrevious;
}

/** velocityCurrent / velocityPrevious. Only when velocityPrevious > 0. */
export function velocityRatio(
  velocityCurrent: number | null,
  velocityPrevious: number | null,
): number | null {
  if (velocityCurrent === null || velocityPrevious === null || velocityPrevious <= 0) return null;
  return velocityCurrent / velocityPrevious;
}

/** positiveSalesIntervals / validSalesIntervals; NULL when there is none. */
export function growthConsistency(positive: number, valid: number): number | null {
  if (valid <= 0) return null;
  return positive / valid;
}

/** No magic thresholds: sign only. */
export function signalOf(value: number | null | undefined): SignalDirection {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unknown";
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}
