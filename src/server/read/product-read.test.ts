import { describe, expect, it, vi } from "vitest";

import { computeProductMetrics, delta, hoursBetween } from "@/server/metrics/product-metrics";
import { MemoryProductStore } from "@/server/persistence/memory-store";
import { MemoryProductReadRepository } from "@/server/read/memory-read-repository";
import type { MetricSnapshot } from "@/server/metrics/product-metrics";

const snap = (overrides: Partial<MetricSnapshot> & { observedAt: string }): MetricSnapshot => ({
  price: null,
  soldCount: null,
  rating: null,
  reviewCount: null,
  sellerVideoCount: null,
  gmvContribution: null,
  ...overrides,
});

const identity = (sourceProductId: string) => ({
  source: "apify",
  sourceProductId,
  name: `Produto ${sourceProductId}`,
  thumbnail: null,
  productUrl: null,
  category: null,
  currency: "USD",
  sellerName: null,
  brand: null,
  businessName: null,
  countryCode: null,
});

const observation = (observedAt: string, soldCount: number | null) => ({
  observedAt,
  price: 10,
  soldCount,
  rating: null,
  reviewCount: null,
  sellerVideoCount: null,
  gmvContribution: null,
  discountPercent: null,
  commentRate: null,
});

describe("product metrics", () => {
  it("A) 100 -> 130 sales produces delta 30", () => {
    const metrics = computeProductMetrics(
      snap({ observedAt: "2026-01-01T02:00:00.000Z", soldCount: 130 }),
      snap({ observedAt: "2026-01-01T00:00:00.000Z", soldCount: 100 }),
    );
    expect(metrics.soldCountDelta).toBe(30);
  });

  it("B) 130 -> 125 keeps the negative delta", () => {
    const metrics = computeProductMetrics(
      snap({ observedAt: "2026-01-01T02:00:00.000Z", soldCount: 125 }),
      snap({ observedAt: "2026-01-01T00:00:00.000Z", soldCount: 130 }),
    );
    expect(metrics.soldCountDelta).toBe(-5);
  });

  it("C) NULL on one snapshot yields NULL delta, never 0", () => {
    const metrics = computeProductMetrics(
      snap({ observedAt: "2026-01-01T02:00:00.000Z", soldCount: null, reviewCount: 10 }),
      snap({ observedAt: "2026-01-01T00:00:00.000Z", soldCount: 100, reviewCount: null }),
    );
    expect(metrics.soldCountDelta).toBeNull();
    expect(metrics.reviewCountDelta).toBeNull();
    expect(metrics.salesVelocity).toBeNull();
    expect(delta(null, 0)).toBeNull();
  });

  it("D) 2h interval with delta 30 gives salesVelocity 15", () => {
    const metrics = computeProductMetrics(
      snap({ observedAt: "2026-01-01T02:00:00.000Z", soldCount: 130 }),
      snap({ observedAt: "2026-01-01T00:00:00.000Z", soldCount: 100 }),
    );
    expect(metrics.timeDeltaHours).toBe(2);
    expect(metrics.salesVelocity).toBe(15);
  });

  it("E) zero interval yields NULL salesVelocity", () => {
    const metrics = computeProductMetrics(
      snap({ observedAt: "2026-01-01T00:00:00.000Z", soldCount: 130 }),
      snap({ observedAt: "2026-01-01T00:00:00.000Z", soldCount: 100 }),
    );
    expect(metrics.timeDeltaHours).toBe(0);
    expect(metrics.salesVelocity).toBeNull();
    expect(hoursBetween("2026-01-01T03:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(3);
  });

  it("computes the other raw deltas without percentages", () => {
    const metrics = computeProductMetrics(
      snap({
        observedAt: "2026-01-01T01:00:00.000Z",
        price: 57.99,
        gmvContribution: 553_862.49,
        reviewCount: 1206,
        sellerVideoCount: 3041,
      }),
      snap({
        observedAt: "2026-01-01T00:00:00.000Z",
        price: 57.99,
        gmvContribution: 553_762.49,
        reviewCount: 1200,
        sellerVideoCount: 3041,
      }),
    );
    expect(metrics.priceDelta).toBe(0);
    expect(metrics.gmvDelta).toBeCloseTo(100, 6);
    expect(metrics.reviewCountDelta).toBe(6);
    expect(metrics.sellerVideoCountDelta).toBe(0);
    expect(Object.keys(metrics)).not.toContain("growthRate");
  });
});

describe("product read repository", () => {
  it("F) a product with a single snapshot has NULL metrics", async () => {
    const store = new MemoryProductStore();
    await store.ingest(identity("single"), observation("2026-01-01T00:00:00.000Z", 100), 0);

    const repository = new MemoryProductReadRepository(store);
    const [item] = await repository.listProductsWithMetrics();
    expect(item?.snapshotCount).toBe(1);
    expect(item?.previous).toBeNull();
    expect(item?.metrics.soldCountDelta).toBeNull();
    expect(item?.metrics.salesVelocity).toBeNull();
  });

  it("G) history is ordered by observedAt ASC", async () => {
    const store = new MemoryProductStore();
    await store.ingest(identity("hist"), observation("2026-01-01T02:00:00.000Z", 130), 0);
    await store.ingest(identity("hist"), observation("2026-01-01T00:00:00.000Z", 100), 0);
    await store.ingest(identity("hist"), observation("2026-01-01T01:00:00.000Z", 120), 0);

    const repository = new MemoryProductReadRepository(store);
    const product = (await repository.listProductsWithMetrics())[0]!;
    const history = await repository.listHistory(product.id);
    expect(history.map((s) => s.observedAt)).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T01:00:00.000Z",
      "2026-01-01T02:00:00.000Z",
    ]);
    expect(product.latest?.soldCount).toBe(130);
    expect(product.previous?.soldCount).toBe(120);
    expect(product.metrics.soldCountDelta).toBe(10);
  });

  it("H) repeated ingestion of the same source id never duplicates the product", async () => {
    const store = new MemoryProductStore();
    await store.ingest(identity("dup"), observation("2026-01-01T00:00:00.000Z", 100), 0);
    await store.ingest(identity("dup"), observation("2026-01-01T01:00:00.000Z", 130), 0);

    const repository = new MemoryProductReadRepository(store);
    const items = await repository.listProductsWithMetrics();
    expect(items).toHaveLength(1);
    expect(items[0]?.snapshotCount).toBe(2);
  });

  it("I) the repository never calls the external provider and never writes", async () => {
    const store = new MemoryProductStore();
    await store.ingest(identity("read"), observation("2026-01-01T00:00:00.000Z", 100), 0);
    await store.ingest(identity("read"), observation("2026-01-01T02:00:00.000Z", 130), 0);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const ingestSpy = vi.spyOn(store, "ingest");

    const repository = new MemoryProductReadRepository(store);
    const items = await repository.listProductsWithMetrics();
    await repository.listHistory(items[0]!.id);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(ingestSpy).not.toHaveBeenCalled();
    expect(items[0]?.metrics.salesVelocity).toBe(15);

    fetchSpy.mockRestore();
    ingestSpy.mockRestore();
  });
});
