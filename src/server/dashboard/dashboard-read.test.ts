import { describe, expect, it, vi } from "vitest";

import { MemoryProductStore } from "../persistence/memory-store";
import { MemoryProductReadRepository } from "../read/memory-read-repository";
import { DashboardReadService } from "./dashboard-read.service";
import type { ProductReadRepository } from "../read/types";

const HOUR = 60 * 60 * 1000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

interface SeedSnapshot {
  observedAt: string;
  soldCount?: number | null;
  gmvContribution?: number | null;
  price?: number | null;
}

async function seed(
  entries: { sourceProductId: string; name: string; snapshots: SeedSnapshot[] }[],
) {
  const store = new MemoryProductStore();
  for (const entry of entries) {
    for (const snapshot of entry.snapshots) {
      await store.ingest(
        {
          source: "tiktok_shop",
          sourceProductId: entry.sourceProductId,
          name: entry.name,
          thumbnail: null,
          productUrl: null,
          category: null,
          currency: "BRL",
          sellerName: null,
          brand: null,
          businessName: null,
          countryCode: null,
        },
        {
          observedAt: snapshot.observedAt,
          price: snapshot.price ?? null,
          soldCount: snapshot.soldCount ?? null,
          rating: null,
          reviewCount: null,
          sellerVideoCount: null,
          gmvContribution: snapshot.gmvContribution ?? null,
          discountPercent: null,
          commentRate: null,
        },
        0,
      );
    }
  }
  return new MemoryProductReadRepository(store);
}

const BASE = [
  {
    sourceProductId: "a",
    name: "Produto A",
    snapshots: [
      { observedAt: iso(-6 * HOUR), soldCount: 100, gmvContribution: 1000 },
      { observedAt: iso(-1 * HOUR), soldCount: 180, gmvContribution: 1800 },
    ],
  },
  {
    sourceProductId: "b",
    name: "Produto B",
    snapshots: [
      { observedAt: iso(-5 * HOUR), soldCount: 300, gmvContribution: 500 },
      { observedAt: iso(-2 * HOUR), soldCount: 310, gmvContribution: 5000 },
    ],
  },
  {
    sourceProductId: "c",
    name: "Produto C (sem histórico)",
    snapshots: [{ observedAt: iso(-30 * HOUR), soldCount: 900, gmvContribution: null }],
  },
];

describe("DashboardReadService", () => {
  it("A/B/C/D — summary counts and last observation", async () => {
    const repository = await seed(BASE);
    const data = await new DashboardReadService(repository).load();

    expect(data.store).toBe("memory");
    expect(data.summary.productsMonitored).toBe(3);
    expect(data.summary.productsWithHistory).toBe(2);
    expect(data.summary.snapshotsCollected).toBe(5);
    expect(data.summary.lastObservationAt).toBe(BASE[0]!.snapshots[1]!.observedAt);
  });

  it("E/F — 24h windows for new products and snapshots", async () => {
    const repository = await seed(BASE);
    const summary = await repository.getDashboardSummary();

    // Memory store stamps firstSeenAt with "now", so all products are new.
    expect(summary.newProducts24h).toBe(3);
    // Product C's only snapshot is 30h old and must be excluded.
    expect(summary.snapshots24h).toBe(4);
  });

  it("G — most sold sorted descending", async () => {
    const data = await new DashboardReadService(await seed(BASE)).load();
    expect(data.mostSold.map((item) => item.name)).toEqual([
      "Produto C (sem histórico)",
      "Produto B",
      "Produto A",
    ]);
  });

  it("H — highest GMV sorted descending", async () => {
    const data = await new DashboardReadService(await seed(BASE)).load();
    expect(data.highestGmv[0]?.name).toBe("Produto B");
    expect(data.highestGmv[1]?.name).toBe("Produto A");
  });

  it("I/J — sold delta ranking excludes products without history", async () => {
    const data = await new DashboardReadService(await seed(BASE)).load();
    expect(data.biggestSoldDelta.map((item) => item.name)).toEqual(["Produto A", "Produto B"]);
    expect(data.biggestSoldDelta.every((item) => item.snapshotCount >= 2)).toBe(true);
  });

  it("K — null stays null, never zero", async () => {
    const data = await new DashboardReadService(await seed(BASE)).load();
    const withoutHistory = data.mostSold.find((item) => item.sourceProductId === "c");
    expect(withoutHistory?.latest?.gmvContribution).toBeNull();
    expect(withoutHistory?.metrics.soldCountDelta).toBeNull();
  });

  it("recently observed sorted by latest observation", async () => {
    const data = await new DashboardReadService(await seed(BASE)).load();
    expect(data.recentlyObserved[0]?.name).toBe("Produto A");
  });

  it("L/M — never calls a provider and never writes", async () => {
    const repository = await seed(BASE);
    const spy: ProductReadRepository & { calls: string[] } = {
      calls: [],
      name: repository.name,
      listProductsWithMetrics: (limit) => {
        spy.calls.push("listProductsWithMetrics");
        return repository.listProductsWithMetrics(limit);
      },
      listProductsByIds: (ids) => {
        spy.calls.push("listProductsByIds");
        return repository.listProductsByIds(ids);
      },
      listProductsPage: (query) => {
        spy.calls.push("listProductsPage");
        return repository.listProductsPage(query);
      },
      getProductWithMetrics: (id) => {
        spy.calls.push("getProductWithMetrics");
        return repository.getProductWithMetrics(id);
      },
      listHistory: (id) => {
        spy.calls.push("listHistory");
        return repository.listHistory(id);
      },
      listHistoriesForProducts: (ids, historyLimit) => {
        spy.calls.push("listHistoriesForProducts");
        return repository.listHistoriesForProducts(ids, historyLimit);
      },
      getDashboardSummary: () => {
        spy.calls.push("getDashboardSummary");
        return repository.getDashboardSummary();
      },
    };

    await new DashboardReadService(spy).load();

    // Only read methods; no ingestion/history/provider access.
    expect(new Set(spy.calls)).toEqual(new Set(["getDashboardSummary", "listProductsPage"]));
    expect(spy.calls).not.toContain("listHistory");
  });

  it("N — repository failure propagates instead of falling back to mocks", async () => {
    const failing = {
      name: "postgres",
      listProductsWithMetrics: vi.fn(),
      listProductsPage: vi.fn(),
      getProductWithMetrics: vi.fn(),
      listHistory: vi.fn(),
      getDashboardSummary: vi.fn(async () => {
        throw new Error("database_error");
      }),
    } as unknown as ProductReadRepository;

    await expect(new DashboardReadService(failing).load()).rejects.toThrow("database_error");
  });

  it("O — every listed product exposes an id usable by /products/:id", async () => {
    const data = await new DashboardReadService(await seed(BASE)).load();
    const all = [
      ...data.mostSold,
      ...data.highestGmv,
      ...data.biggestSoldDelta,
      ...data.recentlyObserved,
    ];
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((item) => typeof item.id === "string" && item.id.length > 0)).toBe(true);
  });

  it("lists are bounded", async () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      sourceProductId: `p${index}`,
      name: `Produto ${index}`,
      snapshots: [{ observedAt: iso(-index * HOUR), soldCount: index }],
    }));
    const data = await new DashboardReadService(await seed(many)).load();
    expect(data.mostSold.length).toBe(6);
  });
});
