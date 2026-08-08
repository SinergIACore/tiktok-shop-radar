import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { FlaskConical, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiError = { error: { code: string; message: string } };

interface IngestionSummary {
  received: number;
  productsCreated: number;
  productsUpdated: number;
  snapshotsCreated: number;
  snapshotsSkipped: number;
}

interface IngestResponse {
  ok: true;
  source: string;
  store: string;
  ingestion: IngestionSummary;
  productIds: string[];
}

interface StoredProduct {
  id: string;
  name: string | null;
  sellerName: string | null;
  sourceProductId: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface StoredSnapshot {
  observedAt: string;
  price: number | null;
  soldCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  sellerVideoCount: number | null;
  gmvContribution: number | null;
}

interface HistoryResponse {
  product: StoredProduct;
  snapshots: StoredSnapshot[];
  metrics: { soldCountDelta: number | null };
}

async function parse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error((payload as ApiError)?.error?.message ?? `Falha (${response.status}).`);
  }
  return payload as T;
}

const show = (value: number | string | null | undefined) =>
  value === null || value === undefined ? "—" : String(value);

export const Route = createFileRoute("/labs/product-history")({
  head: () => ({
    meta: [
      { title: "LAB — Persistência e histórico de produtos | TikRadar AI" },
      {
        name: "description",
        content:
          "Rota de laboratório para validar a ingestão persistente de produtos e os snapshots históricos do TikRadar AI.",
      },
      { property: "og:title", content: "LAB — Persistência e histórico de produtos" },
      {
        property: "og:description",
        content: "Ingestão manual de produtos reais e leitura dos snapshots persistidos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductHistoryLab,
});

function ProductHistoryLab() {
  const [keyword, setKeyword] = useState("women dress");
  const [limit, setLimit] = useState("5");
  const [selected, setSelected] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ["labs", "products"],
    queryFn: async () =>
      parse<{ store: string; items: StoredProduct[] }>(await fetch("/api/labs/products")),
  });

  const ingest = useMutation({
    mutationFn: async (input: { keyword: string; limit: number }) =>
      parse<IngestResponse>(
        await fetch("/api/labs/products/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["labs", "products"] }),
  });

  const history = useQuery({
    queryKey: ["labs", "history", selected],
    enabled: Boolean(selected),
    queryFn: async () =>
      parse<HistoryResponse>(await fetch(`/api/labs/products/${selected}/history`)),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number(limit);
    ingest.mutate({
      keyword: keyword.trim(),
      limit: Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.trunc(parsed), 20) : 5,
    });
  };

  const summary = ingest.data?.ingestion;
  const snapshots = history.data?.snapshots ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Persistência e histórico"
        description="Ingestão manual de produtos reais e leitura dos snapshots persistidos. Não afeta o Dashboard nem /products."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-alert/40 bg-alert/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-alert">
            <FlaskConical className="size-3.5" />
            LAB / Persistência
          </span>
        }
      />

      <form onSubmit={onSubmit} className="mt-6 flex flex-wrap items-end gap-4">
        <div className="min-w-56 flex-1">
          <Label htmlFor="keyword">Palavra-chave</Label>
          <Input
            id="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div className="w-28">
          <Label htmlFor="limit">Limite (máx. 20)</Label>
          <Input
            id="limit"
            type="number"
            min={1}
            max={20}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <Button type="submit" disabled={ingest.isPending || !keyword.trim()}>
          {ingest.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Executar ingestão
        </Button>
      </form>

      {ingest.isError && (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Falha na ingestão</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">{ingest.error.message}</p>
        </div>
      )}

      {summary && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Recebidos", summary.received],
            ["Criados", summary.productsCreated],
            ["Atualizados", summary.productsUpdated],
            ["Snapshots", summary.snapshotsCreated],
            ["Ignorados", summary.snapshotsSkipped],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="font-display text-xl">{value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-lg">Produtos persistidos</h2>
        <p className="mb-3 font-mono text-xs text-muted-foreground">
          store={products.data?.store ?? "—"}
        </p>
        {products.data?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum produto persistido ainda.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {products.data?.items.map((item) => (
            <Button
              key={item.id}
              variant={selected === item.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelected(item.id)}
            >
              {item.name ?? item.sourceProductId}
            </Button>
          ))}
        </div>
      </section>

      {selected && (
        <section className="mt-8">
          <h2 className="font-display text-lg">Snapshots</h2>
          <p className="mb-3 font-mono text-xs text-muted-foreground">
            soldCountDelta={show(history.data?.metrics.soldCountDelta ?? null)}
          </p>
          {history.isPending && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {snapshots.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Data/hora</th>
                    <th className="px-3 py-2">Preço</th>
                    <th className="px-3 py-2">Vendas</th>
                    <th className="px-3 py-2">Δ Vendas</th>
                    <th className="px-3 py-2">Avaliação</th>
                    <th className="px-3 py-2">Reviews</th>
                    <th className="px-3 py-2">Shop Videos</th>
                    <th className="px-3 py-2">GMV</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((snapshot, index) => {
                    const previous = index > 0 ? snapshots[index - 1] : undefined;
                    const delta =
                      typeof snapshot.soldCount === "number" &&
                      typeof previous?.soldCount === "number"
                        ? snapshot.soldCount - previous.soldCount
                        : null;
                    return (
                      <tr key={snapshot.observedAt + index} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs">
                          {new Date(snapshot.observedAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2">{show(snapshot.price)}</td>
                        <td className="px-3 py-2">{show(snapshot.soldCount)}</td>
                        <td className="px-3 py-2">{show(delta)}</td>
                        <td className="px-3 py-2">{show(snapshot.rating)}</td>
                        <td className="px-3 py-2">{show(snapshot.reviewCount)}</td>
                        <td className="px-3 py-2">{show(snapshot.sellerVideoCount)}</td>
                        <td className="px-3 py-2">{show(snapshot.gmvContribution)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
