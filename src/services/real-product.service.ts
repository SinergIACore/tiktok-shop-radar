import {
  httpRealProductRepository,
  type RealProductRepository,
} from "./repositories/http-real-product.repository";
import type { ProductDetailResponse, ProductListResponse, RealProductQuery } from "@/types/product-view";

/**
 * Only entry point the /products UI uses to read persisted (real) products.
 * The mock services remain untouched and still serve the Dashboard.
 */
export class RealProductService {
  constructor(private readonly repository: RealProductRepository) {}

  list(query: RealProductQuery = {}): Promise<ProductListResponse> {
    return this.repository.list(query);
  }

  getById(id: string): Promise<ProductDetailResponse> {
    return this.repository.getById(id);
  }
}

export const realProductService = new RealProductService(httpRealProductRepository);
