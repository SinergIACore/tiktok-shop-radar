/**
 * Stage 02C.1 — Historical trend engine types.
 *
 * This layer is PURE: no fetch, no database, no `pg`, no writes.
 * It only interprets a chronological list of persisted snapshots.
 *
 * It answers "what happened between the available observations?" —
 * never "what will happen?". There is no Viral Score and no forecast here.
 */

import type { MetricSnapshot } from "../metrics/product-metrics";

export type { MetricSnapshot };

/** Direction of a single observable signal. */
export type SignalDirection = "positive" | "neutral" | "negative" | "unknown";

/**
 * Observed trend status. Conservative by construction.
 * "declining" means the OBSERVED sold counter decreased — it does not
 * necessarily mean real negative demand (providers may correct values).
 */
export type TrendStatus =
  | "insufficient_data"
  | "accelerating"
  | "growing"
  | "stable"
  | "decelerating"
  | "declining";

/**
 * Quality/quantity of the available evidence. NOT a probability and NOT a
 * confidence score: it only describes how many valid observations exist.
 */
export type TrendEvidence = "low" | "medium" | "high";

/** One consecutive pair of snapshots. */
export interface TrendInterval {
  fromObservedAt: string;
  toObservedAt: string;
  timeDeltaHours: number | null;
  soldCountDelta: number | null;
  salesVelocity: number | null;
  gmvDelta: number | null;
  gmvVelocity: number | null;
  reviewCountDelta: number | null;
  reviewVelocity: number | null;
  sellerVideoCountDelta: number | null;
  sellerVideoVelocity: number | null;
  /** True when timeDeltaHours > 0 and soldCountDelta is known. */
  validForSales: boolean;
}

export interface TrendSalesBlock {
  delta: number | null;
  velocity: number | null;
  previousVelocity: number | null;
  acceleration: number | null;
  velocityRatio: number | null;
  positiveIntervals: number;
  negativeIntervals: number;
  neutralIntervals: number;
  consistency: number | null;
}

export interface TrendMeasureBlock {
  delta: number | null;
  velocity: number | null;
}

export interface TrendLatest {
  observedAt: string | null;
  soldCount: number | null;
  gmv: number | null;
  reviews: number | null;
  sellerVideoCount: number | null;
  price: number | null;
}

export interface TrendSignals {
  soldCountDelta: SignalDirection;
  salesVelocity: SignalDirection;
  salesAcceleration: SignalDirection;
  gmvDelta: SignalDirection;
  gmvVelocity: SignalDirection;
  reviewCountDelta: SignalDirection;
  sellerVideoCountDelta: SignalDirection;
}

export interface ProductTrendAnalysis {
  status: TrendStatus;
  evidence: TrendEvidence;
  snapshotCount: number;
  validIntervals: number;
  latest: TrendLatest;
  sales: TrendSalesBlock;
  gmv: TrendMeasureBlock;
  reviews: TrendMeasureBlock;
  sellerVideos: TrendMeasureBlock;
  signals: TrendSignals;
  intervals: TrendInterval[];
  explanation: string;
}
