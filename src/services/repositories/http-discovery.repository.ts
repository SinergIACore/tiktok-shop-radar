import type {
  DiscoveryRunResponse,
  DiscoverySearch,
  DiscoverySearchInput,
  DiscoverySearchListResponse,
  ProductDiscovery,
} from "@/types/discovery";

/**
 * HTTP repository for the discovery layer.
 * The UI never fetches directly: it always goes through DiscoveryService.
 */
export interface NicheOption {
  key: string;
  name: string;
  description: string | null;
  termCount: number;
  terms: string[];
}

export interface NicheCatalogResponse {
  niches: NicheOption[];
  limits: {
    defaults: { maxTermsPerRun: number; maxProductsPerTerm: number };
    max: { maxTermsPerRun: number; maxProductsPerTerm: number };
  };
}

export interface DiscoveryRepository {
  listSearches(params?: { page?: number; limit?: number }): Promise<DiscoverySearchListResponse>;
  createSearch(input: DiscoverySearchInput): Promise<DiscoverySearch>;
  updateSearch(id: string, patch: Partial<DiscoverySearchInput>): Promise<DiscoverySearch>;
  runSearch(
    id: string,
    limits?: { maxTermsPerRun?: number; maxProductsPerTerm?: number },
  ): Promise<DiscoveryRunResponse>;
  quickSearch(input: {
    query: string;
    type: "keyword" | "product_name";
    maxProductsPerTerm?: number;
  }): Promise<DiscoveryRunResponse>;
  listNiches(): Promise<NicheCatalogResponse>;
  listProductDiscoveries(productId: string): Promise<ProductDiscovery[]>;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error?.message ?? "Não foi possível concluir a operação.");
  }
  return payload;
}

const jsonInit = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const httpDiscoveryRepository: DiscoveryRepository = {
  async listSearches(params = {}) {
    const search = new URLSearchParams();
    if (params.page) search.set("page", String(params.page));
    if (params.limit) search.set("limit", String(params.limit));
    const qs = search.toString();
    return readJson<DiscoverySearchListResponse>(
      await fetch(`/api/discovery/searches${qs ? `?${qs}` : ""}`),
    );
  },

  async createSearch(input) {
    const payload = await readJson<{ search: DiscoverySearch }>(
      await fetch("/api/discovery/searches", jsonInit(input)),
    );
    return payload.search;
  },

  async updateSearch(id, patch) {
    const payload = await readJson<{ search: DiscoverySearch }>(
      await fetch(`/api/discovery/searches/${encodeURIComponent(id)}`, {
        ...jsonInit(patch),
        method: "PATCH",
      }),
    );
    return payload.search;
  },

  async runSearch(id, limits = {}) {
    return readJson<DiscoveryRunResponse>(
      await fetch(`/api/discovery/searches/${encodeURIComponent(id)}/run`, jsonInit(limits)),
    );
  },

  async quickSearch(input) {
    return readJson<DiscoveryRunResponse>(
      await fetch("/api/discovery/quick-search", jsonInit(input)),
    );
  },

  async listNiches() {
    return readJson<NicheCatalogResponse>(await fetch("/api/discovery/niches"));
  },

  async listProductDiscoveries(productId) {
    const payload = await readJson<{ discoveries: ProductDiscovery[] }>(
      await fetch(`/api/discovery/products/${encodeURIComponent(productId)}`),
    );
    return payload.discoveries;
  },
};
