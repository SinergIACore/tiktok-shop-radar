import { mockProductRepository } from "./repositories/mock-product.repository";
import type { ProductRepository } from "./repositories/types";
import type { Product, ProductQuery } from "@/types";

/**
 * ProductService is the only entry point the UI uses to read products.
 * Today it is wired to the mock repository; later it can be wired to an
 * HTTP repository without touching any component.
 */
export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  list(query?: ProductQuery): Promise<Product[]> {
    return this.repository.list(query);
  }

  getById(id: string): Promise<Product | null> {
    return this.repository.getById(id);
  }
}

export const productService = new ProductService(mockProductRepository);
