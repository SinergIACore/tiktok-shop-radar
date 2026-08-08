import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlaskConical } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

type ApiError = { error: { code: string; message: string } };

interface MetricSnapshot {
  observedAt: string;
  price: number | null;
  soldCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  sellerVideoCount: number | null;
  gmvContribution: number | null;
}

interface ProductMetrics {
  soldCountDelta: number | null;
  gmvDelta: number | null;
  priceDelta: number | null;
  reviewCountDelta: number | null;
  sellerVideoCountDelta: number | null;
  timeDeltaHours: number | null;
  salesVelocity: number | null;
}

interface ProductWithMetrics {
  id: string;
  name: string | null;
  sourceProductId: string;
  sellerName: string | null;
  thumbnail: string | null;
  snapshotCount: number;
  latest: MetricSnapshot | null;
  previous: MetricSnapshot | null;
  metrics: ProductMetrics;
}

interface HistoryResponse {
  snapshots: MetricSnapshot[];
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
  value === null || value === undefined ? "—" : Number.isInteger(value) ? String(value) : value.toFixed(digits);

const showDelta = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined
    ? "—"
    : `${value > 0 ? "+" : ""}${Number.isInteger(value) ? value : value.toFixed(digits)}`;

const deltaClass = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "text-muted-foreground"
    : value > 0
      ? "text-growth"
      : value < 0
        ? "text-alert"
        : "text-muted-foreground";

export const Route = createFileRoute("/labs/product-metrics")({
  head: () => ({
    meta: [
      { title: "LAB — Métricas históricas de produtos | TikRadar AI" },
      {
        name: "description",
        content:
          "Leitura real dos produtos persistidos com deltas brutos entre os dois snapshots mais recentes.",
      },
      { property: "og:title", content: "LAB — Métricas históricas de produtos" },
      {
        property: "og:description",
        content: "Deltas de vendas, GMV, preço, reviews e vídeos entre snapshots persistidos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductMetricsLab,
});

function ProductMetricsLab() {
  const [selected, setSelected] = useState<string | null>(null);

  const metrics = useQuery({
    queryKey: ["labs", "metrics"],
    queryFn: async () =>
      parse<{ store: string; items: ProductWithMetrics[] }>(
        await fetch("/api/labs/products/metrics"),
      ),
  });

  const history = useQuery({
    queryKey: ["labs", "history", selected],
    enabled: Boolean(selected),
    queryFn: async () =>
      parse<HistoryResponse>(await fetch(`/api/labs/products/${selected}/history`)),
  });

  const items = metrics.data?.items ?? [];
  const snapshots = history.data?.snapshots ?? [];
  const selectedProduct = items.find((item) => item.id === selected) ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Métricas históricas"
        description="Leitura real de products + product_snapshots. Apenas deltas brutos e velocidade de vendas — sem percentuais, tendências ou Viral Score."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-alert/40 bg-alert/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-alert">
            <FlaskConical className="size-3.5" />
            LAB / Métricas
          </span>
        }
      />

      <p className="mt-4 font-mono text-xs text-muted-foreground">
        store={metrics.data?.store ?? "—"} · produtos={items.length}
      </p>

      {metrics.isError && (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Falha na leitura</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {(metrics.error as Error).message}
          </p>
        </div>
      )}

      {metrics.isPending && <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>}

      {!metrics.isPending && items.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Nenhum produto persistido ainda. Use o LAB de persistência para ingerir dados.
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Preço</th>
                <th className="px-3 py-2">Vendas</th>
                <th className="px-3 py-2">Δ Vendas</th>
                <th className="px-3 py-2">GMV</th>
                <th className="px-3 py-2">Δ GMV</th>
                <th className="px-3 py-2">Reviews</th>
                <th className="px-3 py-2">Δ Reviews</th>
                <th className="px-3 py-2">Shop Videos</th>
                <th className="px-3 py-2">Δ Shop Videos</th>
                <th className="px-3 py-2">Intervalo (h)</th>
                <th className="px-3 py-2">Vendas/hora</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="max-w-72 px-3 py-2">
                    <span className="line-clamp-2">{item.name ?? item.sourceProductId}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.snapshotCount} snapshot(s)
                    </span>
                  </td>
                  <td className="px-3 py-2">{show(item.latest?.price ?? null)}</td>
                  <td className="px-3 py-2">{show(item.latest?.soldCount ?? null)}</td>
                  <td className={`px-3 py-2 font-medium ${deltaClass(item.metrics.soldCountDelta)}`}>
                    {showDelta(item.metrics.soldCountDelta)}
                  </td>
                  <td className="px-3 py-2">{show(item.latest?.gmvContribution ?? null)}</td>
                  <td className={`px-3 py-2 font-medium ${deltaClass(item.metrics.gmvDelta)}`}>
                    {showDelta(item.metrics.gmvDelta)}
                  </td>
                  <td className="px-3 py-2">{show(item.latest?.reviewCount ?? null)}</td>
                  <td className={`px-3 py-2 font-medium ${deltaClass(item.metrics.reviewCountDelta)}`}>
                    {showDelta(item.metrics.reviewCountDelta)}
                  </td>
                  <td className="px-3 py-2">{show(item.latest?.sellerVideoCount ?? null)}</td>
                  <td
                    className={`px-3 py-2 font-medium ${deltaClass(item.metrics.sellerVideoCountDelta)}`}
                  >
                    {showDelta(item.metrics.sellerVideoCountDelta)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {show(item.metrics.timeDeltaHours)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{show(item.metrics.salesVelocity)}</td>
                  <td className="px-3 py-2">
                    <Button
                      variant={selected === item.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelected(item.id)}
                    >
                      Histórico
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
            Histórico — {selectedProduct?.name ?? selectedProduct?.sourceProductId ?? selected}
          </h2>
          {history.isPending && <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>}
          {history.isError && (
            <p className="mt-2 text-sm text-destructive">{(history.error as Error).message}</p>
          )}
          {snapshots.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Data/hora</th>
                    <th className="px-3 py-2">Preço</th>
                    <th className="px-3 py-2">Vendas</th>
                    <th className="px-3 py-2">GMV</th>
                    <th className="px-3 py-2">Reviews</th>
                    <th className="px-3 py-2">Shop Videos</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((snapshot, index) => (
                    <tr key={snapshot.observedAt + index} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">
                        {new Date(snapshot.observedAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2">{show(snapshot.price)}</td>
                      <td className="px-3 py-2">{show(snapshot.soldCount)}</td>
                      <td className="px-3 py-2">{show(snapshot.gmvContribution)}</td>
                      <td className="px-3 py-2">{show(snapshot.reviewCount)}</td>
                      <td className="px-3 py-2">{show(snapshot.sellerVideoCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
