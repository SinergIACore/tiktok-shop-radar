import type { NormalizedProduct } from "@/services/providers/product-data/types/external-product.types";
import { PersistenceError } from "../persistence/types";
import type { ProductIdentityInput, ProductStore, SnapshotInput } from "../persistence/types";

/** Default deduplication window: identical retries inside 5 minutes are skipped. */
export const DEFAULT_DEDUP_WINDOW_MS = 5 * 60 * 1000;

export interface IngestionSummary {
  received: number;
  productsCreated: number;
  productsUpdated: number;
  snapshotsCreated: number;
  snapshotsSkipped: number;
  productIds: string[];
}

function toIdentity(item: NormalizedProduct): ProductIdentityInput {
  return {
    source: item.source,
    sourceProductId: item.sourceProductId ?? item.id,
    name: item.name,
    thumbnail: item.thumbnail,
    productUrl: item.productUrl,
    category: item.category,
    currency: item.currency,
    sellerName: item.sellerName,
    brand: item.brand,
    businessName: item.businessName,
    countryCode: item.countryCode,
  };
}

function toSnapshot(item: NormalizedProduct, observedAt: string): Omit<SnapshotInput, "productId"> {
  return {
    observedAt,
    price: item.price,
    soldCount: item.soldCount,
    rating: item.rating,
    reviewCount: item.reviewCount,
    sellerVideoCount: item.sellerVideoCount,
    gmvContribution: item.gmvContribution,
    discountPercent: item.discountPercent,
    commentRate: item.commentRate,
  };
}

/**
 * Persists already-normalized products. It never calls a provider:
 *   Provider → Normalizer → ProductIngestionService → Product + ProductSnapshot
 */
export class ProductIngestionService {
  constructor(
    private readonly store: ProductStore,
    private readonly dedupWindowMs: number = DEFAULT_DEDUP_WINDOW_MS,
  ) {}

  async ingest(items: NormalizedProduct[]): Promise<IngestionSummary> {
    const summary: IngestionSummary = {
      received: items.length,
      productsCreated: 0,
      productsUpdated: 0,
      snapshotsCreated: 0,
      snapshotsSkipped: 0,
      productIds: [],
    };

    for (const item of items) {
      const identity = toIdentity(item);
      if (!identity.source || !identity.sourceProductId) {
        throw new PersistenceError(
          "validation_error",
          "Produto normalizado sem source/sourceProductId.",
          422,
        );
      }
      const observedAt = new Date().toISOString();
      const result = await this.store.ingest(
        identity,
        toSnapshot(item, observedAt),
        this.dedupWindowMs,
      );
      if (result.created) summary.productsCreated += 1;
      else summary.productsUpdated += 1;
      if (result.snapshotCreated) summary.snapshotsCreated += 1;
      else summary.snapshotsSkipped += 1;
      summary.productIds.push(result.product.id);
    }

    return summary;
  }
}
