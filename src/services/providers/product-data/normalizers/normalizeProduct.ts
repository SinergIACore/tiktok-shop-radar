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
    thumbnail: asString(
      pick(item, ["image", "imageUrl", "thumbnail", "cover", "coverUrl", "main_image"]),
    ),
    productUrl: asString(pick(item, ["url", "productUrl", "product_url", "link"])),
    category: asString(pick(item, ["category", "categoryName", "category_name"])),
    price: asNumber(pick(item, ["price", "sale_price", "salePrice", "min_price"])),
    currency: asString(pick(item, ["currency", "currencyCode", "currency_code"])),
    soldCount: asNumber(pick(item, ["sold_count", "soldCount", "sales", "sale_count"])),
    rating: asNumber(pick(item, ["rating", "score", "average_rating", "product_rating"])),
    reviewCount: asNumber(
      pick(item, ["review_count", "reviewCount", "reviews", "comment_count"]),
    ),
    sellerName: asString(pick(item, ["seller_name", "sellerName", "shop_name", "shopName"])),
    creatorCount: asNumber(pick(item, ["creator_count", "creatorCount", "creators"])),
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
