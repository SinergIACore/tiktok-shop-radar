import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { ViralScore } from "@/components/intelligence/viral-score";
import { CreativeCard } from "@/components/intelligence/creative-card";
import { CreativeDetailSheet } from "@/components/intelligence/creative-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { categoryLabels, formatCompact, formatDate, formatPercent } from "@/lib/format";
import { productService } from "@/services/product.service";
import { creativeService } from "@/services/creative.service";
import type { Creative } from "@/types";

export const Route = createFileRoute("/products/$productId")({
  loader: async ({ params }) => {
    const product = await productService.getById(params.productId);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Produto indisponível — TikRadar AI" }, { name: "robots", content: "noindex" }],
      };
    }
    const { product } = loaderData;
    const description = `Viral Score ${product.viralScore}, crescimento ${formatPercent(product.growthRate, true)} e ${product.creatorCount} criadores monitorados.`;
    return {
      meta: [
        { title: `${product.name} — TikRadar AI` },
        { name: "description", content: description },
        { property: "og:title", content: `${product.name} — TikRadar AI` },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { product } = Route.useLoaderData();
  const [selected, setSelected] = useState<Creative | null>(null);

  const { data: creatives } = useQuery({
    queryKey: ["creatives", product.id],
    queryFn: () => creativeService.listByProduct(product.id),
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Produtos
      </Link>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <img
            src={product.thumbnail}
            alt={product.name}
            width={512}
            height={512}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="secondary">{categoryLabels[product.category]}</Badge>
              <h1 className="mt-3 font-display text-3xl font-semibold">{product.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Primeira detecção em {formatDate(product.firstDetectedAt)} · atualizado em{" "}
                {formatDate(product.lastUpdatedAt)}
              </p>
            </div>
            <ViralScore value={product.viralScore} size="lg" />
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Crescimento"
              value={formatPercent(product.growthRate, true)}
              tone="text-growth"
            />
            <Stat label="Engajamento" value={formatPercent(product.engagementRate)} />
            <Stat label="Vídeos encontrados" value={formatCompact(product.videoCount)} />
            <Stat label="Criadores" value={formatCompact(product.creatorCount)} />
          </dl>

          <div className="stat-tile p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Saturação de mercado</span>
              <span className="font-mono tabular-nums">{product.saturation}%</span>
            </div>
            <Progress value={product.saturation} className="h-2" />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Top Criativos</h2>
          <p className="text-sm text-muted-foreground">
            Selecione um criativo para abrir a análise (dados mockados).
          </p>
        </div>

        {creatives && creatives.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {creatives.map((creative) => (
              <CreativeCard key={creative.id} creative={creative} onSelect={setSelected} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum criativo mockado associado a este produto.
          </p>
        )}
      </section>

      <CreativeDetailSheet
        creative={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="stat-tile p-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-2 font-display text-2xl font-semibold tabular-nums ${tone ?? ""}`}>
        {value}
      </dd>
    </div>
  );
}
