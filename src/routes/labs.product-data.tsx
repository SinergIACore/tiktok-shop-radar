import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { FlaskConical, Loader2, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductSearchResult } from "@/services/providers/product-data/types/external-product.types";

type ApiError = { error: { code: string; message: string } };

async function searchProducts(params: {
  keyword: string;
  limit: number;
}): Promise<ProductSearchResult> {
  const query = new URLSearchParams({
    keyword: params.keyword,
    limit: String(params.limit),
  });
  const response = await fetch(`/api/products/search?${query.toString()}`);
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      (payload as ApiError)?.error?.message ?? `Falha na consulta (${response.status}).`;
    throw new Error(message);
  }
  return payload as ProductSearchResult;
}

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return "—";
  return `${currency ? `${currency} ` : ""}${price.toLocaleString("pt-BR")}`;
}

export const Route = createFileRoute("/labs/product-data")({
  head: () => ({
    meta: [
      { title: "LAB — Prova de dados de produtos | TikRadar AI" },
      {
        name: "description",
        content:
          "Rota de laboratório para provar a aquisição de dados reais de produtos do TikTok Shop via provider externo.",
      },
      { property: "og:title", content: "LAB — Prova de dados de produtos" },
      {
        property: "og:description",
        content: "Consulta técnica de produtos reais via ProductDataProvider.",
      },
    ],
  }),
  component: ProductDataLab,
});

function ProductDataLab() {
  const [keyword, setKeyword] = useState("women dress");
  const [limit, setLimit] = useState("10");

  const mutation = useMutation({
    mutationFn: searchProducts,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number(limit);
    mutation.mutate({
      keyword: keyword.trim(),
      limit: Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 10,
    });
  };

  const result = mutation.data;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Prova de dados de produtos"
        description="Consulta real ao provider externo. Não afeta o Dashboard nem a página Produtos."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-alert/40 bg-alert/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-alert">
            <FlaskConical className="size-3.5" />
            LAB / Prova de dados
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
            placeholder="women dress"
            className="mt-1.5"
          />
        </div>
        <div className="w-28">
          <Label htmlFor="limit">Limite</Label>
          <Input
            id="limit"
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <Button type="submit" disabled={mutation.isPending || !keyword.trim()}>
          {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Buscar produtos reais
        </Button>
      </form>

      <div className="mt-8">
        {mutation.isPending && (
          <p className="text-sm text-muted-foreground">Consultando provider externo…</p>
        )}

        {mutation.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">Falha na consulta</p>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {mutation.error.message}
            </p>
          </div>
        )}

        {result && result.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum resultado retornado para esta palavra-chave.
          </p>
        )}

        {result && result.items.length > 0 && (
          <>
            <p className="mb-3 font-mono text-xs text-muted-foreground">
              source={result.source} · results={result.count} · duration={result.durationMs}ms
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Imagem</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Preço</th>
                    <th className="px-3 py-2">Vendas</th>
                    <th className="px-3 py-2">Avaliação</th>
                    <th className="px-3 py-2">Reviews</th>
                    <th className="px-3 py-2">Seller</th>
                    <th className="px-3 py-2">Shop Videos</th>
                    <th className="px-3 py-2">GMV</th>
                    <th className="px-3 py-2">URL</th>
                    <th className="px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.name ?? "Produto"}
                            loading="lazy"
                            className="size-12 rounded object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="max-w-72 px-3 py-2">{item.name ?? "—"}</td>
                      <td className="px-3 py-2">{formatPrice(item.price, item.currency)}</td>
                      <td className="px-3 py-2">{item.soldCount ?? "—"}</td>
                      <td className="px-3 py-2">{item.rating ?? "—"}</td>
                      <td className="px-3 py-2">{item.reviewCount ?? "—"}</td>
                      <td className="px-3 py-2">{item.sellerName ?? "—"}</td>
                      <td className="px-3 py-2">{item.sellerVideoCount ?? "—"}</td>
                      <td className="px-3 py-2">{item.gmvContribution ?? "—"}</td>
                      <td className="px-3 py-2">
                        {item.productUrl ? (
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            abrir <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
