import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  deltaTone,
  formatDateTime,
  formatDelta,
  formatMoney,
  formatNumber,
  orDash,
} from "@/lib/real-format";
import { realProductService } from "@/services/real-product.service";

export const Route = createFileRoute("/products/$productId")({
  head: () => ({
    meta: [
      { title: "Detalhe do produto — TikRadar AI" },
      {
        name: "description",
        content:
          "Snapshot mais recente, variações históricas e linha do tempo completa de um produto persistido.",
      },
      { property: "og:title", content: "Detalhe do produto — TikRadar AI" },
      {
        property: "og:description",
        content: "Preço, vendas, GMV, reviews e histórico cronológico do produto.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const query = useQuery({
    queryKey: ["real-product", productId],
    queryFn: () => realProductService.getById(productId),
    retry: false,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Produtos
      </Link>

      {query.isLoading ? (
        <>
          <p className="text-sm text-muted-foreground">Carregando produto...</p>
          <Skeleton className="h-80 rounded-xl" />
        </>
      ) : query.isError || !query.data ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-10 text-center">
          <AlertTriangle className="size-6 text-destructive" />
          <p className="text-sm font-medium">Não foi possível carregar o produto.</p>
          <p className="text-xs text-muted-foreground">
            {(query.error as Error)?.message ?? "Erro de banco de dados."}
          </p>
        </div>
      ) : (
        <ProductDetail data={query.data} />
      )}
    </div>
  );
}

function ProductDetail({ data }: { data: Awaited<ReturnType<typeof realProductService.getById>> }) {
  const { product, history } = data;
  const currency = product.currency;

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={product.name ?? "Produto"}
              width={512}
              height={512}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="aspect-square w-full bg-secondary" />
          )}
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {product.category ? <Badge variant="secondary">{product.category}</Badge> : null}
                <Badge variant="outline">{product.source}</Badge>
                {product.countryCode ? (
                  <Badge variant="outline">{product.countryCode}</Badge>
                ) : null}
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold">{orDash(product.name)}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Seller {orDash(product.sellerName)} · Marca {orDash(product.brand)} · Empresa{" "}
                {orDash(product.businessName)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Primeira observação {formatDateTime(product.firstSeenAt)} · última{" "}
                {formatDateTime(product.lastSeenAt)} · {product.snapshotCount} snapshots
              </p>
              {product.productUrl ? (
                <a
                  href={product.productUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Abrir na origem <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Preço atual"
              value={formatMoney(product.latest?.price ?? null, currency)}
            />
            <Stat label="Vendas atuais" value={formatNumber(product.latest?.soldCount ?? null)} />
            <Stat label="Rating" value={formatNumber(product.latest?.rating ?? null, 1)} />
            <Stat label="Reviews" value={formatNumber(product.latest?.reviewCount ?? null)} />
            <Stat
              label="Shop videos"
              value={formatNumber(product.latest?.sellerVideoCount ?? null)}
            />
            <Stat
              label="GMV"
              value={formatMoney(product.latest?.gmvContribution ?? null, currency)}
            />
            <Stat
              label="Δ vendas"
              value={formatDelta(product.metrics.soldCountDelta)}
              tone={deltaTone(product.metrics.soldCountDelta)}
            />
            <Stat
              label="Δ GMV"
              value={formatDelta(product.metrics.gmvDelta, 2)}
              tone={deltaTone(product.metrics.gmvDelta)}
            />
            <Stat
              label="Δ reviews"
              value={formatDelta(product.metrics.reviewCountDelta)}
              tone={deltaTone(product.metrics.reviewCountDelta)}
            />
            <Stat
              label="Δ shop videos"
              value={formatDelta(product.metrics.sellerVideoCountDelta)}
              tone={deltaTone(product.metrics.sellerVideoCountDelta)}
            />
            <Stat label="Intervalo (h)" value={formatNumber(product.metrics.timeDeltaHours, 2)} />
            <Stat label="Vendas/hora" value={formatNumber(product.metrics.salesVelocity, 2)} />
          </dl>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Histórico de snapshots</h2>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum snapshot registrado para este produto.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">GMV</TableHead>
                  <TableHead className="text-right">Reviews</TableHead>
                  <TableHead className="text-right">Shop Videos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(snapshot.observedAt)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatMoney(snapshot.price, currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(snapshot.soldCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatMoney(snapshot.gmvContribution, currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(snapshot.reviewCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(snapshot.sellerVideoCount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
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
