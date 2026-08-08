import { mockCreatives } from "@/mocks/creatives";
import type { CreativeRepository } from "./types";

/** Development-only repository backed by static mocked data. */
export const mockCreativeRepository: CreativeRepository = {
  async listByProduct(productId: string) {
    return mockCreatives.filter((creative) => creative.productId === productId);
  },

  async getById(id: string) {
    return mockCreatives.find((creative) => creative.id === id) ?? null;
  },
};
