import { describe, expect, it } from "vitest";
import { normalizeProduct } from "./normalizeProduct";
import { classifyProduct } from "@/server/discovery/quality-filter";

/**
 * Stage 02C.2D — identity mapping fixtures.
 * The quality filter is NOT relaxed here: it is only used to assert the
 * downstream consequence of a normalization result.
 */
describe("normalizeProduct identity fallbacks", () => {
  it("maps { id, title }", () => {
    const out = normalizeProduct({ id: "1", title: "Dress" }, "apify", 0);
    expect(out.sourceProductId).toBe("1");
    expect(out.name).toBe("Dress");
  });

  it("maps { productId, title }", () => {
    const out = normalizeProduct({ productId: "2", title: "Dress" }, "apify", 0);
    expect(out.sourceProductId).toBe("2");
  });

  it("maps { product_id, name }", () => {
    const out = normalizeProduct({ product_id: "3", name: "Dress" }, "apify", 0);
    expect(out.sourceProductId).toBe("3");
    expect(out.name).toBe("Dress");
  });

  it("maps nested product container", () => {
    const out = normalizeProduct(
      { product: { id: "4", title: "Nested Dress", productUrl: "https://x/4" } },
      "apify",
      0,
    );
    expect(out.sourceProductId).toBe("4");
    expect(out.name).toBe("Nested Dress");
    expect(out.productUrl).toBe("https://x/4");
  });

  it("maps detail_link / product_url fallbacks", () => {
    expect(normalizeProduct({ id: "5", detail_link: "https://x/5" }, "apify", 0).productUrl).toBe(
      "https://x/5",
    );
    expect(normalizeProduct({ id: "6", product_url: "https://x/6" }, "apify", 0).productUrl).toBe(
      "https://x/6",
    );
  });

  it("treats empty strings as absent", () => {
    const out = normalizeProduct({ id: "  ", title: "   ", productUrl: "" }, "apify", 7);
    expect(out.sourceProductId).toBeNull();
    expect(out.name).toBeNull();
    expect(out.productUrl).toBeNull();
    expect(out.id).toBe("apify-7");
  });

  it("never invents an id: item without identity keeps only the synthetic index id", () => {
    const out = normalizeProduct({ title: "No id dress" }, "apify", 2);
    expect(out.sourceProductId).toBeNull();
    expect(out.id).toBe("apify-2");
  });

  it("item with id but no title is rejected as missing_identity", () => {
    const out = normalizeProduct({ id: "9", productUrl: "https://x/9" }, "apify", 0);
    expect(out.name).toBeNull();
    const result = classifyProduct(out);
    expect(result.tier).toBe("rejected");
    expect(result.reason).toBe("missing_identity");
  });

  it("item without any identity field is rejected", () => {
    const out = normalizeProduct({ price: 10 }, "apify", 0);
    expect(classifyProduct(out).tier).toBe("rejected");
  });
});
