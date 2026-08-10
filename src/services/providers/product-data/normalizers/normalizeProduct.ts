import type { ExternalProduct, NormalizedProduct } from "../types/external-product.types";

/**
 * Converts an unknown provider payload into the internal product model.
 * Missing fields become null — values are never invented or estimated.
 *
 * Stage 02C.2D: some Actors wrap the product in a container object
 * (`product`, `item`, `data`, `node`). We therefore look up each key in the
 * root object AND in those containers, in that order. No value is ever
 * synthesized: an unknown field stays null.
 */

/** Container objects an Actor may nest the real product into. */
const NESTED_KEYS = ["product", "item", "data", "node", "productInfo", "product_info"] as const;

function scopes(item: ExternalProduct): ExternalProduct[] {
  const result: ExternalProduct[] = [item];
  for (const key of NESTED_KEYS) {
    const value = item[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result.push(value as ExternalProduct);
    }
  }
  return result;
}

function pick(item: ExternalProduct, keys: string[]): unknown {
  for (const scope of scopes(item)) {
    for (const key of keys) {
      const value = scope[key];
      if (value === undefined || value === null) continue;
      if (typeof value === "string" && value.trim() === "") continue;
      return value;
    }
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
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

/** First usable URL in imageUrls[], used as thumbnail fallback. */
function firstImage(item: ExternalProduct): string | null {
  for (const scope of scopes(item)) {
    const list = scope["imageUrls"] ?? scope["image_urls"] ?? scope["images"];
    if (Array.isArray(list)) {
      for (const entry of list) {
        const value =
          asString(entry) ??
          (entry && typeof entry === "object"
            ? asString((entry as ExternalProduct)["url"] ?? (entry as ExternalProduct)["urlList"])
            : null);
        if (value) return value;
      }
    }
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
      pick(item, [
        "currentPrice",
        "current_price",
        "price",
        "sale_price",
        "salePrice",
        "min_price",
      ]),
    ),
    currency: asString(pick(item, ["currency", "currencyCode", "currency_code"])),
    soldCount: asNumber(pick(item, ["soldCount", "sold_count", "sales", "sale_count"])),
    rating: asNumber(pick(item, ["rating", "score", "average_rating", "product_rating"])),
    reviewCount: asNumber(pick(item, ["reviewCount", "review_count", "reviews", "comment_count"])),
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
