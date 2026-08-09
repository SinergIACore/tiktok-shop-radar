import type {
  ExternalProduct,
  NormalizedProduct,
} from "../../types/external-product.types";

/**
 * Normalização do produto oficial (Creator Search Open Collaboration Product).
 *
 * Campos oficiais confirmados na documentação:
 *   id, title, main_image_url, detail_link, units_sold, sale_region,
 *   has_inventory, original_price, sales_price, category_chains[],
 *   shop.name, commission { rate, currency, amount }, shop_ads_commission
 *
 * REGRA DO PROJETO: NULL nunca vira zero. Campo ausente permanece null.
 */

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Preços podem vir como número, string ou objeto { amount, currency }. */
function money(value: unknown): { amount: number | null; currency: string | null } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return {
      amount: asNumber(record["amount"] ?? record["value"] ?? record["price"]),
      currency: asString(record["currency"]),
    };
  }
  return { amount: asNumber(value), currency: null };
}

/** category_chains: lista de níveis; usamos o caminho completo legível. */
function categoryPath(value: unknown): string | null {
  if (!Array.isArray(value)) return asString(value);
  const parts = value
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        return asString(record["local_name"] ?? record["name"] ?? record["id"]);
      }
      return asString(entry);
    })
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" > ") : null;
}

export function normalizeOfficialProduct(
  item: ExternalProduct,
  index: number,
  includeRaw = false,
): NormalizedProduct {
  const shop = (item["shop"] ?? {}) as Record<string, unknown>;
  const commission = (item["commission"] ?? {}) as Record<string, unknown>;

  const salesPrice = money(item["sales_price"]);
  const originalPrice = money(item["original_price"]);
  const commissionAmount = money(commission["amount"]);

  const sourceProductId = asString(item["id"] ?? item["product_id"]);
  const currency =
    salesPrice.currency ??
    originalPrice.currency ??
    asString(commission["currency"]) ??
    commissionAmount.currency;

  return {
    id: sourceProductId ?? `tiktok_official-${index}`,
    name: asString(item["title"]),
    thumbnail: asString(item["main_image_url"]),
    productUrl: asString(item["detail_link"]),
    category: categoryPath(item["category_chains"]),
    price: salesPrice.amount,
    currency,
    soldCount: asNumber(item["units_sold"]),
    rating: null,
    reviewCount: null,
    sellerName: asString(shop["name"]),
    sellerVideoCount: null,
    gmvContribution: null,
    brand: null,
    businessName: asString(shop["name"]),
    countryCode: asString(item["sale_region"]),
    discountPercent: null,
    commentRate: null,
    creatorCount: null,
    source: "tiktok_official",
    sourceProductId,
    // Campos específicos do canal oficial (opcionais no modelo interno).
    saleRegion: asString(item["sale_region"]),
    originalPrice: originalPrice.amount,
    hasInventory: typeof item["has_inventory"] === "boolean" ? item["has_inventory"] : null,
    commissionRate: asNumber(commission["rate"]),
    commissionAmount: commissionAmount.amount,
    commissionCurrency: asString(commission["currency"]) ?? commissionAmount.currency,
    shopAdsCommission: asNumber(item["shop_ads_commission"]),
    ...(includeRaw ? { rawMetadata: item } : {}),
  };
}

export function normalizeOfficialProducts(
  items: ExternalProduct[],
  includeRaw = false,
): NormalizedProduct[] {
  return items.map((item, index) => normalizeOfficialProduct(item, index, includeRaw));
}
