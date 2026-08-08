import { Link } from "@tanstack/react-router";
import { TrendingUp, Users, Video, Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ViralScore } from "./viral-score";
import { categoryLabels, formatCompact, formatPercent } from "@/lib/format";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      className="group stat-tile flex flex-col overflow-hidden transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={product.thumbnail}
          alt={product.name}
          loading="lazy"
          width={512}
          height={512}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <Badge variant="secondary" className="absolute left-3 top-3 backdrop-blur">
          {categoryLabels[product.category] ?? product.category}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold leading-snug">{product.name}</h3>
          <ViralScore value={product.viralScore} size="sm" showLabel={false} />
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-growth">
            <TrendingUp className="size-4" />
            <span className="tabular-nums">{formatPercent(product.growthRate, true)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="size-4" />
            <span className="tabular-nums">{formatPercent(product.engagementRate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Video className="size-4" />
            <span className="tabular-nums">{formatCompact(product.videoCount)} vídeos</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4" />
            <span className="tabular-nums">{formatCompact(product.creatorCount)} criadores</span>
          </div>
        </dl>

        <div className="mt-auto">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Saturação</span>
            <span className="tabular-nums">{product.saturation}%</span>
          </div>
          <Progress value={product.saturation} className="h-1.5" />
        </div>
      </div>
    </Link>
  );
}
