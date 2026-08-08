import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Database, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  RealProductFilters,
  defaultRealFilters,
  type RealProductFiltersValue,
} from "@/components/intelligence/real-product-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DASH,
  deltaTone,
  formatDateTime,
  formatDelta,
  formatMoney,
  formatNumber,
  orDash,
} from "@/lib/real-format";
import { realProductService } from "@/services/real-product.service";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Produtos monitorados — TikRadar AI" },
      {
        name: "description",
        content:
          "Produtos reais persistidos do TikTok Shop com preço, vendas, GMV, reviews e variações entre snapshots.",
      },
      { property: "og:title", content: "Produtos monitorados — TikRadar AI" },
      {
        property: "og:description",
        content: "Preço, vendas, GMV, reviews e deltas históricos por produto persistido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [filters, setFilters] = useState<RealProductFiltersValue>(defaultRealFilters);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["real-products", filters, page],
    queryFn: () => realProductService.list({ ...filters, page }),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const items = query.data?.items ?? [];
  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter((c): c is string => !!c))].sort(),
    [items],
  );

  const applyFilters = (next: RealProductFiltersValue) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Produtos"
        description="Produtos reais persistidos, com o snapshot mais recente e as variações históricas."
        actions={
          query.data ? (
            <Badge variant={query.data.store === "postgres" ? "secondary" : "outline"}>
              <Database className="mr-1 size-3" />
              {query.data.store === "postgres"
                ? "PostgreSQL"
                : "Memória (ambiente sem persistência)"}
            </Badge>
          ) : null
        }
      />

      {query.data?.store === "memory" ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
          Ambiente sem DATABASE_URL: os dados vêm do repositório em memória e são voláteis.
        </p>
      ) : null}

      <RealProductFilters value={filters} onChange={applyFilters} categories={categories} />

      {query.isLoading ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Carregando produtos...</p>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-10 text-center">
          <AlertTriangle className="size-6 text-destructive" />
          <p className="text-sm font-medium">Não foi possível carregar os produtos.</p>
          <p className="text-xs text-muted-foreground">
            {(query.error as Error)?.message ?? "Erro de banco de dados."}
          </p>
          <Button size="sm" variant="secondary" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum produto persistido encontrado.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[320px]">Produto</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Δ vendas</TableHead>
                  <TableHead className="text-right">Vendas/h</TableHead>
                  <TableHead className="text-right">GMV</TableHead>
                  <TableHead className="text-right">Δ GMV</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Reviews</TableHead>
                  <TableHead className="text-right">Shop videos</TableHead>
                  <TableHead className="text-right">Última obs.</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link
                        to="/products/$productId"
                        params={{ productId: product.id }}
                        className="flex items-center gap-3"
                      >
                        {product.thumbnail ? (
                          <img
                            src={product.thumbnail}
                            alt={product.name ?? "Produto"}
                            loading="lazy"
                            width={44}
                            height={44}
                            className="size-11 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <div className="size-11 shrink-0 rounded-md bg-secondary" />
                        )}
                        <span className="line-clamp-2 text-sm font-medium hover:text-primary">
                          {orDash(product.name)}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {orDash(product.sellerName)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatMoney(product.latest?.price ?? null, product.currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(product.latest?.soldCount ?? null)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono tabular-nums ${deltaTone(product.metrics.soldCountDelta)}`}
                    >
                      {formatDelta(product.metrics.soldCountDelta)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(product.metrics.salesVelocity, 2)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatMoney(product.latest?.gmvContribution ?? null, product.currency)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono tabular-nums ${deltaTone(product.metrics.gmvDelta)}`}
                    >
                      {formatDelta(product.metrics.gmvDelta, 2)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(product.latest?.rating ?? null, 1)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(product.latest?.reviewCount ?? null)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(product.latest?.sellerVideoCount ?? null)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDateTime(product.latest?.observedAt ?? null)}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.productUrl ? (
                        <a
                          href={product.productUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-muted-foreground hover:text-primary"
                          aria-label="Abrir produto na origem"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{DASH}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {query.data?.total ?? 0} produtos · página {query.data?.page ?? 1} de{" "}
              {query.data?.totalPages ?? 1}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={(query.data?.page ?? 1) <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={(query.data?.page ?? 1) >= (query.data?.totalPages ?? 1)}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
