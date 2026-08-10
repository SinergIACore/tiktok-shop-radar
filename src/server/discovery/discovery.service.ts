import type { DiscoveryStore } from "./store-types";
import { DiscoveryError } from "./store-types";
import { HARD_LIMITS } from "./validation";
import type { ProductStore } from "../persistence/types";
import { ProductIngestionService } from "../ingestion/product-ingestion.service";
import type { ProductDataProvider } from "@/services/providers/product-data/ProductDataProvider";
import { ProviderError } from "@/services/providers/product-data/types/external-product.types";
import { DEFAULT_MARKET } from "@/config/markets";
import {
  DEFAULT_QUALITY_RULE,
  REJECTION_LABELS,
  splitByQuality,
  type DiscoveryQualityRule,
  type DiscoveryRejectionReason,
} from "./quality-filter";
import type { ProductSearchSort } from "@/services/providers/product-data/types/external-product.types";
import type {
  DiscoveryProductResult,
  DiscoveryRunDiagnostics,
  DiscoveryRunLimits,
  DiscoveryRunSummary,
  DiscoverySearch,
  DiscoveryTermResult,
} from "@/types/discovery";
import type { ProductReadRepository } from "../read/types";
import { analyzeProductTrend } from "../intelligence/trend-engine";
import { toMetricSnapshots } from "../intelligence/trend-read.service";

export interface DiscoveryRunTarget {
  /** Saved search, or null for an ad-hoc quick search. */
  search: DiscoverySearch | null;
  terms: string[];
}

export interface DiscoveryRunOptions {
  /** Market/country sent to the provider (already validated). */
  market?: string;
  /** Source-side sort. Defaults to best_sellers for commercial relevance. */
  sort?: ProductSearchSort;
  /** Commercial filter applied BEFORE persistence. */
  quality?: DiscoveryQualityRule;
}

export interface DiscoveryRunResult {
  run: DiscoveryRunSummary;
  limits: DiscoveryRunLimits;
  terms: DiscoveryTermResult[];
  errors: { term: string; status: "failed"; message: string }[];
  productIds: string[];
  diagnostics: DiscoveryRunDiagnostics;
}

/** Provider messages are normalized so no vendor/token detail leaks out. */
function safeProviderMessage(error: unknown): string {
  if (error instanceof ProviderError) {
    switch (error.code) {
      case "timeout":
        return "provider_timeout";
      case "not_configured":
        return "provider_not_configured";
      case "invalid_response":
        return "provider_invalid_response";
      default:
        return "provider_error";
    }
  }
  return "provider_error";
}

/**
 * Discovery orchestration (Stage 02C.2).
 *
 *   DiscoverySearch → DiscoveryService → Provider → Normalizer → Ingestion
 *
 * It NEVER duplicates ingestion logic, never computes trends itself and never
 * schedules anything: every run is triggered manually.
 */
export class DiscoveryService {
  private readonly ingestion: ProductIngestionService;

  constructor(
    private readonly discoveryStore: DiscoveryStore,
    productStore: ProductStore,
    private readonly provider: ProductDataProvider,
  ) {
    this.ingestion = new ProductIngestionService(productStore);
  }

  async run(
    target: DiscoveryRunTarget,
    limits: DiscoveryRunLimits,
    options: DiscoveryRunOptions = {},
  ): Promise<DiscoveryRunResult> {
    const market = options.market ?? target.search?.market ?? DEFAULT_MARKET;
    const sort: ProductSearchSort = options.sort ?? "best_sellers";
    const quality = options.quality ?? DEFAULT_QUALITY_RULE;
    const maxTerms = Math.min(limits.maxTermsPerRun, HARD_LIMITS.maxTermsPerRun);
    const maxProducts = Math.min(limits.maxProductsPerTerm, HARD_LIMITS.maxProductsPerTerm);
    const effectiveLimits = { maxTermsPerRun: maxTerms, maxProductsPerTerm: maxProducts };

    const terms = target.terms.map((term) => term.trim()).filter(Boolean).slice(0, maxTerms);
    if (terms.length === 0) {
      throw new DiscoveryError("validation_error", "Nenhum termo válido para executar.");
    }
    if (!this.provider.isConfigured()) {
      throw new DiscoveryError("not_configured", "Provider de dados não configurado.", 503);
    }

    const startedAt = new Date().toISOString();
    const termResults: DiscoveryTermResult[] = [];
    const errors: { term: string; status: "failed"; message: string }[] = [];
    const uniqueProducts = new Set<string>();
    const rejectionCounts = new Map<DiscoveryRejectionReason, number>();
    let receivedFromProvider = 0;

    const run: DiscoveryRunSummary = {
      startedAt,
      finishedAt: startedAt,
      termsExecuted: 0,
      received: 0,
      strong: 0,
      possible: 0,
      qualified: 0,
      discarded: 0,
      rejections: [],
      uniqueProducts: 0,
      productsCreated: 0,
      productsUpdated: 0,
      snapshotsCreated: 0,
      snapshotsSkipped: 0,
      discoveriesCreated: 0,
      discoveriesSkipped: 0,
    };

    // Sequential on purpose: cost control + no Promise.all over dynamic imports.
    for (const term of terms) {
      run.termsExecuted += 1;
      try {
        const result = await this.provider.searchProducts({
          keyword: term,
          // Propagated to the Actor as maxProductsPerSource — no implicit 50.
          limit: maxProducts,
          country: market,
          sort,
        });
        const items = result.items.slice(0, maxProducts);
        // Commercial classification BEFORE persistence: only REJECTED
        // candidates are discarded; STRONG + POSSIBLE are persisted so the
        // radar keeps working when nothing hits the strong cut.
        const split = splitByQuality(items, quality);
        for (const entry of split.rejected) {
          console.info(
            `[discovery] term=${term} market=${market} rejected id=${entry.item.sourceProductId ?? entry.item.id ?? "null"} reason=${entry.reason} ${entry.detail}`,
          );
        }
        for (const entry of split.reasons) {
          const current = rejectionCounts.get(entry.reason) ?? 0;
          rejectionCounts.set(entry.reason, current + entry.count);
        }
        const summary = await this.ingestion.ingest(split.accepted);

        receivedFromProvider += result.diagnostics.receivedCount;
        run.received += items.length;
        run.strong += split.strong.length;
        run.possible += split.possible.length;
        run.qualified += split.accepted.length;
        run.discarded += split.rejected.length;
        run.productsCreated += summary.productsCreated;
        run.productsUpdated += summary.productsUpdated;
        run.snapshotsCreated += summary.snapshotsCreated;
        run.snapshotsSkipped += summary.snapshotsSkipped;

        const discoveredAt = new Date().toISOString();
        for (const productId of summary.productIds) {
          uniqueProducts.add(productId);
          const recorded = await this.discoveryStore.recordDiscovery({
            productId,
            searchId: target.search?.id ?? null,
            term,
            discoveredAt,
          });
          if (recorded.created) run.discoveriesCreated += 1;
          else run.discoveriesSkipped += 1;
        }

        termResults.push({
          term,
          status: "ok",
          received: items.length,
          strong: split.strong.length,
          possible: split.possible.length,
          qualified: split.accepted.length,
          discarded: split.rejected.length,
          requestedLimit: result.diagnostics.requestedLimit,
          providerLimit: result.diagnostics.providerLimit,
          receivedCount: result.diagnostics.receivedCount,
          productIds: summary.productIds,
        });
      } catch (error) {
        const message = safeProviderMessage(error);
        console.error(`[discovery] term=${term} status=failed reason=${message}`);
        termResults.push({ term, status: "failed", message });
        errors.push({ term, status: "failed", message });
      }
    }

    run.uniqueProducts = uniqueProducts.size;
    run.finishedAt = new Date().toISOString();

    return {
      run,
      limits: effectiveLimits,
      terms: termResults,
      errors,
      productIds: [...uniqueProducts],
      diagnostics: {
        market,
        sort,
        requestedLimit: maxProducts,
        providerLimit: maxProducts,
        receivedCount: receivedFromProvider,
        quality: { ...quality },
      },
    };
  }
}

/**
 * Builds the product cards of a run. TrendStatus is ALWAYS produced by the
 * Stage 02C.1 engine — never recalculated in the UI.
 */
export async function buildDiscoveryProducts(
  repository: ProductReadRepository,
  productIds: string[],
  historyLimit = 20,
): Promise<DiscoveryProductResult[]> {
  if (productIds.length === 0) return [];
  const products = await repository.listProductsByIds(productIds);
  const histories = await repository.listHistoriesForProducts(
    products.map((product) => product.id),
    historyLimit,
  );

  return products.map((product) => {
    const snapshots = histories[product.id] ?? [];
    const trend = analyzeProductTrend(toMetricSnapshots(snapshots));
    return {
      id: product.id,
      name: product.name,
      thumbnail: product.thumbnail,
      productUrl: product.productUrl,
      sellerName: product.sellerName,
      currency: product.currency,
      price: product.latest?.price ?? null,
      soldCount: product.latest?.soldCount ?? null,
      gmv: product.latest?.gmvContribution ?? null,
      trendStatus: trend.status,
      trendEvidence: trend.evidence,
      snapshotCount: snapshots.length,
    };
  });
}
