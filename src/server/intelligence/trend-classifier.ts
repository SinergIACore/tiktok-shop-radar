/**
 * Deterministic trend classification (Stage 02C.1).
 * Conservative by design — no forecast, no probability, no Viral Score.
 */

import type { TrendEvidence, TrendStatus } from "./trend-types";

export interface ClassifierInput {
  /** Sold delta of the most recent interval. */
  delta: number | null;
  /** Velocity of the most recent valid interval. */
  velocityCurrent: number | null;
  /** Velocity of the interval before it. */
  velocityPrevious: number | null;
  acceleration: number | null;
}

/**
 * Rules (evaluated in this order):
 *  insufficient_data — no valid sales interval (single snapshot, missing
 *                      soldCount, or timeDeltaHours <= 0).
 *  accelerating      — velocityCurrent > 0 AND acceleration > 0 (needs 3+ valid snapshots).
 *  decelerating      — velocityCurrent >= 0 AND acceleration < 0 (needs 3+ valid snapshots).
 *  declining         — delta < 0 (the OBSERVED counter went down).
 *  growing           — delta > 0 AND velocityCurrent > 0.
 *  stable            — delta = 0.
 */
export function classifyTrend(input: ClassifierInput): TrendStatus {
  const { delta, velocityCurrent, acceleration } = input;

  if (delta === null || velocityCurrent === null) return "insufficient_data";

  if (acceleration !== null) {
    if (velocityCurrent > 0 && acceleration > 0) return "accelerating";
    if (velocityCurrent >= 0 && acceleration < 0) return "decelerating";
  }

  if (delta < 0) return "declining";
  if (delta > 0 && velocityCurrent > 0) return "growing";
  if (delta === 0) return "stable";

  return "insufficient_data";
}

/**
 * Evidence level = quantity/quality of valid observations. NOT a probability.
 * Valid snapshots = snapshots that take part in at least one valid sales
 * interval (timeDeltaHours > 0 and soldCount known on both ends).
 */
export function classifyEvidence(validSnapshots: number): TrendEvidence {
  if (validSnapshots >= 6) return "high";
  if (validSnapshots >= 3) return "medium";
  return "low";
}
