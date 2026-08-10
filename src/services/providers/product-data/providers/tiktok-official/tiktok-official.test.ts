import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { normalizeOfficialProduct } from "@/services/providers/product-data/providers/tiktok-official/normalizeOfficialProduct";
import {
  MAX_PAGE_SIZE,
  TikTokShopOfficialProvider,
} from "@/services/providers/product-data/providers/tiktok-official/TikTokShopOfficialProvider";
import {
  getDiscoveryProviderId,
  getProductDataProvider,
} from "@/services/providers/product-data/index.server";
import { ProviderError } from "@/services/providers/product-data/types/external-product.types";
import { encryptToken, decryptToken } from "@/server/tiktok/token-crypto";

/** Amostra fiel aos campos documentados oficialmente. */
const officialItem = {
  shop: { name: "Loja Brasil Oficial" },
  id: "1729543210",
  has_inventory: true,
  units_sold: 1234,
  title: "Vestido feminino midi",
  sale_region: "BR",
  main_image_url: "https://cdn.example/img.jpg",
  detail_link: "https://shop.tiktok.com/view/product/1729543210",
  original_price: { amount: "129.90", currency: "BRL" },
  sales_price: { amount: "89.90", currency: "BRL" },
  category_chains: [{ local_name: "Moda" }, { local_name: "Vestidos" }],
  commission: { rate: 12.5, currency: "BRL", amount: { amount: "11.24", currency: "BRL" } },
  shop_ads_commission: 3,
};

function setCredentials() {
  process.env["TIKTOK_SHOP_APP_KEY"] = "app-key";
  process.env["TIKTOK_SHOP_APP_SECRET"] = "app-secret";
  process.env["TIKTOK_SHOP_REDIRECT_URI"] =
    "https://tikradar.sinergia.club/api/auth/tiktok/callback";
  process.env["TIKTOK_TOKEN_ENCRYPTION_KEY"] = "chave-de-teste-forte";
}

function clearCredentials() {
  delete process.env["TIKTOK_SHOP_APP_KEY"];
  delete process.env["TIKTOK_SHOP_APP_SECRET"];
  delete process.env["TIKTOK_SHOP_REDIRECT_URI"];
  delete process.env["TIKTOK_TOKEN_ENCRYPTION_KEY"];
  delete process.env["DISCOVERY_PROVIDER"];
}

describe("normalização do produto oficial", () => {
  const product = normalizeOfficialProduct(officialItem, 0);

  it("A. mapeia identidade e origem", () => {
    expect(product.id).toBe("1729543210");
    expect(product.sourceProductId).toBe("1729543210");
    expect(product.source).toBe("tiktok_official");
    expect(product.name).toBe("Vestido feminino midi");
    expect(product.productUrl).toContain("1729543210");
    expect(product.category).toBe("Moda > Vestidos");
    expect(product.sellerName).toBe("Loja Brasil Oficial");
  });

  it("B. units_sold vira soldCount", () => {
    expect(product.soldCount).toBe(1234);
  });

  it("C. sale_region é preservado (mercado BR)", () => {
    expect(product.saleRegion).toBe("BR");
    expect(product.countryCode).toBe("BR");
  });

  it("D. preços de venda e original", () => {
    expect(product.price).toBe(89.9);
    expect(product.originalPrice).toBe(129.9);
    expect(product.currency).toBe("BRL");
  });

  it("E. comissão", () => {
    expect(product.commissionRate).toBe(12.5);
    expect(product.commissionAmount).toBe(11.24);
    expect(product.commissionCurrency).toBe("BRL");
    expect(product.shopAdsCommission).toBe(3);
  });

  it("F. campos ausentes continuam null (NULL nunca vira zero)", () => {
    const sparse = normalizeOfficialProduct({ id: "9", title: "Só título" }, 0);
    expect(sparse.soldCount).toBeNull();
    expect(sparse.price).toBeNull();
    expect(sparse.originalPrice).toBeNull();
    expect(sparse.commissionRate).toBeNull();
    expect(sparse.commissionAmount).toBeNull();
    expect(sparse.saleRegion).toBeNull();
    expect(sparse.rating).toBeNull();
    expect(sparse.reviewCount).toBeNull();
    expect(sparse.hasInventory).toBeNull();
  });
});

describe("provider oficial — limites e autorização", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    setCredentials();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearCredentials();
  });

  it("G. pageSize nunca ultrapassa 5", async () => {
    expect(MAX_PAGE_SIZE).toBe(5);
    const provider = new TikTokShopOfficialProvider();
    // Sem autorização persistida a chamada para antes de qualquer fetch,
    // por isso o limite é verificado no payload do teste H (mock autorizado).
    await expect(
      provider.searchOpenCollaboration({ keywords: ["vestido"], pageSize: 50 }),
    ).rejects.toBeInstanceOf(ProviderError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("I. sem token persistido devolve not_configured", async () => {
    const provider = new TikTokShopOfficialProvider();
    await expect(
      provider.searchOpenCollaboration({ keywords: ["vestido"] }),
    ).rejects.toMatchObject({ code: "not_configured", status: 503 });
  });

  it("H. erro de autorização é propagado como 401", async () => {
    const { MemoryTikTokAuthorizationStore } = await import("@/server/tiktok/authorization-store");
    const store = new MemoryTikTokAuthorizationStore();
    await store.save({
      authorizationType: "creator_affiliate",
      market: "BR",
      accessToken: "token-secreto",
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      openId: "open-1",
      userType: 1,
      grantedScopes: ["creator.affiliate.info"],
    });
    const provider = new TikTokShopOfficialProvider();
    vi.spyOn(
      await import("@/server/tiktok/index.server"),
      "getTikTokAuthorizationStore",
    ).mockResolvedValue(store);

    fetchMock.mockResolvedValue(new Response("unauthorized", { status: 401 }));
    await expect(
      provider.searchOpenCollaboration({ keywords: ["vestido"], pageSize: 50 }),
    ).rejects.toMatchObject({ status: 401 });

    const sentBody = JSON.parse(String(fetchMock.mock.calls[0]![1].body));
    expect(sentBody.page_size).toBe(MAX_PAGE_SIZE);
    vi.restoreAllMocks();
  });

  it("sem credenciais o provider não é considerado configurado", () => {
    clearCredentials();
    expect(new TikTokShopOfficialProvider().isConfigured()).toBe(false);
  });
});

describe("seleção de provider (feature flag)", () => {
  afterEach(() => clearCredentials());

  it("J. provider atual continua sendo o padrão", () => {
    delete process.env["DISCOVERY_PROVIDER"];
    expect(getDiscoveryProviderId()).toBe("apify");
    expect(getProductDataProvider().name).toBe("apify");
  });

  it("K. nenhuma chamada TikTok ocorre quando o oficial não está selecionado", async () => {
    delete process.env["DISCOVERY_PROVIDER"];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const provider = getProductDataProvider();
    expect(provider.name).toBe("apify");
    await expect(provider.searchProducts({ keyword: "x" })).rejects.toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("seleciona o oficial apenas com opt-in explícito", () => {
    process.env["DISCOVERY_PROVIDER"] = "tiktok_official";
    expect(getProductDataProvider().name).toBe("tiktok_official");
  });
});

describe("segurança de credenciais", () => {
  it("tokens são cifrados em repouso e recuperáveis", () => {
    setCredentials();
    const encrypted = encryptToken("token-secreto");
    expect(encrypted).not.toContain("token-secreto");
    expect(decryptToken(encrypted)).toBe("token-secreto");
    clearCredentials();
  });

  it("L. nenhuma variável TikTok é exposta com prefixo VITE_ nem importada por código de UI", () => {
    const root = join(process.cwd(), "src");
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(full)) continue;
        if (full.endsWith(".test.ts") || full.endsWith("routeTree.gen.ts")) continue;
        const content = readFileSync(full, "utf8");
        if (/VITE_TIKTOK/.test(content)) offenders.push(`${full}: VITE_TIKTOK`);

        const isServerRoute = full.includes(join("routes", "api"));
        const isServerModule =
          full.includes(join("src", "server")) ||
          full.includes(join("providers", "tiktok-official")) ||
          full.endsWith(".server.ts");
        if (isServerRoute || isServerModule) continue;

        if (/tiktok-official|server\/tiktok/.test(content)) {
          offenders.push(`${full}: importa módulo server-only do TikTok`);
        }
      }
    };

    walk(root);
    expect(offenders).toEqual([]);
  });
});
