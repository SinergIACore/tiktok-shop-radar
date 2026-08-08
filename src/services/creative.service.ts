import { mockCreativeRepository } from "./repositories/mock-creative.repository";
import type { CreativeRepository } from "./repositories/types";
import type { Creative } from "@/types";

/** Single entry point the UI uses to read creatives. */
export class CreativeService {
  constructor(private readonly repository: CreativeRepository) {}

  listByProduct(productId: string): Promise<Creative[]> {
    return this.repository.listByProduct(productId);
  }

  getById(id: string): Promise<Creative | null> {
    return this.repository.getById(id);
  }
}

export const creativeService = new CreativeService(mockCreativeRepository);
