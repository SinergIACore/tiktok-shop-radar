import { describe, expect, it } from "vitest";

import { DiscoveryService } from "./discovery.service";
import { MemoryDiscoveryStore } from "./memory-discovery-store";
import {
  DEFAULT_LIMITS,
  HARD_LIMITS,
  parseLimits,
  parseMarket,
  validateQuickSearch,
  validateSearchInput,
} from "./validation";
import { DEFAULT_MARKET } from "@/config/markets";
import { DEFAULT_QUALITY_RULE, parseQualityRule, qualifies } from "./quality-filter";
import { MemoryProductStore } from "../persistence/memory-store";
import type { ProductDataProvider } from "@/services/providers/product-data/ProductDataProvider";
import {
  ProviderError,
  type NormalizedProduct,
  type ProductSearchParams,
  type ProductSearchResult,
} from "@/services/providers/product-data/types/external-product.types";

// Default fixture is commercially qualified (soldCount >= 100).
function product(id: string, soldCount = 500, reviewCount: number | null = null): NormalizedProduct {
  return {
    id,
    name: `Produto ${id}`,
    thumbnail: null,
    productUrl: null,
    category: null,
    price: 19.9,
    currency: "USD",
    soldCount,
    rating: null,
    reviewCount,
    sellerName: "Shop",
    sellerVideoCount: null,
    gmvContribution: null,
    brand: null,
    businessName: null,
    countryCode: null,
    discountPercent: null,
    commentRate: null,
    creatorCount: null,
    source: "fake",
    sourceProductId: id,
  };
}

class FakeProvider implements ProductDataProvider {
  readonly name = "fake";
  calls: ProductSearchParams[] = [];

  constructor(
    private readonly byTerm: Record<string, NormalizedProduct[] | "error">,
    private readonly configured = true,
  ) {}

  isConfigured(): boolean {
    return this.configured;
  }

  async searchProducts(params: ProductSearchParams): Promise<ProductSearchResult> {
    this.calls.push(params);
    const entry = this.byTerm[params.keyword];
    if (entry === "error") throw new ProviderError("timeout", "boom", 504);
    const items = (entry ?? []).slice(0, params.limit ?? 10);
    return {
      source: this.name,
      query: params,
      count: items.length,
      durationMs: 1,
      items,
      diagnostics: {
        requestedLimit: params.limit ?? 10,
        providerLimit: params.limit ?? 10,
        receivedCount: (entry ?? []).length,
        sort: params.sort ?? "relevance",
        market: params.country ?? null,
      },
    };
  }
}

const makeService = (provider: ProductDataProvider) => {
  const discoveryStore = new MemoryDiscoveryStore();
  const productStore = new MemoryProductStore();
  return {
    discoveryStore,
    productStore,
    service: new DiscoveryService(discoveryStore, productStore, provider),
  };
};

describe("DiscoveryService.run", () => {
  it("ingests products and records discovery origin per term", async () => {
    const provider = new FakeProvider({ dress: [product("a"), product("b")] });
    const { service, discoveryStore } = makeService(provider);

    const result = await service.run({ search: null, terms: ["dress"] }, DEFAULT_LIMITS);

    expect(result.run.termsExecuted).toBe(1);
    expect(result.run.received).toBe(2);
    expect(result.run.uniqueProducts).toBe(2);
    expect(result.run.productsCreated).toBe(2);
    expect(result.run.discoveriesCreated).toBe(2);
    const origins = await discoveryStore.listDiscoveriesForProduct(result.productIds[0]!, 10);
    expect(origins[0]?.term).toBe("dress");
  });

  it("deduplicates the same product found by two terms", async () => {
    const provider = new FakeProvider({ dress: [product("a")], gown: [product("a")] });
    const { service } = makeService(provider);

    const result = await service.run({ search: null, terms: ["dress", "gown"] }, DEFAULT_LIMITS);

    expect(result.run.received).toBe(2);
    expect(result.run.uniqueProducts).toBe(1);
    expect(result.run.productsCreated).toBe(1);
    expect(result.run.productsUpdated).toBe(1);
  });

  it("caps the number of terms and products per term", async () => {
    const provider = new FakeProvider({
      a: [product("1"), product("2"), product("3")],
      b: [product("4")],
      c: [product("5")],
    });
    const { service } = makeService(provider);

    const result = await service.run(
      { search: null, terms: ["a", "b", "c"] },
      { maxTermsPerRun: 2, maxProductsPerTerm: 1 },
    );

    expect(result.run.termsExecuted).toBe(2);
    expect(result.run.received).toBe(2);
    expect(provider.calls.every((call) => call.limit === 1)).toBe(true);
  });

  it("continues after a failing term and reports a safe message", async () => {
    const provider = new FakeProvider({ ok: [product("a")], bad: "error" });
    const { service } = makeService(provider);

    const result = await service.run({ search: null, terms: ["bad", "ok"] }, DEFAULT_LIMITS);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe("provider_timeout");
    expect(result.errors[0]?.message).not.toContain("boom");
    expect(result.run.uniqueProducts).toBe(1);
  });

  it("throws when the provider is not configured", async () => {
    const provider = new FakeProvider({ a: [product("a")] }, false);
    const { service } = makeService(provider);

    await expect(service.run({ search: null, terms: ["a"] }, DEFAULT_LIMITS)).rejects.toThrow(
      /não configurado/i,
    );
  });

  it("throws when there is no valid term", async () => {
    const provider = new FakeProvider({});
    const { service } = makeService(provider);

    await expect(service.run({ search: null, terms: ["   "] }, DEFAULT_LIMITS)).rejects.toThrow();
  });
});

describe("discovery validation", () => {
  it("clamps limits to the hard maximum and falls back to defaults", () => {
    expect(parseLimits({ maxTermsPerRun: 999, maxProductsPerTerm: 999 })).toEqual(HARD_LIMITS);
    expect(parseLimits({})).toEqual(DEFAULT_LIMITS);
    expect(parseLimits({ maxTermsPerRun: 0 }).maxTermsPerRun).toBe(1);
  });

  it("rejects a keyword search without query", () => {
    expect(() => validateSearchInput({ name: "X", type: "keyword" })).toThrow();
  });

  it("resolves niche terms from the catalog", () => {
    const input = validateSearchInput({ name: "Beleza", type: "niche", nicheKey: "beauty" });
    expect(input.terms.length).toBeGreaterThan(0);
  });
});

describe("Stage 02C.2B — efficient discovery (limits, market, commercial filter)", () => {
  it("propagates the requested limit to the provider (no implicit 50)", async () => {
    const provider = new FakeProvider({ dress: [product("a"), product("b"), product("c")] });
    const { service } = makeService(provider);

    const result = await service.run(
      { search: null, terms: ["dress"] },
      { maxTermsPerRun: 1, maxProductsPerTerm: 2 },
    );

    expect(provider.calls[0]?.limit).toBe(2);
    expect(result.diagnostics.requestedLimit).toBe(2);
    expect(result.diagnostics.providerLimit).toBe(2);
    expect(result.terms[0]?.providerLimit).toBe(2);
    expect(result.terms[0]?.receivedCount).toBe(3);
  });

  it("sends the selected market to the provider and reports it", async () => {
    const provider = new FakeProvider({ dress: [product("a")] });
    const { service } = makeService(provider);

    const result = await service.run({ search: null, terms: ["dress"] }, DEFAULT_LIMITS, {
      market: "US",
    });

    expect(provider.calls[0]?.country).toBe("US");
    expect(result.diagnostics.market).toBe("US");
  });

  it("requests best_sellers sorting at the source by default", async () => {
    const provider = new FakeProvider({ dress: [product("a")] });
    const { service } = makeService(provider);

    const result = await service.run({ search: null, terms: ["dress"] }, DEFAULT_LIMITS);

    expect(provider.calls[0]?.sort).toBe("best_sellers");
    expect(result.diagnostics.sort).toBe("best_sellers");
  });

  it("discards weak candidates before persistence", async () => {
    const provider = new FakeProvider({
      dress: [product("strong", 500), product("weak", 3), product("byReviews", 2, 40)],
    });
    const { service } = makeService(provider);

    const result = await service.run({ search: null, terms: ["dress"] }, DEFAULT_LIMITS);

    expect(result.run.received).toBe(3);
    expect(result.run.qualified).toBe(2);
    expect(result.run.discarded).toBe(1);
    expect(result.run.productsCreated).toBe(2);
    expect(result.run.discoveriesCreated).toBe(2);
  });

  it("does not create products or discoveries when everything is discarded", async () => {
    const provider = new FakeProvider({ dress: [product("weak", 1), product("weak2", 2)] });
    const { service } = makeService(provider);

    const result = await service.run({ search: null, terms: ["dress"] }, DEFAULT_LIMITS);

    expect(result.run.discarded).toBe(2);
    expect(result.run.qualified).toBe(0);
    expect(result.run.productsCreated).toBe(0);
    expect(result.run.discoveriesCreated).toBe(0);
    expect(result.productIds).toHaveLength(0);
  });

  it("honors a custom quality rule", async () => {
    const provider = new FakeProvider({ dress: [product("a", 5), product("b", 50)] });
    const { service } = makeService(provider);

    const result = await service.run({ search: null, terms: ["dress"] }, DEFAULT_LIMITS, {
      quality: { minSoldCount: 10, minReviewCount: 999 },
    });

    expect(result.run.qualified).toBe(1);
    expect(result.run.discarded).toBe(1);
  });

  it("never leaks provider credentials in diagnostics", async () => {
    const provider = new FakeProvider({ dress: [product("a")] });
    const { service } = makeService(provider);
    const result = await service.run({ search: null, terms: ["dress"] }, DEFAULT_LIMITS);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/token|apify_api|Bearer/i);
  });
});

describe("Stage 02C.2B — market validation and quality rule parsing", () => {
  it("accepts only markets supported by the Actor", () => {
    expect(parseMarket("us")).toBe("US");
    expect(parseMarket(undefined)).toBe(DEFAULT_MARKET);
    expect(() => parseMarket("BR")).toThrow(/não suportado/i);
  });

  it("persists the market in a saved search input", () => {
    const input = validateSearchInput({
      name: "Vestidos",
      type: "keyword",
      query: "women dress",
      market: "US",
    });
    expect(input.market).toBe("US");
    expect(validateQuickSearch({ type: "keyword", query: "x" }).market).toBe(DEFAULT_MARKET);
  });

  it("defaults and clamps the commercial quality rule", () => {
    expect(parseQualityRule(undefined)).toEqual(DEFAULT_QUALITY_RULE);
    expect(parseQualityRule({ minSoldCount: -5, minReviewCount: "12" })).toEqual({
      minSoldCount: 0,
      minReviewCount: 12,
    });
    expect(qualifies({ soldCount: 100, reviewCount: null })).toBe(true);
    expect(qualifies({ soldCount: null, reviewCount: 20 })).toBe(true);
    expect(qualifies({ soldCount: 99, reviewCount: 19 })).toBe(false);
  });
});
