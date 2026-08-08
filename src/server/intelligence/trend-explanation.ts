/**
 * Deterministic human explanation (Stage 02C.1). No AI, no LLM, no forecast.
 * Every sentence is derived from the numbers computed by the metrics layer.
 */

import type { ProductTrendAnalysis, TrendStatus } from "./trend-types";

const nf = (value: number, digits = 1): string =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(digits).replace(/\.0$/, "").replace(".", ",");

const signed = (value: number, digits = 1): string => `${value > 0 ? "+" : ""}${nf(value, digits)}`;

export function explainTrend(
  analysis: Omit<ProductTrendAnalysis, "explanation">,
  lastIntervalHours: number | null,
): string {
  const { sales } = analysis;
  const status: TrendStatus = analysis.status;

  if (status === "insufficient_data") {
    if (analysis.snapshotCount <= 1) {
      return `Dados insuficientes: apenas ${analysis.snapshotCount} snapshot válido.`;
    }
    return "Dados insuficientes: nenhum intervalo válido de vendas (intervalo <= 0 ou vendas ausentes).";
  }

  const windowPart =
    lastIntervalHours !== null && sales.delta !== null
      ? `${signed(sales.delta)} vendas em ${nf(lastIntervalHours)}h`
      : null;
  const velocityPart =
    sales.velocity !== null ? `velocidade atual de ${nf(sales.velocity)} vendas/h` : null;

  if (status === "accelerating") {
    return `Produto acelerando: velocidade passou de ${nf(sales.previousVelocity ?? 0)} para ${nf(
      sales.velocity ?? 0,
    )} vendas/h entre os dois últimos intervalos.`;
  }

  if (status === "decelerating") {
    return `Desaceleração observada: a velocidade de vendas caiu de ${nf(
      sales.previousVelocity ?? 0,
    )} para ${nf(sales.velocity ?? 0)} vendas/h.`;
  }

  if (status === "growing") {
    return `Produto em crescimento: ${[windowPart, velocityPart].filter(Boolean).join(", ")}.`;
  }

  if (status === "stable") {
    return "Produto estável: nenhuma variação de vendas observada no último intervalo.";
  }

  // declining
  return `Contador de vendas observado diminuiu: ${
    windowPart ?? "variação negativa no último intervalo"
  }. Isso reflete o dado observado, não necessariamente demanda real negativa.`;
}
