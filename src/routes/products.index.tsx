import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutGrid, Rows3 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ProductCard } from "@/components/intelligence/product-card";
import {
  ProductFilters,
  type ProductFiltersValue,
} from "@/components/intelligence/product-filters";
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
import { categoryLabels, formatCompact, formatDate, formatPercent } from "@/lib/format";
import { productService } from "@/services/product.service";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Produtos monitorados — TikRadar AI" },
      {
        name: "description",
        content:
          "Listagem completa dos produtos monitorados com Viral Score, crescimento, engajamento e saturação.",
      },
      { property: "og:title", content: "Produtos monitorados — TikRadar AI" },
      {
        property: "og:description",
        content: "Viral Score, crescimento, engajamento e saturação por produto.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [filters, setFilters] = useState<ProductFiltersValue>({
    range: "7d",
    category: "all",
    sortBy: "viralScore",
  });
  const [view, setView] = useState<"grid" | "table">("grid");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "all", filters],
    queryFn: () =>
      productService.list({
        range: filters.range,
        category: filters.category,
        sortBy: filters.sortBy,
      }),
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Produtos"
        description="Todos os produtos atualmente sob monitoramento."
        actions={
          <div className="flex rounded-lg border border-border bg-card p-1">
            <Button
              size="sm"
              variant={view === "grid" ? "secondary" : "ghost"}
              className="h-8 px-3"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="size-4" />
              <span className="ml-1 text-xs">Grade</span>
            </Button>
            <Button
              size="sm"
              variant={view === "table" ? "secondary" : "ghost"}
              className="h-8 px-3"
              onClick={() => setView("table")}
            >
              <Rows3 className="size-4" />
              <span className="ml-1 text-xs">Tabela</span>
            </Button>
          </div>
        }
      />

      <ProductFilters value={filters} onChange={setFilters} />

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : view === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products?.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Viral Score</TableHead>
                <TableHead className="text-right">Crescimento</TableHead>
                <TableHead className="text-right">Engajamento</TableHead>
                <TableHead className="text-right">Vídeos</TableHead>
                <TableHead className="text-right">Criadores</TableHead>
                <TableHead className="text-right">Saturação</TableHead>
                <TableHead className="text-right">Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link
                      to="/products/$productId"
                      params={{ productId: product.id }}
                      className="font-medium hover:text-primary"
                    >
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoryLabels[product.category]}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-viral">
                    {product.viralScore}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-growth">
                    {formatPercent(product.growthRate, true)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatPercent(product.engagementRate)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCompact(product.videoCount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCompact(product.creatorCount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {product.saturation}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDate(product.lastUpdatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
