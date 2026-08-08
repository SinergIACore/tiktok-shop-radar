import { computeProductMetrics, EMPTY_METRICS } from "../metrics/product-metrics";
import type { MetricSnapshot } from "../metrics/product-metrics";
import type { ProductStore, StoredProduct, StoredSnapshot } from "../persistence/types";
import { filterProducts, paginate, sortProducts } from "./list-query";
import type {
  ProductListPage,
  ProductListQuery,
  ProductReadRepository,
  ProductWithMetrics,
} from "./types";

/** Snapshot projection used by the metrics layer. */
export function toMetricSnapshot(snapshot: StoredSnapshot | null): MetricSnapshot | null {
  if (!snapshot) return null;
  return {
    observedAt: snapshot.observedAt,
    price: snapshot.price,
    soldCount: snapshot.soldCount,
    rating: snapshot.rating,
    reviewCount: snapshot.reviewCount,
    sellerVideoCount: snapshot.sellerVideoCount,
    gmvContribution: snapshot.gmvContribution,
  };
}

export function assembleProduct(
  product: StoredProduct,
  snapshots: StoredSnapshot[],
): ProductWithMetrics {
  const latest = toMetricSnapshot(snapshots[snapshots.length - 1] ?? null);
  const previous = toMetricSnapshot(snapshots[snapshots.length - 2] ?? null);
  return {
    id: product.id,
    source: product.source,
    sourceProductId: product.sourceProductId,
    name: product.name,
    thumbnail: product.thumbnail,
    productUrl: product.productUrl,
    category: product.category,
    sellerName: product.sellerName,
    brand: product.brand,
    businessName: product.businessName,
    countryCode: product.countryCode,
    currency: product.currency,
    firstSeenAt: product.firstSeenAt,
    lastSeenAt: product.lastSeenAt,
    snapshotCount: snapshots.length,
    latest,
    previous,
    metrics: latest && previous ? computeProductMetrics(latest, previous) : { ...EMPTY_METRICS },
  };
}

/**
 * Read repository backed by the in-memory store (dev sandbox / tests).
 * Read-only by construction: it only calls read methods of the store.
 */
export class MemoryProductReadRepository implements ProductReadRepository {
  readonly name = "memory";

  constructor(
    private readonly store: Pick<ProductStore, "listProducts" | "getProduct" | "listSnapshots">,
  ) {}

  private async assembleAll(limit: number): Promise<ProductWithMetrics[]> {
    const products = await this.store.listProducts(limit);
    const result: ProductWithMetrics[] = [];
    for (const product of products) {
      result.push(assembleProduct(product, await this.store.listSnapshots(product.id)));
    }
    return result;
  }

  async listProductsWithMetrics(limit = 50): Promise<ProductWithMetrics[]> {
    return this.assembleAll(limit);
  }

  async listProductsPage(query: ProductListQuery): Promise<ProductListPage> {
    const all = await this.assembleAll(Number.MAX_SAFE_INTEGER);
    const filtered = sortProducts(filterProducts(all, query), query);
    const { total, totalPages, page, items } = paginate(filtered, query.page, query.limit);
    return { page, limit: query.limit, total, totalPages, items };
  }

  async getProductWithMetrics(productId: string): Promise<ProductWithMetrics | null> {
    const product = await this.store.getProduct(productId);
    if (!product) return null;
    return assembleProduct(product, await this.store.listSnapshots(product.id));
  }

  async listHistory(productId: string): Promise<StoredSnapshot[]> {
    return this.store.listSnapshots(productId);
  }
}
