import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { analyzeProductTrend } from "./trend-engine";
import type { MetricSnapshot } from "../metrics/product-metrics";

const at = (hours: number): string => new Date(Date.UTC(2026, 0, 1, hours)).toISOString();

const snap = (hours: number, partial: Partial<MetricSnapshot> = {}): MetricSnapshot => ({
  observedAt: at(hours),
  price: null,
  soldCount: null,
  rating: null,
  reviewCount: null,
  sellerVideoCount: null,
  gmvContribution: null,
  ...partial,
});

const sold = (hours: number, soldCount: number | null) => snap(hours, { soldCount });

describe("analyzeProductTrend", () => {
  it("A. single snapshot => insufficient_data", () => {
    const result = analyzeProductTrend([sold(10, 100)]);
    expect(result.status).toBe("insufficient_data");
    expect(result.evidence).toBe("low");
    expect(result.sales.velocity).toBeNull();
    expect(result.explanation).toContain("Dados insuficientes");
  });

  it("B. 100 -> 130 in 2h => delta 30, velocity 15", () => {
    const result = analyzeProductTrend([sold(10, 100), sold(12, 130)]);
    expect(result.sales.delta).toBe(30);
    expect(result.sales.velocity).toBe(15);
    expect(result.status).toBe("growing");
  });

  it("C. 100 -> 110 -> 140 => acceleration > 0 => accelerating", () => {
    const result = analyzeProductTrend([sold(0, 100), sold(2, 110), sold(4, 140)]);
    expect(result.sales.previousVelocity).toBe(5);
    expect(result.sales.velocity).toBe(15);
    expect(result.sales.acceleration).toBe(10);
    expect(result.sales.velocityRatio).toBe(3);
    expect(result.status).toBe("accelerating");
    expect(result.evidence).toBe("medium");
  });

  it("D. 100 -> 140 -> 150 => acceleration < 0 => decelerating", () => {
    const result = analyzeProductTrend([sold(0, 100), sold(2, 140), sold(4, 150)]);
    expect(result.sales.acceleration).toBeLessThan(0);
    expect(result.status).toBe("decelerating");
  });

  it("E. 100 -> 100 => stable", () => {
    const result = analyzeProductTrend([sold(0, 100), sold(2, 100)]);
    expect(result.status).toBe("stable");
    expect(result.sales.delta).toBe(0);
  });

  it("F. 100 -> 90 => declining", () => {
    const result = analyzeProductTrend([sold(0, 100), sold(2, 90)]);
    expect(result.status).toBe("declining");
    expect(result.sales.velocity).toBe(-5);
  });

  it("G. soldCount NULL => dependent metrics NULL", () => {
    const result = analyzeProductTrend([sold(0, 100), sold(2, null)]);
    expect(result.sales.delta).toBeNull();
    expect(result.sales.velocity).toBeNull();
    expect(result.status).toBe("insufficient_data");
  });

  it("H. zero interval => velocity NULL", () => {
    const result = analyzeProductTrend([sold(2, 100), { ...sold(2, 130) }]);
    expect(result.sales.velocity).toBeNull();
    expect(result.status).toBe("insufficient_data");
    expect(result.validIntervals).toBe(0);
  });

  it("I. negative interval is normalised by sorting, never divides by a negative", () => {
    const result = analyzeProductTrend([sold(4, 130), sold(2, 100)]);
    expect(result.intervals[0]?.timeDeltaHours).toBe(2);
    expect(result.sales.velocity).toBe(15);
  });

  it("J. GMV velocity", () => {
    const result = analyzeProductTrend([
      snap(0, { soldCount: 10, gmvContribution: 100 }),
      snap(2, { soldCount: 20, gmvContribution: 300 }),
    ]);
    expect(result.gmv.delta).toBe(200);
    expect(result.gmv.velocity).toBe(100);
  });

  it("K. review velocity", () => {
    const result = analyzeProductTrend([
      snap(0, { soldCount: 10, reviewCount: 5 }),
      snap(2, { soldCount: 20, reviewCount: 11 }),
    ]);
    expect(result.reviews.delta).toBe(6);
    expect(result.reviews.velocity).toBe(3);
  });

  it("L. seller video velocity", () => {
    const result = analyzeProductTrend([
      snap(0, { soldCount: 10, sellerVideoCount: 2 }),
      snap(4, { soldCount: 20, sellerVideoCount: 10 }),
    ]);
    expect(result.sellerVideos.delta).toBe(8);
    expect(result.sellerVideos.velocity).toBe(2);
  });

  it("M. 4 valid intervals with 3 positive => consistency 0.75", () => {
    const result = analyzeProductTrend([
      sold(0, 100),
      sold(1, 110),
      sold(2, 120),
      sold(3, 130),
      sold(4, 130),
    ]);
    expect(result.validIntervals).toBe(4);
    expect(result.sales.positiveIntervals).toBe(3);
    expect(result.sales.neutralIntervals).toBe(1);
    expect(result.sales.consistency).toBe(0.75);
    expect(result.evidence).toBe("medium"); // 5 valid snapshots (high requires 6+)
  });

  it("N. velocityPrevious = 0 => velocityRatio NULL", () => {
    const result = analyzeProductTrend([sold(0, 100), sold(2, 100), sold(4, 130)]);
    expect(result.sales.previousVelocity).toBe(0);
    expect(result.sales.velocityRatio).toBeNull();
    expect(result.sales.acceleration).toBe(15);
    expect(result.status).toBe("accelerating");
  });

  it("O. out-of-order snapshots are sorted ASC before any calculation", () => {
    const ordered = analyzeProductTrend([sold(0, 100), sold(2, 110), sold(4, 140)]);
    const shuffled = analyzeProductTrend([sold(4, 140), sold(0, 100), sold(2, 110)]);
    expect(shuffled).toEqual(ordered);
  });

  it("P. the pure layer never touches fetch, pg or persistence", () => {
    for (const file of [
      "src/server/intelligence/trend-engine.ts",
      "src/server/intelligence/trend-metrics.ts",
      "src/server/intelligence/trend-classifier.ts",
      "src/server/intelligence/trend-explanation.ts",
      "src/server/intelligence/trend-types.ts",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/from\s+["']pg["']/);
      expect(source).not.toMatch(/import\(["']pg["']\)/);
      expect(source).not.toMatch(/index\.server/);
    }
  });
});
