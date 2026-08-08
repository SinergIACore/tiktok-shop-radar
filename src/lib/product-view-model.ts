import type { ProductWithMetrics } from "@/server/read/types";
import type { StoredSnapshot } from "@/server/persistence/types";
import type { ProductListViewModel, ProductSnapshotViewModel } from "@/types/product-view";

/**
 * Pure adapter Repository -> ViewModel. No calculation is duplicated here:
 * every metric comes already computed from the metrics layer.
 */
export function toProductListViewModel(product: ProductWithMetrics): ProductListViewModel {
  return {
    id: product.id,
    source: product.source,
    sourceProductId: product.sourceProductId,
    name: product.name,
    thumbnail: product.thumbnail,
    productUrl: product.productUrl,
    category: product.category,
    currency: product.currency,
    sellerName: product.sellerName,
    brand: product.brand,
    businessName: product.businessName,
    countryCode: product.countryCode,
    latest: product.latest
      ? {
          observedAt: product.latest.observedAt,
          price: product.latest.price,
          soldCount: product.latest.soldCount,
          rating: product.latest.rating,
          reviewCount: product.latest.reviewCount,
          sellerVideoCount: product.latest.sellerVideoCount,
          gmvContribution: product.latest.gmvContribution,
        }
      : null,
    metrics: { ...product.metrics },
    snapshotCount: product.snapshotCount,
    firstSeenAt: product.firstSeenAt,
    lastSeenAt: product.lastSeenAt,
  };
}

export function toSnapshotViewModel(snapshot: StoredSnapshot): ProductSnapshotViewModel {
  return {
    id: snapshot.id,
    observedAt: snapshot.observedAt,
    price: snapshot.price,
    soldCount: snapshot.soldCount,
    rating: snapshot.rating,
    reviewCount: snapshot.reviewCount,
    sellerVideoCount: snapshot.sellerVideoCount,
    gmvContribution: snapshot.gmvContribution,
  };
}
