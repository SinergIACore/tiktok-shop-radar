import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { categoryLabels } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductCategory, ProductSortKey, TimeRange } from "@/types";

const ranges: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "24 horas" },
  { value: "3d", label: "3 dias" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

const sortOptions: { value: ProductSortKey; label: string }[] = [
  { value: "viralScore", label: "Viral Score" },
  { value: "growthRate", label: "Crescimento" },
  { value: "engagementRate", label: "Engajamento" },
  { value: "creatorCount", label: "Criadores" },
];

const categories = Object.keys(categoryLabels) as ProductCategory[];

export interface ProductFiltersValue {
  range: TimeRange;
  category: ProductCategory | "all";
  sortBy: ProductSortKey;
}

interface ProductFiltersProps {
  value: ProductFiltersValue;
  onChange: (value: ProductFiltersValue) => void;
}

export function ProductFilters({ value, onChange }: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-border bg-card p-1">
        {ranges.map((range) => (
          <Button
            key={range.value}
            type="button"
            size="sm"
            variant={value.range === range.value ? "secondary" : "ghost"}
            className={cn("h-8 px-3 text-xs", value.range === range.value && "text-primary")}
            onClick={() => onChange({ ...value, range: range.value })}
          >
            {range.label}
          </Button>
        ))}
      </div>

      <Select
        value={value.category}
        onValueChange={(next) =>
          onChange({ ...value, category: next as ProductCategory | "all" })
        }
      >
        <SelectTrigger className="h-10 w-[170px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {categoryLabels[category]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.sortBy}
        onValueChange={(next) => onChange({ ...value, sortBy: next as ProductSortKey })}
      >
        <SelectTrigger className="h-10 w-[190px]">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              Ordenar por {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
