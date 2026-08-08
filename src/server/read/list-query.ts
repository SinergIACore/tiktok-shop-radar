import type { ProductListQuery, ProductListSort, SortDirection } from "./types";
import { ALLOWED_LIMITS, DEFAULT_LIST_QUERY } from "./types";
import type { ProductWithMetrics } from "./types";

const SORTS: ProductListSort[] = [
  "soldCount",
  "gmv",
  "soldCountDelta",
  "gmvDelta",
  "salesVelocity",
  "lastObservedAt",
];

function toNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parse + clamp the query string of GET /api/products. Never throws. */
export function parseProductListQuery(params: URLSearchParams): ProductListQuery {
  const limitRaw = Number(params.get("limit"));
  const limit = (ALLOWED_LIMITS as readonly number[]).includes(limitRaw)
    ? limitRaw
    : DEFAULT_LIST_QUERY.limit;
  const pageRaw = Number(params.get("page"));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const sortRaw = params.get("sort") as ProductListSort | null;
  const sort = sortRaw && SORTS.includes(sortRaw) ? sortRaw : DEFAULT_LIST_QUERY.sort;
  const directionRaw = params.get("direction");
  const direction: SortDirection = directionRaw === "asc" ? "asc" : "desc";

  return {
    page,
    limit,
    sort,
    direction,
    search: params.get("search"),
    seller: params.get("seller"),
    category: params.get("category"),
    minPrice: toNumber(params.get("minPrice")),
    maxPrice: toNumber(params.get("maxPrice")),
    minSold: toNumber(params.get("minSold")),
    minReviews: toNumber(params.get("minReviews")),
    minRating: toNumber(params.get("minRating")),
    hasHistory: params.get("hasHistory") === "true",
  };
}

const includes = (value: string | null, needle: string) =>
  (value ?? "").toLowerCase().includes(needle.toLowerCase());

/** In-memory filtering, mirroring the SQL rules of the Postgres repository. */
export function filterProducts(
  items: ProductWithMetrics[],
  query: ProductListQuery,
): ProductWithMetrics[] {
  return items.filter((item) => {
    if (query.search && !includes(item.name, query.search)) return false;
    if (query.seller && !includes(item.sellerName, query.seller)) return false;
    if (query.category && item.category !== query.category) return false;
    if (query.hasHistory && item.snapshotCount < 2) return false;

    const latest = item.latest;
    if (query.minPrice !== null && query.minPrice !== undefined) {
      if (latest?.price === null || latest?.price === undefined || latest.price < query.minPrice)
        return false;
    }
    if (query.maxPrice !== null && query.maxPrice !== undefined) {
      if (latest?.price === null || latest?.price === undefined || latest.price > query.maxPrice)
        return false;
    }
    if (query.minSold !== null && query.minSold !== undefined) {
      if (
        latest?.soldCount === null ||
        latest?.soldCount === undefined ||
        latest.soldCount < query.minSold
      )
        return false;
    }
    if (query.minReviews !== null && query.minReviews !== undefined) {
      if (
        latest?.reviewCount === null ||
        latest?.reviewCount === undefined ||
        latest.reviewCount < query.minReviews
      )
        return false;
    }
    if (query.minRating !== null && query.minRating !== undefined) {
      if (
        latest?.rating === null ||
        latest?.rating === undefined ||
        latest.rating < query.minRating
      )
        return false;
    }
    return true;
  });
}

function sortValue(item: ProductWithMetrics, sort: ProductListSort): number | null {
  switch (sort) {
    case "soldCount":
      return item.latest?.soldCount ?? null;
    case "gmv":
      return item.latest?.gmvContribution ?? null;
    case "soldCountDelta":
      return item.metrics.soldCountDelta;
    case "gmvDelta":
      return item.metrics.gmvDelta;
    case "salesVelocity":
      return item.metrics.salesVelocity;
    case "lastObservedAt":
      return item.latest ? new Date(item.latest.observedAt).getTime() : null;
  }
}

/** NULLs always sort last, in both directions. */
export function sortProducts(
  items: ProductWithMetrics[],
  query: ProductListQuery,
): ProductWithMetrics[] {
  const factor = query.direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = sortValue(a, query.sort);
    const vb = sortValue(b, query.sort);
    if (va === null && vb === null) return b.lastSeenAt.localeCompare(a.lastSeenAt);
    if (va === null) return 1;
    if (vb === null) return -1;
    if (va === vb) return b.lastSeenAt.localeCompare(a.lastSeenAt);
    return (va - vb) * factor;
  });
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const start = (safePage - 1) * limit;
  return { total, totalPages, page: safePage, items: items.slice(start, start + limit) };
}
