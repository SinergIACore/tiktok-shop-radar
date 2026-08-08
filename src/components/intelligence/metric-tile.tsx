import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface MetricTileProps {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone?: "default" | "growth" | "alert" | "opportunity";
}

const toneMap = {
  default: "text-primary bg-primary/10",
  growth: "text-growth bg-growth/10",
  alert: "text-alert bg-alert/10",
  opportunity: "text-opportunity bg-opportunity/10",
} as const;

export function MetricTile({ label, value, delta, icon: Icon, tone = "default" }: MetricTileProps) {
  return (
    <div className="stat-tile p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-md", toneMap[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {delta && <p className={cn("mt-1 text-xs", toneMap[tone].split(" ")[0])}>{delta}</p>}
    </div>
  );
}
