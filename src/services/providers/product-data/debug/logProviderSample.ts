import type {
  ExternalProduct,
  NormalizedProduct,
} from "../types/external-product.types";

/**
 * TEMPORARY, SAFE observability (Stage 02C.2D).
 *
 * Logs the shape of at most the first 3 raw items returned by a provider so we
 * can prove whether identity is lost in the provider payload or in the
 * normalizer. It NEVER logs tokens, headers, cookies, secrets or the full
 * payload — only key names and short, truncated candidate values.
 *
 * Remove once the real Actor schema is confirmed.
 */
const MAX_ITEMS = 3;
const MAX_VALUE_LENGTH = 80;

const ID_CANDIDATES = ["id", "productId", "product_id", "sourceProductId", "itemId", "sku_id"];
const TITLE_CANDIDATES = ["title", "name", "productName", "product_name", "goods_name"];
const URL_CANDIDATES = ["productUrl", "product_url", "detailLink", "detail_link", "url", "link"];

function describe(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 'string:""';
    return `string:"${trimmed.slice(0, MAX_VALUE_LENGTH)}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") return `${typeof value}:${value}`;
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (typeof value === "object") return `object{${Object.keys(value as object).slice(0, 12).join(",")}}`;
  return typeof value;
}

function fields(item: ExternalProduct, keys: string[]): string {
  return keys.map((key) => `${key}=${describe(item[key])}`).join(" ");
}

export function logProviderSample(
  source: string,
  rawItems: ExternalProduct[],
  normalized: NormalizedProduct[],
): void {
  const sample = rawItems.slice(0, MAX_ITEMS);
  for (let index = 0; index < sample.length; index += 1) {
    const item = sample[index];
    if (!item || typeof item !== "object") {
      console.info(`[discovery-provider-debug] source=${source} index=${index} rawType=${typeof item}`);
      continue;
    }
    const keys = Object.keys(item);
    console.info(
      `[discovery-provider-debug] source=${source} index=${index} keys=[${keys.join(",")}]`,
    );
    console.info(
      `[discovery-provider-debug] source=${source} index=${index} RAW_ID ${fields(item, ID_CANDIDATES)}`,
    );
    console.info(
      `[discovery-provider-debug] source=${source} index=${index} RAW_TITLE ${fields(item, TITLE_CANDIDATES)}`,
    );
    console.info(
      `[discovery-provider-debug] source=${source} index=${index} RAW_URL ${fields(item, URL_CANDIDATES)}`,
    );
    const out = normalized[index];
    console.info(
      `[discovery-provider-debug] source=${source} index=${index} NORMALIZED sourceProductId=${out?.sourceProductId ?? "null"} id=${out?.id ?? "null"} name=${out?.name ? `"${out.name.slice(0, MAX_VALUE_LENGTH)}"` : "null"} productUrl=${out?.productUrl ? "present" : "null"} thumbnail=${out?.thumbnail ? "present" : "null"} soldCount=${out?.soldCount ?? "null"} reviewCount=${out?.reviewCount ?? "null"}`,
    );
  }
}
