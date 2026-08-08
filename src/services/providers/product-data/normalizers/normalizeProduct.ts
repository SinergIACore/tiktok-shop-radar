import type {
  ExternalProduct,
  NormalizedProduct,
} from "../types/external-product.types";

/**
 * Converts an unknown provider payload into the internal product model.
 * Missing fields become null — values are never invented or estimated.
 */

function pick(item: ExternalProduct, keys: string[]): unknown {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeProduct(
  item: ExternalProduct,
  source: string,
  index: number,
  includeRaw = false,
): NormalizedProduct {
  const sourceProductId = asString(
    pick(item, ["product_id", "productId", "id", "itemId", "sku_id"]),
  );

  const normalized: NormalizedProduct = {
    id: sourceProductId ?? `${source}-${index}`,
    name: asString(pick(item, ["title", "name", "product_name", "productName"])),
    thumbnail:
      asString(
        pick(item, [
          "mainImage",
          "main_image",
          "image",
          "imageUrl",
          "thumbnail",
          "cover",
          "coverUrl",
        ]),
      ) ?? firstImage(item),
    productUrl: asString(pick(item, ["productUrl", "product_url", "url", "link"])),
    category: asString(
      pick(item, ["categoryPath", "category_path", "category", "categoryName", "category_name"]),
    ),
    price: asNumber(
      pick(item, ["currentPrice", "current_price", "price", "sale_price", "salePrice", "min_price"]),
    ),
    currency: asString(pick(item, ["currency", "currencyCode", "currency_code"])),
    soldCount: asNumber(pick(item, ["soldCount", "sold_count", "sales", "sale_count"])),
    rating: asNumber(pick(item, ["rating", "score", "average_rating", "product_rating"])),
    reviewCount: asNumber(
      pick(item, ["reviewCount", "review_count", "reviews", "comment_count"]),
    ),
    sellerName: asString(pick(item, ["sellerName", "seller_name", "shop_name", "shopName"])),
    sellerVideoCount: asNumber(pick(item, ["sellerVideoCount", "seller_video_count"])),
    gmvContribution: asNumber(pick(item, ["gmvContribution", "gmv_contribution"])),
    brand: asString(pick(item, ["brand"])),
    businessName: asString(pick(item, ["businessName", "business_name"])),
    countryCode: asString(pick(item, ["countryCode", "country_code"])),
    discountPercent: asNumber(pick(item, ["discountPercent", "discount_percent"])),
    commentRate: asNumber(pick(item, ["commentRate", "comment_rate"])),
    // Intentionally null: the Actor has no real creator-count field.
    // sellerVideoCount is NOT a proxy for it.
    creatorCount: null,
    source,
    sourceProductId,
  };

  if (includeRaw) normalized.rawMetadata = item;
  return normalized;
}

export function normalizeProducts(
  items: ExternalProduct[],
  source: string,
  includeRaw = false,
): NormalizedProduct[] {
  return items.map((item, index) => normalizeProduct(item, source, index, includeRaw));
}
