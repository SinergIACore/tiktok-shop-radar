import type {
  DiscoverySearch,
  DiscoverySearchInput,
  DiscoverySearchPatch,
  ProductDiscovery,
} from "@/types/discovery";
import type {
  DiscoveryRecordInput,
  DiscoverySearchListQuery,
  DiscoverySearchPage,
  DiscoveryStore,
} from "./store-types";

/** In-memory discovery store (dev sandbox / tests). Volatile by design. */
export class MemoryDiscoveryStore implements DiscoveryStore {
  readonly name = "memory";
  private searches = new Map<string, DiscoverySearch>();
  private discoveries: ProductDiscovery[] = [];
  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  async listSearches(query: DiscoverySearchListQuery): Promise<DiscoverySearchPage> {
    const all = [...this.searches.values()]
      .filter((search) => (query.activeOnly ? search.active : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = all.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);
    const page = totalPages > 0 ? Math.min(query.page, totalPages) : 1;
    const offset = (page - 1) * query.limit;
    return {
      page,
      limit: query.limit,
      total,
      totalPages,
      items: all.slice(offset, offset + query.limit),
    };
  }

  async createSearch(input: Required<DiscoverySearchInput>): Promise<DiscoverySearch> {
    const now = new Date().toISOString();
    const search: DiscoverySearch = {
      id: this.nextId("dsc"),
      name: input.name,
      type: input.type,
      query: input.query ?? null,
      nicheKey: input.nicheKey ?? null,
      market: input.market ?? "US",
      terms: input.terms ?? [],
      active: input.active,
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
      runCount: 0,
    };
    this.searches.set(search.id, search);
    return search;
  }

  async getSearch(id: string): Promise<DiscoverySearch | null> {
    return this.searches.get(id) ?? null;
  }

  async updateSearch(id: string, patch: DiscoverySearchPatch): Promise<DiscoverySearch | null> {
    const existing = this.searches.get(id);
    if (!existing) return null;
    const updated: DiscoverySearch = {
      ...existing,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.query !== undefined ? { query: patch.query } : {}),
      ...(patch.nicheKey !== undefined ? { nicheKey: patch.nicheKey } : {}),
      ...(patch.market !== undefined ? { market: patch.market } : {}),
      ...(patch.terms !== undefined ? { terms: patch.terms } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.searches.set(id, updated);
    return updated;
  }

  async recordRun(id: string, ranAt: string): Promise<DiscoverySearch | null> {
    const existing = this.searches.get(id);
    if (!existing) return null;
    const updated: DiscoverySearch = {
      ...existing,
      lastRunAt: ranAt,
      runCount: existing.runCount + 1,
      updatedAt: ranAt,
    };
    this.searches.set(id, updated);
    return updated;
  }

  async recordDiscovery(input: DiscoveryRecordInput): Promise<{ created: boolean }> {
    const duplicate = this.discoveries.some(
      (entry) =>
        entry.productId === input.productId &&
        entry.searchId === input.searchId &&
        entry.term.toLowerCase() === input.term.toLowerCase(),
    );
    if (duplicate) return { created: false };
    const search = input.searchId ? (this.searches.get(input.searchId) ?? null) : null;
    this.discoveries.push({
      id: this.nextId("pdc"),
      productId: input.productId,
      searchId: input.searchId,
      searchName: search?.name ?? null,
      searchType: search?.type ?? null,
      nicheKey: search?.nicheKey ?? null,
      term: input.term,
      discoveredAt: input.discoveredAt,
    });
    return { created: true };
  }

  async listDiscoveriesForProduct(productId: string, limit = 50): Promise<ProductDiscovery[]> {
    return this.discoveries
      .filter((entry) => entry.productId === productId)
      .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt))
      .slice(0, limit);
  }
}
