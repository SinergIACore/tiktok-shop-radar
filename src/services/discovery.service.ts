import {
  httpDiscoveryRepository,
  type DiscoveryRepository,
  type NicheCatalogResponse,
} from "./repositories/http-discovery.repository";
import type {
  DiscoveryRunResponse,
  DiscoverySearch,
  DiscoverySearchInput,
  DiscoverySearchListResponse,
  ProductDiscovery,
} from "@/types/discovery";

/**
 * Only entry point the /discovery UI uses. Every run is triggered by an
 * explicit user action — there is no automatic collection in this stage.
 */
export class DiscoveryService {
  constructor(private readonly repository: DiscoveryRepository) {}

  listSearches(params?: { page?: number; limit?: number }): Promise<DiscoverySearchListResponse> {
    return this.repository.listSearches(params);
  }

  createSearch(input: DiscoverySearchInput): Promise<DiscoverySearch> {
    return this.repository.createSearch(input);
  }

  updateSearch(id: string, patch: Partial<DiscoverySearchInput>): Promise<DiscoverySearch> {
    return this.repository.updateSearch(id, patch);
  }

  runSearch(
    id: string,
    limits?: { maxTermsPerRun?: number; maxProductsPerTerm?: number },
  ): Promise<DiscoveryRunResponse> {
    return this.repository.runSearch(id, limits);
  }

  quickSearch(input: {
    query: string;
    type: "keyword" | "product_name";
    market?: string;
    maxProductsPerTerm?: number;
  }): Promise<DiscoveryRunResponse> {
    return this.repository.quickSearch(input);
  }

  listNiches(): Promise<NicheCatalogResponse> {
    return this.repository.listNiches();
  }

  listProductDiscoveries(productId: string): Promise<ProductDiscovery[]> {
    return this.repository.listProductDiscoveries(productId);
  }
}

export const discoveryService = new DiscoveryService(httpDiscoveryRepository);
