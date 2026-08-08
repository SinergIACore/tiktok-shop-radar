import { Database, FlaskConical } from "lucide-react";

import { cn } from "@/lib/utils";

type DataSourceKind = "postgres" | "mock";

interface DataSourceBadgeProps {
  kind: DataSourceKind;
  /** Store name reported by the API ("postgres" | "memory"). */
  store?: string;
  className?: string;
}

/**
 * Contextual data-source indicator (Stage 02B.4). Replaces the old global
 * "dados mockados" badge: some screens are real, others are still demos.
 */
export function DataSourceBadge({ kind, store, className }: DataSourceBadgeProps) {
  const isReal = kind === "postgres";
  const Icon = isReal ? Database : FlaskConical;
  const label = isReal
    ? `Dados reais · ${(store ?? "postgresql").toUpperCase()}`
    : "Dados mockados · demonstração";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wide",
        isReal
          ? "border-growth/40 bg-growth/10 text-growth"
          : "border-border bg-secondary/40 text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
