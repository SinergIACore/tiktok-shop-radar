import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Clock, Database, History, Layers } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MetricTile } from "@/components/intelligence/metric-tile";
import { DataSourceBadge } from "@/components/intelligence/data-source-badge";
import { RealProductCard } from "@/components/intelligence/real-product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { DASH, formatDateTime, formatNumber } from "@/lib/real-format";
import { dashboardService } from "@/services/dashboard.service";
import type { ProductListViewModel } from "@/types/product-view";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TikRadar AI" },
      {
        name: "description",
        content:
          "Painel com produtos monitorados, snapshots coletados e listagens objetivas de vendas e GMV persistidos.",
      },
      { property: "og:title", content: "Dashboard — TikRadar AI" },
      {
        property: "og:description",
        content: "Produtos monitorados, histórico coletado e rankings objetivos de vendas e GMV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardService.load(),
  });

  const data = query.data;
  const summary = data?.summary;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Dashboard"
        description="Visão consolidada dos produtos persistidos e das coletas históricas."
        actions={<DataSourceBadge kind="postgres" store={data?.store ?? "postgresql"} />}
      />

      {query.isError ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Não foi possível carregar o dashboard.</p>
            <p className="text-muted-foreground">
              {(query.error as Error).message} Nenhum dado de demonstração é exibido no lugar.
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {query.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))
        ) : (
          <>
            <MetricTile
              label="Produtos monitorados"
              value={formatNumber(summary?.productsMonitored ?? null)}
              icon={Database}
              delta={`${formatNumber(summary?.newProducts24h ?? null)} novos nas últimas 24h`}
            />
            <MetricTile
              label="Produtos com histórico"
              value={formatNumber(summary?.productsWithHistory ?? null)}
              icon={History}
              tone="growth"
            />
            <MetricTile
              label="Snapshots coletados"
              value={formatNumber(summary?.snapshotsCollected ?? null)}
              icon={Layers}
              tone="alert"
              delta={`${formatNumber(summary?.snapshots24h ?? null)} nas últimas 24h`}
            />
            <MetricTile
              label="Última coleta"
              value={summary?.lastObservationAt ? formatDateTime(summary.lastObservationAt) : DASH}
              icon={Clock}
              tone="opportunity"
            />
          </>
        )}
      </section>

      <ProductSection
        title="Mais vendidos"
        description="Ordenados por vendas do snapshot mais recente."
        items={data?.mostSold}
        loading={query.isLoading}
      />
      <ProductSection
        title="Maior GMV"
        description="Ordenados pela contribuição de GMV do snapshot mais recente."
        items={data?.highestGmv}
        loading={query.isLoading}
      />
      <ProductSection
        title="Maior variação absoluta de vendas"
        description="Somente produtos com dois ou mais snapshots coletados."
        items={data?.biggestSoldDelta}
        loading={query.isLoading}
      />
      <ProductSection
        title="Observados recentemente"
        description="Ordenados pela data da última observação registrada."
        items={data?.recentlyObserved}
        loading={query.isLoading}
      />
    </div>
  );
}

function ProductSection({
  title,
  description,
  items,
  loading,
}: {
  title: string;
  description: string;
  items: ProductListViewModel[] | undefined;
  loading: boolean;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Ver todos <ArrowRight className="size-4" />
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum produto persistido para esta listagem.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((product) => (
            <RealProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
