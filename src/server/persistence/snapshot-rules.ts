import type { ProductIdentityInput, StoredProduct, StoredSnapshot, SnapshotInput } from "./types";

/** Numeric fields watched by the deduplication rule. */
export const MONITORED_FIELDS = [
  "price",
  "soldCount",
  "rating",
  "reviewCount",
  "sellerVideoCount",
  "gmvContribution",
  "discountPercent",
  "commentRate",
] as const;

/**
 * Deduplication rule (documented in docs/DATABASE.md):
 * a new snapshot is skipped only when the previous snapshot of the same
 * product happened inside `windowMs` AND every monitored field is identical.
 * Real changes are always recorded, whatever the interval.
 */
export function isDuplicateSnapshot(
  previous: Pick<StoredSnapshot, "observedAt" | (typeof MONITORED_FIELDS)[number]> | null,
  next: Omit<SnapshotInput, "productId">,
  windowMs: number,
): boolean {
  if (!previous) return false;
  const delta = new Date(next.observedAt).getTime() - new Date(previous.observedAt).getTime();
  if (!Number.isFinite(delta) || delta < 0 || delta > windowMs) return false;
  return MONITORED_FIELDS.every((field) => previous[field] === next[field]);
}

/**
 * Metadata merge: a fresh non-null value wins; a null coming from a new
 * collection never erases an existing valid value.
 */
export function mergeIdentity(
  existing: StoredProduct,
  incoming: ProductIdentityInput,
): ProductIdentityInput {
  const keep = <T>(next: T | null, current: T | null): T | null =>
    next === null || next === undefined || next === "" ? current : next;

  return {
    source: existing.source,
    sourceProductId: existing.sourceProductId,
    name: keep(incoming.name, existing.name),
    thumbnail: keep(incoming.thumbnail, existing.thumbnail),
    productUrl: keep(incoming.productUrl, existing.productUrl),
    category: keep(incoming.category, existing.category),
    currency: keep(incoming.currency, existing.currency),
    sellerName: keep(incoming.sellerName, existing.sellerName),
    brand: keep(incoming.brand, existing.brand),
    businessName: keep(incoming.businessName, existing.businessName),
    countryCode: keep(incoming.countryCode, existing.countryCode),
  };
}

/**
 * Raw delta between the two most recent snapshots.
 * Returns null when either value is unknown. No percentage, no velocity.
 */
export function soldCountDelta(snapshots: Pick<StoredSnapshot, "soldCount">[]): number | null {
  if (snapshots.length < 2) return null;
  const current = snapshots[snapshots.length - 1]?.soldCount ?? null;
  const previous = snapshots[snapshots.length - 2]?.soldCount ?? null;
  if (typeof current !== "number" || typeof previous !== "number") return null;
  return current - previous;
}
