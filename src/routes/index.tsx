import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Package, TrendingUp, Clapperboard, Target, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MetricTile } from "@/components/intelligence/metric-tile";
import { ProductCard } from "@/components/intelligence/product-card";
import {
  ProductFilters,
  type ProductFiltersValue,
} from "@/components/intelligence/product-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { productService } from "@/services/product.service";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TikRadar AI" },
      {
        name: "description",
        content:
          "Painel de monitoramento de produtos em ascensão, criativos analisados e oportunidades detectadas.",
      },
      { property: "og:title", content: "Dashboard — TikRadar AI" },
      {
        property: "og:description",
        content: "Monitoramento de produtos e criativos em tempo quase real.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [filters, setFilters] = useState<ProductFiltersValue>({
    range: "7d",
    category: "all",
    sortBy: "viralScore",
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", filters],
    queryFn: () =>
      productService.list({
        range: filters.range,
        category: filters.category,
        sortBy: filters.sortBy,
        limit: 6,
      }),
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Dashboard"
        description="Visão consolidada do radar de produtos e criativos."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Produtos monitorados" value="248" icon={Package} delta="8 novos hoje" />
        <MetricTile
          label="Produtos em ascensão"
          value="37"
          icon={TrendingUp}
          tone="growth"
          delta="+18,4% na semana"
        />
        <MetricTile
          label="Criativos analisados"
          value="1.902"
          icon={Clapperboard}
          tone="alert"
          delta="312 nas últimas 24h"
        />
        <MetricTile
          label="Oportunidades detectadas"
          value="12"
          icon={Target}
          tone="opportunity"
          delta="baixa saturação"
        />
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Produtos em Ascensão</h2>
            <p className="text-sm text-muted-foreground">
              Ordenados por sinal de crescimento no período selecionado.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>

        <ProductFilters value={filters} onChange={setFilters} />

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-96 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products?.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </div>
  );
}
