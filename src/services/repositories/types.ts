import type { Creative, Product, ProductQuery } from "@/types";

/**
 * Data access contracts. The UI never talks to a data source directly:
 * it goes through a service, which depends on one of these interfaces.
 * Swapping the mock repository for an HTTP/Supabase repository later
 * requires no change in the UI layer.
 */
export interface ProductRepository {
  list(query?: ProductQuery): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
}

export interface CreativeRepository {
  listByProduct(productId: string): Promise<Creative[]>;
  getById(id: string): Promise<Creative | null>;
}
