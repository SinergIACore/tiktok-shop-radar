import { describe, expect, it } from "vitest";

import { MemoryProductStore } from "@/server/persistence/memory-store";
import { MemoryProductReadRepository } from "@/server/read/memory-read-repository";
import { parseProductListQuery } from "@/server/read/list-query";
import { DEFAULT_LIST_QUERY, type ProductListQuery } from "@/server/read/types";
import { toProductListViewModel } from "@/lib/product-view-model";

const identity = (id: string, over: Partial<Record<string, string | null>> = {}) => ({
  source: "apify",
  sourceProductId: id,
  name: `Produto ${id}`,
  thumbnail: null,
  productUrl: null,
  category: "beauty",
  currency: "USD",
  sellerName: "Seller A",
  brand: null,
  businessName: null,
  countryCode: null,
  ...over,
});

const observation = (
  observedAt: string,
  over: Partial<{
    price: number | null;
    soldCount: number | null;
    rating: number | null;
    reviewCount: number | null;
    sellerVideoCount: number | null;
    gmvContribution: number | null;
  }> = {},
) => ({
  observedAt,
  price: 10,
  soldCount: 100,
  rating: 4.5,
  reviewCount: 50,
  sellerVideoCount: 5,
  gmvContribution: 1000,
  discountPercent: null,
  commentRate: null,
  ...over,
});

const query = (over: Partial<ProductListQuery> = {}): ProductListQuery => ({
  ...DEFAULT_LIST_QUERY,
  ...over,
});

async function seed() {
  const store = new MemoryProductStore();
  // p1: two snapshots, growing sales.
  await store.ingest(identity("p1"), observation("2026-01-01T00:00:00.000Z"), 0);
  await store.ingest(
    identity("p1"),
    observation("2026-01-01T02:00:00.000Z", { soldCount: 140, gmvContribution: 1400, price: 12 }),
    0,
  );
  // p2: single snapshot, other seller/category.
  await store.ingest(
    identity("p2", { sellerName: "Loja Beta", category: "home", name: "Escova mágica" }),
    observation("2026-01-02T00:00:00.000Z", {
      soldCount: 5,
      price: 99,
      reviewCount: 2,
      rating: 3.1,
      gmvContribution: 495,
    }),
    0,
  );
  // p3: nulls preserved.
  await store.ingest(
    identity("p3", { name: "Produto sem métricas" }),
    observation("2026-01-03T00:00:00.000Z", {
      soldCount: null,
      price: null,
      rating: null,
      reviewCount: null,
      gmvContribution: null,
    }),
    0,
  );
  return { store, repository: new MemoryProductReadRepository(store) };
}

describe("product list repository (Stage 02B.3)", () => {
  it("A) paginates correctly and reports total/totalPages", async () => {
    const { repository } = await seed();
    const first = await repository.listProductsPage(query({ limit: 10, page: 1 }));
    expect(first.total).toBe(3);
    expect(first.totalPages).toBe(1);

    const paged = await repository.listProductsPage(query({ limit: 10, page: 1 }));
    expect(paged.items).toHaveLength(3);
  });

  it("R) total/totalPages with limit smaller than the result set", async () => {
    const { repository } = await seed();
    const page1 = await repository.listProductsPage(query({ limit: 10, page: 1 }));
    expect(page1.total).toBe(3);

    const smaller = await repository.listProductsPage({ ...query(), limit: 10, page: 2 });
    // Only one page exists, so page is clamped back to 1.
    expect(smaller.page).toBe(1);
  });

  it("B) filters by name", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ search: "escova" }));
    expect(page.items.map((i) => i.sourceProductId)).toEqual(["p2"]);
  });

  it("C) filters by seller", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ seller: "Loja" }));
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.sellerName).toBe("Loja Beta");
  });

  it("D) filters by minPrice/maxPrice", async () => {
    const { repository } = await seed();
    expect(
      (await repository.listProductsPage(query({ minPrice: 50 }))).items.map(
        (i) => i.sourceProductId,
      ),
    ).toEqual(["p2"]);
    expect(
      (await repository.listProductsPage(query({ maxPrice: 20 }))).items.map(
        (i) => i.sourceProductId,
      ),
    ).toEqual(["p1"]);
  });

  it("E) filters by minSold", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ minSold: 100 }));
    expect(page.items.map((i) => i.sourceProductId)).toEqual(["p1"]);
  });

  it("F) filters by minReviews", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ minReviews: 10 }));
    expect(page.items.map((i) => i.sourceProductId)).toEqual(["p1"]);
  });

  it("G) filters by minRating", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ minRating: 4 }));
    expect(page.items.map((i) => i.sourceProductId)).toEqual(["p1"]);
  });

  it("H) hasHistory keeps only products with 2+ snapshots", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ hasHistory: true }));
    expect(page.items.map((i) => i.sourceProductId)).toEqual(["p1"]);
  });

  it("I) sorts by current soldCount", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ sort: "soldCount", direction: "desc" }));
    expect(page.items[0]?.sourceProductId).toBe("p1");
    // NULL sold_count always last.
    expect(page.items[page.items.length - 1]?.sourceProductId).toBe("p3");
  });

  it("J) sorts by current GMV", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ sort: "gmv", direction: "desc" }));
    expect(page.items[0]?.sourceProductId).toBe("p1");
  });

  it("K) sorts by soldCountDelta", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(
      query({ sort: "soldCountDelta", direction: "desc" }),
    );
    expect(page.items[0]?.metrics.soldCountDelta).toBe(40);
  });

  it("L) product with a single snapshot keeps NULL historical metrics", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ search: "escova" }));
    const item = page.items[0]!;
    expect(item.snapshotCount).toBe(1);
    expect(item.metrics.soldCountDelta).toBeNull();
    expect(item.metrics.salesVelocity).toBeNull();
  });

  it("M) product with 2+ snapshots exposes deltas and velocity", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ hasHistory: true }));
    const item = page.items[0]!;
    expect(item.metrics.soldCountDelta).toBe(40);
    expect(item.metrics.gmvDelta).toBe(400);
    expect(item.metrics.timeDeltaHours).toBe(2);
    expect(item.metrics.salesVelocity).toBe(20);
  });

  it("N) NULL values remain NULL, never 0", async () => {
    const { repository } = await seed();
    const page = await repository.listProductsPage(query({ search: "sem métricas" }));
    const view = toProductListViewModel(page.items[0]!);
    expect(view.latest?.soldCount).toBeNull();
    expect(view.latest?.price).toBeNull();
    expect(view.metrics.soldCountDelta).toBeNull();
  });

  it("O/P) the read path never calls the provider nor writes", async () => {
    const { store, repository } = await seed();
    const before = JSON.stringify(await store.listProducts(100));
    const snapshotsBefore = JSON.stringify(await store.listSnapshots("prd_1"));

    const readonlyRepo = new MemoryProductReadRepository({
      listProducts: store.listProducts.bind(store),
      getProduct: store.getProduct.bind(store),
      listSnapshots: store.listSnapshots.bind(store),
    });
    await readonlyRepo.listProductsPage(query());
    await repository.listProductsPage(query());

    expect(JSON.stringify(await store.listProducts(100))).toBe(before);
    expect(JSON.stringify(await store.listSnapshots("prd_1"))).toBe(snapshotsBefore);
  });

  it("Q) a database failure surfaces an error instead of mock data", async () => {
    const failing = new MemoryProductReadRepository({
      listProducts: async () => {
        throw new Error("connection refused");
      },
      getProduct: async () => null,
      listSnapshots: async () => [],
    });
    await expect(failing.listProductsPage(query())).rejects.toThrow("connection refused");
  });
});

describe("product list query parsing", () => {
  it("clamps limit to the allowed values and defaults sane", () => {
    const parsed = parseProductListQuery(new URLSearchParams("limit=999&page=0&sort=viralScore"));
    expect(parsed.limit).toBe(25);
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBe("lastObservedAt");
  });

  it("accepts the documented parameters", () => {
    const parsed = parseProductListQuery(
      new URLSearchParams(
        "page=2&limit=50&search=dress&seller=beta&category=home&minPrice=1&maxPrice=9&minSold=3&minReviews=4&minRating=4.5&hasHistory=true&sort=gmvDelta&direction=asc",
      ),
    );
    expect(parsed).toMatchObject({
      page: 2,
      limit: 50,
      search: "dress",
      seller: "beta",
      category: "home",
      minPrice: 1,
      maxPrice: 9,
      minSold: 3,
      minReviews: 4,
      minRating: 4.5,
      hasHistory: true,
      sort: "gmvDelta",
      direction: "asc",
    });
  });
});
