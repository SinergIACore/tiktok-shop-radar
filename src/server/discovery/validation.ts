import { DEFAULT_MARKET, findMarket } from "@/config/markets";
import { findNiche } from "@/config/niches";
import type {
  DiscoverySearchInput,
  DiscoverySearchPatch,
  DiscoveryRunLimits,
  SearchType,
} from "@/types/discovery";
import { DiscoveryError } from "./store-types";


/**
 * Pure validation + cost guards (Stage 02C.2).
 * Every external call is paid, so limits are validated on the backend and are
 * never trusted from the client.
 */

export const DEFAULT_LIMITS: DiscoveryRunLimits = {
  maxTermsPerRun: 5,
  maxProductsPerTerm: 5,
};

export const HARD_LIMITS: DiscoveryRunLimits = {
  maxTermsPerRun: 10,
  maxProductsPerTerm: 20,
};

export const MAX_TERMS_PER_SEARCH = 20;
export const MAX_NAME_LENGTH = 120;
export const MAX_QUERY_LENGTH = 200;
export const MAX_TERM_LENGTH = 100;

const TYPES: SearchType[] = ["keyword", "product_name", "niche"];

function cleanTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const term = entry.trim().slice(0, MAX_TERM_LENGTH);
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms;
}

export function parseLimits(raw: unknown): DiscoveryRunLimits {
/**
 * Validates the market/country against the REAL Actor `country` enum.
 * Unsupported values are rejected — no silent fallback to another market.
 */
export function parseMarket(raw: unknown, fallback: string = DEFAULT_MARKET): string {
  if (raw === undefined || raw === null || raw === "") return fallback;
  if (typeof raw !== "string") {
    throw new DiscoveryError("validation_error", "Mercado inválido.");
  }
  const market = findMarket(raw);
  if (!market) {
    throw new DiscoveryError(
      "validation_error",
      `Mercado não suportado pelo provider: ${raw.trim()}.`,
    );
  }
  return market.code;
}

export function parseLimits(raw: unknown): DiscoveryRunLimits {
  const input = (raw ?? {}) as { maxTermsPerRun?: unknown; maxProductsPerTerm?: unknown };

  const clamp = (value: unknown, fallback: number, max: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.trunc(parsed), 1), max);
  };
  return {
    maxTermsPerRun: clamp(
      input.maxTermsPerRun,
      DEFAULT_LIMITS.maxTermsPerRun,
      HARD_LIMITS.maxTermsPerRun,
    ),
    maxProductsPerTerm: clamp(
      input.maxProductsPerTerm,
      DEFAULT_LIMITS.maxProductsPerTerm,
      HARD_LIMITS.maxProductsPerTerm,
    ),
  };
}

/** Validates and normalizes the payload of a new saved search. */
export function validateSearchInput(raw: unknown): Required<DiscoverySearchInput> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const name = typeof input["name"] === "string" ? input["name"].trim() : "";
  if (!name) throw new DiscoveryError("validation_error", "Informe um nome para a pesquisa.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new DiscoveryError("validation_error", "Nome da pesquisa muito longo.");
  }

  const type = TYPES.find((value) => value === input["type"]);
  if (!type) {
    throw new DiscoveryError(
      "validation_error",
      "Tipo inválido. Use keyword, product_name ou niche.",
    );
  }

  if (type === "niche") {
    const nicheKey = typeof input["nicheKey"] === "string" ? input["nicheKey"].trim() : "";
    let terms = cleanTerms(input["terms"]);
    if (nicheKey) {
      const niche = findNiche(nicheKey);
      if (!niche) throw new DiscoveryError("validation_error", "Nicho desconhecido.");
      if (terms.length === 0) terms = [...niche.terms];
    }
    if (terms.length === 0) {
      throw new DiscoveryError(
        "validation_error",
        "Uma pesquisa de nicho precisa de pelo menos um termo.",
      );
    }
    if (terms.length > MAX_TERMS_PER_SEARCH) {
      throw new DiscoveryError(
        "validation_error",
        `Máximo de ${MAX_TERMS_PER_SEARCH} termos por pesquisa.`,
      );
    }
    return {
      name,
      type,
      query: null,
      nicheKey: nicheKey || null,
      terms,
      active: input["active"] === false ? false : true,
    };
  }

  const query = typeof input["query"] === "string" ? input["query"].trim() : "";
  if (!query) throw new DiscoveryError("validation_error", "Informe a query da pesquisa.");
  if (query.length > MAX_QUERY_LENGTH) {
    throw new DiscoveryError("validation_error", "Query muito longa.");
  }
  return {
    name,
    type,
    query,
    nicheKey: null,
    terms: [query],
    active: input["active"] === false ? false : true,
  };
}

/** Validates a PATCH payload. Type is immutable in this stage. */
export function validateSearchPatch(raw: unknown): DiscoverySearchPatch {
  const input = (raw ?? {}) as Record<string, unknown>;
  const patch: DiscoverySearchPatch = {};

  if (input["name"] !== undefined) {
    const name = typeof input["name"] === "string" ? input["name"].trim() : "";
    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new DiscoveryError("validation_error", "Nome inválido.");
    }
    patch.name = name;
  }
  if (input["query"] !== undefined) {
    const query = typeof input["query"] === "string" ? input["query"].trim() : "";
    if (!query || query.length > MAX_QUERY_LENGTH) {
      throw new DiscoveryError("validation_error", "Query inválida.");
    }
    patch.query = query;
    patch.terms = [query];
  }
  if (input["terms"] !== undefined) {
    const terms = cleanTerms(input["terms"]);
    if (terms.length === 0) {
      throw new DiscoveryError("validation_error", "Lista de termos vazia.");
    }
    if (terms.length > MAX_TERMS_PER_SEARCH) {
      throw new DiscoveryError(
        "validation_error",
        `Máximo de ${MAX_TERMS_PER_SEARCH} termos por pesquisa.`,
      );
    }
    patch.terms = terms;
  }
  if (input["nicheKey"] !== undefined) {
    const nicheKey = typeof input["nicheKey"] === "string" ? input["nicheKey"].trim() : "";
    if (nicheKey && !findNiche(nicheKey)) {
      throw new DiscoveryError("validation_error", "Nicho desconhecido.");
    }
    patch.nicheKey = nicheKey || null;
  }
  if (input["active"] !== undefined) {
    if (typeof input["active"] !== "boolean") {
      throw new DiscoveryError("validation_error", "Campo active deve ser booleano.");
    }
    patch.active = input["active"];
  }

  if (Object.keys(patch).length === 0) {
    throw new DiscoveryError("validation_error", "Nada para atualizar.");
  }
  return patch;
}

/** Ad-hoc (unsaved) quick search: keyword or product_name only. */
export function validateQuickSearch(raw: unknown): { type: SearchType; query: string } {
  const input = (raw ?? {}) as Record<string, unknown>;
  const type = TYPES.find((value) => value === input["type"]) ?? "keyword";
  if (type === "niche") {
    throw new DiscoveryError(
      "validation_error",
      "Busca rápida aceita apenas keyword ou product_name.",
    );
  }
  const query = typeof input["query"] === "string" ? input["query"].trim() : "";
  if (!query) throw new DiscoveryError("validation_error", "Informe o que deseja pesquisar.");
  if (query.length > MAX_QUERY_LENGTH) {
    throw new DiscoveryError("validation_error", "Query muito longa.");
  }
  return { type, query };
}
