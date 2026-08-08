import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlaskConical } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

type ApiError = { error: { code: string; message: string } };

type TrendStatus =
  | "insufficient_data"
  | "accelerating"
  | "growing"
  | "stable"
  | "decelerating"
  | "declining";

interface TrendInterval {
  fromObservedAt: string;
  toObservedAt: string;
  timeDeltaHours: number | null;
  soldCountDelta: number | null;
  salesVelocity: number | null;
  gmvDelta: number | null;
  gmvVelocity: number | null;
  reviewCountDelta: number | null;
  reviewVelocity: number | null;
  sellerVideoCountDelta: number | null;
  sellerVideoVelocity: number | null;
  validForSales: boolean;
}

interface TrendAnalysis {
  status: TrendStatus;
  evidence: "low" | "medium" | "high";
  snapshotCount: number;
  validIntervals: number;
  latest: {
    observedAt: string | null;
    soldCount: number | null;
    gmv: number | null;
    reviews: number | null;
    sellerVideoCount: number | null;
    price: number | null;
  };
  sales: {
    delta: number | null;
    velocity: number | null;
    previousVelocity: number | null;
    acceleration: number | null;
    velocityRatio: number | null;
    positiveIntervals: number;
    negativeIntervals: number;
    neutralIntervals: number;
    consistency: number | null;
  };
  gmv: { delta: number | null; velocity: number | null };
  reviews: { delta: number | null; velocity: number | null };
  sellerVideos: { delta: number | null; velocity: number | null };
  intervals: TrendInterval[];
  explanation: string;
}

interface TrendItem {
  id: string;
  name: string | null;
  sourceProductId: string;
  sellerName: string | null;
  thumbnail: string | null;
  lastSeenAt: string;
  snapshotCount: number;
  trend: TrendAnalysis;
}

async function parse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error((payload as ApiError)?.error?.message ?? `Falha (${response.status}).`);
  }
  return payload as T;
}

/** NULL is never rendered as zero. */
const show = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined
    ? "—"
    : Number.isInteger(value)
      ? String(value)
      : value.toFixed(digits);

const showDelta = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined
    ? "—"
    : `${value > 0 ? "+" : ""}${Number.isInteger(value) ? value : value.toFixed(digits)}`;

const showRatio = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${(value * 100).toFixed(0)}%`;

const deltaClass = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "text-muted-foreground"
    : value > 0
      ? "text-growth"
      : value < 0
        ? "text-alert"
        : "text-muted-foreground";

const STATUS_LABEL: Record<TrendStatus, string> = {
  insufficient_data: "Dados insuficientes",
  accelerating: "Acelerando",
  growing: "Crescendo",
  stable: "Estável",
  decelerating: "Desacelerando",
  declining: "Caindo",
};

const STATUS_CLASS: Record<TrendStatus, string> = {
  accelerating: "border-growth/50 bg-growth/15 text-growth",
  growing: "border-growth/40 bg-growth/10 text-growth",
  stable: "border-border bg-muted/40 text-muted-foreground",
  decelerating: "border-alert/40 bg-alert/10 text-alert",
  declining: "border-destructive/40 bg-destructive/10 text-destructive",
  insufficient_data: "border-border bg-muted/30 text-muted-foreground",
};

const EVIDENCE_LABEL = { low: "Baixa", medium: "Média", high: "Alta" } as const;

function StatusBadge({ status }: { status: TrendStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export const Route = createFileRoute("/labs/product-trends")({
  head: () => ({
    meta: [
      { title: "LAB — Motor de tendência histórica | TikRadar AI" },
      {
        name: "description",
        content:
          "Classificação determinística de tendência observada a partir dos snapshots persistidos: velocidade, aceleração e consistência.",
      },
      { property: "og:title", content: "LAB — Motor de tendência histórica" },
      {
        property: "og:description",
        content:
          "Velocidade de vendas, aceleração observada, consistência de crescimento e explicação determinística.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductTrendsLab,
});

function ProductTrendsLab() {
  const [selected, setSelected] = useState<string | null>(null);

  const trends = useQuery({
    queryKey: ["labs", "trends"],
    queryFn: async () =>
      parse<{ store: string; generatedAt: string; items: TrendItem[] }>(
        await fetch("/api/labs/products/trends?limit=50"),
      ),
  });

  const detail = useQuery({
    queryKey: ["labs", "trend", selected],
    enabled: Boolean(selected),
    queryFn: async () =>
      parse<{ store: string; item: TrendItem }>(
        await fetch(`/api/labs/products/${selected}/trend`),
      ),
  });

  const items = trends.data?.items ?? [];
  const selectedItem = detail.data?.item ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Motor de tendência histórica"
        description="Camada pura e explicável sobre products + product_snapshots. Sem Viral Score, sem previsão: apenas o que aconteceu entre as observações disponíveis."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-alert/40 bg-alert/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-alert">
            <FlaskConical className="size-3.5" />
            LAB / Tendência
          </span>
        }
      />

      <p className="mt-4 font-mono text-xs text-muted-foreground">
        store={trends.data?.store ?? "—"} · produtos={items.length} ·{" "}
        gerado={trends.data ? new Date(trends.data.generatedAt).toLocaleString("pt-BR") : "—"}
      </p>

      {trends.isError && (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Falha na leitura</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {(trends.error as Error).message}
          </p>
        </div>
      )}

      {trends.isPending && <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>}

      {!trends.isPending && items.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Nenhum produto persistido ainda. Use o LAB de persistência para ingerir dados.
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1250px] text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Snapshots</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Evidência</th>
                <th className="px-3 py-2">Vendas</th>
                <th className="px-3 py-2">Δ vendas</th>
                <th className="px-3 py-2">Vel. atual</th>
                <th className="px-3 py-2">Vel. anterior</th>
                <th className="px-3 py-2">Aceleração</th>
                <th className="px-3 py-2">Consistência</th>
                <th className="px-3 py-2">Δ GMV</th>
                <th className="px-3 py-2">Vel. GMV</th>
                <th className="px-3 py-2">Última obs.</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border align-top">
                  <td className="max-w-72 px-3 py-2">
                    <span className="line-clamp-2">{item.name ?? item.sourceProductId}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.sellerName ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{item.snapshotCount}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={item.trend.status} />
                  </td>
                  <td className="px-3 py-2 text-xs">{EVIDENCE_LABEL[item.trend.evidence]}</td>
                  <td className="px-3 py-2">{show(item.trend.latest.soldCount)}</td>
                  <td className={`px-3 py-2 font-medium ${deltaClass(item.trend.sales.delta)}`}>
                    {showDelta(item.trend.sales.delta)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{show(item.trend.sales.velocity)}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {show(item.trend.sales.previousVelocity)}
                  </td>
                  <td
                    className={`px-3 py-2 font-mono text-xs ${deltaClass(item.trend.sales.acceleration)}`}
                  >
                    {showDelta(item.trend.sales.acceleration)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {showRatio(item.trend.sales.consistency)}
                  </td>
                  <td className={`px-3 py-2 ${deltaClass(item.trend.gmv.delta)}`}>
                    {showDelta(item.trend.gmv.delta)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{show(item.trend.gmv.velocity)}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.trend.latest.observedAt
                      ? new Date(item.trend.latest.observedAt).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      variant={selected === item.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelected(item.id)}
                    >
                      Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <section className="mt-10">
          <h2 className="font-display text-lg">
            Detalhes — {selectedItem?.name ?? selectedItem?.sourceProductId ?? selected}
          </h2>
          {detail.isPending && <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>}
          {detail.isError && (
            <p className="mt-2 text-sm text-destructive">{(detail.error as Error).message}</p>
          )}

          {selectedItem && (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StatusBadge status={selectedItem.trend.status} />
                <span className="text-xs text-muted-foreground">
                  Evidência: {EVIDENCE_LABEL[selectedItem.trend.evidence]} ·{" "}
                  {selectedItem.trend.validIntervals} intervalo(s) válido(s) de{" "}
                  {selectedItem.trend.snapshotCount} snapshot(s)
                </span>
              </div>
              <p className="mt-3 rounded-lg border border-border bg-card p-4 text-sm">
                {selectedItem.trend.explanation}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Velocidade atual", show(selectedItem.trend.sales.velocity)],
                  ["Velocidade anterior", show(selectedItem.trend.sales.previousVelocity)],
                  ["Aceleração", showDelta(selectedItem.trend.sales.acceleration)],
                  ["Razão de velocidade", show(selectedItem.trend.sales.velocityRatio)],
                  ["Consistência", showRatio(selectedItem.trend.sales.consistency)],
                  ["Velocidade GMV", show(selectedItem.trend.gmv.velocity)],
                  ["Velocidade reviews", show(selectedItem.trend.reviews.velocity)],
                  ["Velocidade shop videos", show(selectedItem.trend.sellerVideos.velocity)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-card p-3">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 font-mono text-sm">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">De</th>
                      <th className="px-3 py-2">Até</th>
                      <th className="px-3 py-2">Intervalo (h)</th>
                      <th className="px-3 py-2">Δ vendas</th>
                      <th className="px-3 py-2">Vendas/h</th>
                      <th className="px-3 py-2">Δ GMV</th>
                      <th className="px-3 py-2">GMV/h</th>
                      <th className="px-3 py-2">Δ reviews</th>
                      <th className="px-3 py-2">Δ shop videos</th>
                      <th className="px-3 py-2">Válido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem.trend.intervals.map((interval, index) => (
                      <tr key={interval.toObservedAt + index} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs">
                          {new Date(interval.fromObservedAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {new Date(interval.toObservedAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {show(interval.timeDeltaHours)}
                        </td>
                        <td className={`px-3 py-2 ${deltaClass(interval.soldCountDelta)}`}>
                          {showDelta(interval.soldCountDelta)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {show(interval.salesVelocity)}
                        </td>
                        <td className={`px-3 py-2 ${deltaClass(interval.gmvDelta)}`}>
                          {showDelta(interval.gmvDelta)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{show(interval.gmvVelocity)}</td>
                        <td className="px-3 py-2">{showDelta(interval.reviewCountDelta)}</td>
                        <td className="px-3 py-2">{showDelta(interval.sellerVideoCountDelta)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {interval.validForSales ? "sim" : "não"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
