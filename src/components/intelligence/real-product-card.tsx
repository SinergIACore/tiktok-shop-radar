import { Link } from "@tanstack/react-router";

import {
  DASH,
  deltaTone,
  formatDateTime,
  formatDelta,
  formatMoney,
  formatNumber,
  orDash,
} from "@/lib/real-format";
import type { ProductListViewModel } from "@/types/product-view";

/**
 * Product card for real persisted data (Stage 02B.4).
 * Same visual DNA as the mock card, but shows only stored fields; unknown
 * values render as "—". Clicking navigates to /products/:id.
 */
export function RealProductCard({ product }: { product: ProductListViewModel }) {
  const latest = product.latest;

  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name ?? "Produto monitorado"}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            {DASH}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground backdrop-blur">
          {orDash(product.category)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-sm font-medium group-hover:text-primary">
          {orDash(product.name)}
        </h3>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <Field label="Preço" value={formatMoney(latest?.price ?? null, product.currency)} />
          <Field label="Vendas" value={formatNumber(latest?.soldCount ?? null)} />
          <Field label="GMV" value={formatMoney(latest?.gmvContribution ?? null, product.currency)} />
          <Field
            label="Δ vendas"
            value={formatDelta(product.metrics.soldCountDelta)}
            tone={deltaTone(product.metrics.soldCountDelta)}
          />
          <Field label="Rating" value={formatNumber(latest?.rating ?? null, 1)} />
          <Field label="Reviews" value={formatNumber(latest?.reviewCount ?? null)} />
          <Field label="Shop videos" value={formatNumber(latest?.sellerVideoCount ?? null)} />
          <Field label="Última obs." value={formatDateTime(latest?.observedAt ?? null)} />
        </dl>
      </div>
    </Link>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`font-mono tabular-nums ${tone ?? "text-foreground"}`}>{value}</dd>
    </div>
  );
}
