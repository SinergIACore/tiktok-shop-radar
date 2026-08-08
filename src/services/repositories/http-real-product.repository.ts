import type {
  ProductDetailResponse,
  ProductListResponse,
  RealProductQuery,
} from "@/types/product-view";

/**
 * HTTP repository for the real (persisted) products.
 * The UI never fetches directly: it goes through RealProductService.
 */
export interface RealProductRepository {
  list(query: RealProductQuery): Promise<ProductListResponse>;
  getById(id: string): Promise<ProductDetailResponse>;
}

function buildSearchParams(query: RealProductQuery): string {
  const params = new URLSearchParams();
  const entries: [string, unknown][] = Object.entries(query);
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    params.set(key, String(value));
  }
  return params.toString();
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    (T & { error?: { message?: string } }) | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error?.message ?? "Não foi possível carregar os produtos.");
  }
  return payload;
}

export const httpRealProductRepository: RealProductRepository = {
  async list(query) {
    const qs = buildSearchParams(query);
    const response = await fetch(`/api/products${qs ? `?${qs}` : ""}`);
    return readJson<ProductListResponse>(response);
  },

  async getById(id) {
    const response = await fetch(`/api/products/${encodeURIComponent(id)}`);
    return readJson<ProductDetailResponse>(response);
  },
};
