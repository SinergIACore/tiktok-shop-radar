import { ApifyProductDataProvider } from "./providers/apify/ApifyProductDataProvider";
import type { ProductDataProvider } from "./ProductDataProvider";

/**
 * Single place where the active provider is chosen. Swapping Apify for an
 * official TikTok Shop provider means changing only this function.
 * Server-side only: implementations read secrets from process.env.
 */
export function getProductDataProvider(): ProductDataProvider {
  return new ApifyProductDataProvider();
}
