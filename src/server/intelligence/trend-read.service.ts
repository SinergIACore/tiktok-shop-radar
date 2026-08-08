/**
 * Trend read service (Stage 02C.1).
 *
 * Orchestration only: it asks the READ repository for histories (bulk, no N+1)
 * and delegates every calculation to the pure trend engine. It never writes,
 * never calls a provider and never imports a database driver.
 */

import type { ProductReadRepository, ProductWithMetrics } from "../read/types";
import type { StoredSnapshot } from "../persistence/types";
import type { MetricSnapshot } from "../metrics/product-metrics";
import { analyzeProductTrend } from "./trend-engine";
import type { ProductTrendAnalysis, TrendStatus } from "./trend-types";

export const DEFAULT_HISTORY_LIMIT = 20;
export const DEFAULT_TREND_LIMIT = 25;
export const MAX_TREND_LIMIT = 100;

export interface TrendListQuery {
  limit: number;
  historyLimit: number;
  status: TrendStatus | null;
  minSnapshots: number | null;
}

export interface ProductTrendItem {
  id: string;
  source: string;
  sourceProductId: string;
  name: string | null;
  thumbnail: string | null;
  productUrl: string | null;
  sellerName: string | null;
  currency: string | null;
  lastSeenAt: string;
  snapshotCount: number;
  trend: ProductTrendAnalysis;
}

const VALID_STATUS: TrendStatus[] = [
  "insufficient_data",
  "accelerating",
  "growing",
  "stable",
  "decelerating",
  "declining",
];

export function parseTrendQuery(params: URLSearchParams): TrendListQuery {
  const asInt = (raw: string | null): number | null => {
    if (raw === null || raw.trim() === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  };

  const limit = asInt(params.get("limit")) ?? DEFAULT_TREND_LIMIT;
  const historyLimit = asInt(params.get("historyLimit")) ?? DEFAULT_HISTORY_LIMIT;
  const statusRaw = params.get("status");
  const status = VALID_STATUS.find((value) => value === statusRaw) ?? null;

  return {
    limit: Math.min(Math.max(limit, 1), MAX_TREND_LIMIT),
    historyLimit: Math.min(Math.max(historyLimit, 2), 200),
    status,
    minSnapshots: asInt(params.get("minSnapshots")),
  };
}

export function toMetricSnapshots(snapshots: StoredSnapshot[]): MetricSnapshot[] {
  return snapshots.map((snapshot) => ({
    observedAt: snapshot.observedAt,
    price: snapshot.price,
    soldCount: snapshot.soldCount,
    rating: snapshot.rating,
    reviewCount: snapshot.reviewCount,
    sellerVideoCount: snapshot.sellerVideoCount,
    gmvContribution: snapshot.gmvContribution,
  }));
}

function toItem(product: ProductWithMetrics, snapshots: StoredSnapshot[]): ProductTrendItem {
  return {
    id: product.id,
    source: product.source,
    sourceProductId: product.sourceProductId,
    name: product.name,
    thumbnail: product.thumbnail,
    productUrl: product.productUrl,
    sellerName: product.sellerName,
    currency: product.currency,
    lastSeenAt: product.lastSeenAt,
    snapshotCount: snapshots.length,
    trend: analyzeProductTrend(toMetricSnapshots(snapshots)),
  };
}

export class TrendReadService {
  constructor(private readonly repository: ProductReadRepository) {}

  get store(): string {
    return this.repository.name;
  }

  async list(query: TrendListQuery): Promise<ProductTrendItem[]> {
    const products = await this.repository.listProductsWithMetrics(query.limit);
    const histories = await this.repository.listHistoriesForProducts(
      products.map((product) => product.id),
      query.historyLimit,
    );

    let items = products.map((product) => toItem(product, histories[product.id] ?? []));

    if (query.minSnapshots !== null) {
      items = items.filter((item) => item.snapshotCount >= query.minSnapshots!);
    }
    if (query.status) {
      items = items.filter((item) => item.trend.status === query.status);
    }
    return items;
  }

  async getOne(
    productId: string,
    historyLimit = DEFAULT_HISTORY_LIMIT,
  ): Promise<{ item: ProductTrendItem; snapshots: StoredSnapshot[] } | null> {
    const product = await this.repository.getProductWithMetrics(productId);
    if (!product) return null;
    const all = await this.repository.listHistory(productId);
    const snapshots = all.slice(Math.max(0, all.length - historyLimit));
    return { item: toItem(product, snapshots), snapshots };
  }
}
