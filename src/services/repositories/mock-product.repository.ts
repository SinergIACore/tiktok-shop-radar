import { mockProducts } from "@/mocks/products";
import type { Product, ProductQuery } from "@/types";
import type { ProductRepository } from "./types";

/** Development-only repository backed by static mocked data. */
export const mockProductRepository: ProductRepository = {
  async list(query: ProductQuery = {}) {
    const { category = "all", sortBy = "viralScore", limit } = query;

    let items: Product[] = mockProducts.filter(
      (product) => category === "all" || product.category === category,
    );

    items = [...items].sort((a, b) => b[sortBy] - a[sortBy]);

    return typeof limit === "number" ? items.slice(0, limit) : items;
  },

  async getById(id: string) {
    return mockProducts.find((product) => product.id === id) ?? null;
  },
};
