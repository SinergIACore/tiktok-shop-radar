import { describe, expect, it } from "vitest";

import { MemoryProductStore } from "@/server/persistence/memory-store";
import { soldCountDelta } from "@/server/persistence/snapshot-rules";
import { ProductIngestionService } from "@/server/ingestion/product-ingestion.service";
import type { NormalizedProduct } from "@/services/providers/product-data/types/external-product.types";

/** Mocked provider output — no real Apify call happens in tests. */
function product(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    id: "123456",
    name: "Produto X",
    thumbnail: "https://cdn.example/img.jpg",
    productUrl: "https://shop.example/123456",
    category: "fashion",
    price: 57.99,
    currency: "USD",
    soldCount: 9548,
    rating: 4.7,
    reviewCount: 1200,
    sellerName: "Loja Y",
    sellerVideoCount: 3041,
    gmvContribution: 553688.52,
    brand: null,
    businessName: null,
    countryCode: "US",
    discountPercent: null,
    commentRate: null,
    creatorCount: null,
    source: "apify",
    sourceProductId: "123456",
    ...overrides,
  };
}

const setup = (windowMs = 0) => {
  const store = new MemoryProductStore();
  return { store, service: new ProductIngestionService(store, windowMs) };
};

describe("ProductIngestionService", () => {
  it("A. cria Product + Snapshot para produto novo", async () => {
    const { store, service } = setup();
    const summary = await service.ingest([product()]);
    expect(summary).toMatchObject({
      received: 1,
      productsCreated: 1,
      productsUpdated: 0,
      snapshotsCreated: 1,
      snapshotsSkipped: 0,
    });
    const saved = await store.findProduct("apify", "123456");
    expect(saved?.name).toBe("Produto X");
    expect(await store.listSnapshots(saved!.id)).toHaveLength(1);
  });

  it("B. não duplica Product existente e F. respeita unicidade source+sourceProductId", async () => {
    const { store, service } = setup();
    await service.ingest([product()]);
    const summary = await service.ingest([product({ soldCount: 9790 })]);
    expect(summary.productsCreated).toBe(0);
    expect(summary.productsUpdated).toBe(1);
    expect(await store.listProducts()).toHaveLength(1);

    await service.ingest([product({ sourceProductId: "999", id: "999" })]);
    expect(await store.listProducts()).toHaveLength(2);
  });

  it("C. atualiza lastSeenAt em nova observação", async () => {
    const { store, service } = setup();
    await service.ingest([product()]);
    const first = await store.findProduct("apify", "123456");
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.ingest([product({ soldCount: 9600 })]);
    const second = await store.findProduct("apify", "123456");
    expect(second!.firstSeenAt).toBe(first!.firstSeenAt);
    expect(new Date(second!.lastSeenAt).getTime()).toBeGreaterThanOrEqual(
      new Date(first!.lastSeenAt).getTime(),
    );
  });

  it("D. metadata null não apaga valor válido existente", async () => {
    const { store, service } = setup();
    await service.ingest([product()]);
    await service.ingest([product({ thumbnail: null, sellerName: null, soldCount: 9600 })]);
    const saved = await store.findProduct("apify", "123456");
    expect(saved?.thumbnail).toBe("https://cdn.example/img.jpg");
    expect(saved?.sellerName).toBe("Loja Y");
  });

  it("E. snapshot preserva null (não vira zero)", async () => {
    const { store, service } = setup();
    await service.ingest([product({ reviewCount: null, gmvContribution: null })]);
    const saved = await store.findProduct("apify", "123456");
    const [snapshot] = await store.listSnapshots(saved!.id);
    expect(snapshot?.reviewCount).toBeNull();
    expect(snapshot?.gmvContribution).toBeNull();
    expect(snapshot?.rating).toBe(4.7);
  });

  it("G. histórico fica em ordem cronológica e H. soldCountDelta = 242", async () => {
    const { store, service } = setup();
    await service.ingest([product({ soldCount: 9548 })]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.ingest([product({ soldCount: 9790 })]);
    const saved = await store.findProduct("apify", "123456");
    const snapshots = await store.listSnapshots(saved!.id);
    expect(snapshots).toHaveLength(2);
    expect(new Date(snapshots[0]!.observedAt).getTime()).toBeLessThanOrEqual(
      new Date(snapshots[1]!.observedAt).getTime(),
    );
    expect(soldCountDelta(snapshots)).toBe(242);
  });

  it("I. delta null quando soldCount anterior é null", () => {
    expect(soldCountDelta([{ soldCount: null }, { soldCount: 9790 }])).toBeNull();
    expect(soldCountDelta([{ soldCount: 9790 }])).toBeNull();
  });

  it("J. retry imediato idêntico não gera snapshot duplicado", async () => {
    const { store, service } = setup(5 * 60 * 1000);
    await service.ingest([product()]);
    const retry = await service.ingest([product()]);
    expect(retry.snapshotsCreated).toBe(0);
    expect(retry.snapshotsSkipped).toBe(1);
    const saved = await store.findProduct("apify", "123456");
    expect(await store.listSnapshots(saved!.id)).toHaveLength(1);

    // mudança real dentro da janela ainda é registrada
    const changed = await service.ingest([product({ soldCount: 9790 })]);
    expect(changed.snapshotsCreated).toBe(1);
  });
});
