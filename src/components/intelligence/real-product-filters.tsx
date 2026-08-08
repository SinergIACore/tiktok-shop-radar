import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { RealProductQuery, RealProductSort } from "@/types/product-view";

export type RealProductFiltersValue = Required<
  Pick<
    RealProductQuery,
    | "search"
    | "seller"
    | "category"
    | "minPrice"
    | "maxPrice"
    | "minSold"
    | "minReviews"
    | "minRating"
    | "hasHistory"
    | "sort"
    | "direction"
    | "limit"
  >
>;

export const defaultRealFilters: RealProductFiltersValue = {
  search: "",
  seller: "",
  category: "",
  minPrice: "",
  maxPrice: "",
  minSold: "",
  minReviews: "",
  minRating: "",
  hasHistory: false,
  sort: "lastObservedAt",
  direction: "desc",
  limit: 25,
};

const sortOptions: { value: RealProductSort; label: string }[] = [
  { value: "lastObservedAt", label: "Última observação" },
  { value: "soldCount", label: "Vendas atuais" },
  { value: "gmv", label: "GMV atual" },
  { value: "soldCountDelta", label: "Δ vendas" },
  { value: "gmvDelta", label: "Δ GMV" },
  { value: "salesVelocity", label: "Vendas/hora" },
];

interface Props {
  value: RealProductFiltersValue;
  onChange: (value: RealProductFiltersValue) => void;
  categories: string[];
}

export function RealProductFilters({ value, onChange, categories }: Props) {
  const set = <K extends keyof RealProductFiltersValue>(key: K, next: RealProductFiltersValue[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Buscar por nome" className="min-w-[220px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value.search}
              onChange={(event) => set("search", event.target.value)}
              placeholder="Nome do produto"
              className="pl-9"
            />
          </div>
        </Field>

        <Field label="Seller" className="min-w-[170px]">
          <Input
            value={value.seller}
            onChange={(event) => set("seller", event.target.value)}
            placeholder="Nome do seller"
          />
        </Field>

        <Field label="Categoria" className="min-w-[170px]">
          <Select
            value={value.category === "" ? "all" : value.category}
            onValueChange={(next) => set("category", next === "all" ? "" : next)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Ordenar por" className="min-w-[180px]">
          <Select value={value.sort} onValueChange={(next) => set("sort", next as RealProductSort)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Direção" className="min-w-[130px]">
          <Select
            value={value.direction}
            onValueChange={(next) => set("direction", next as "asc" | "desc")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Maior primeiro</SelectItem>
              <SelectItem value="asc">Menor primeiro</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Por página" className="min-w-[110px]">
          <Select
            value={String(value.limit)}
            onValueChange={(next) => set("limit", Number(next) as 10 | 25 | 50)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50].map((limit) => (
                <SelectItem key={limit} value={String(limit)}>
                  {limit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <NumberField
          label="Preço mín."
          value={value.minPrice}
          onChange={(next) => set("minPrice", next)}
        />
        <NumberField
          label="Preço máx."
          value={value.maxPrice}
          onChange={(next) => set("maxPrice", next)}
        />
        <NumberField
          label="Vendas mín."
          value={value.minSold}
          onChange={(next) => set("minSold", next)}
        />
        <NumberField
          label="Reviews mín."
          value={value.minReviews}
          onChange={(next) => set("minReviews", next)}
        />
        <NumberField
          label="Rating mín."
          value={value.minRating}
          step="0.1"
          onChange={(next) => set("minRating", next)}
        />

        <div className="flex items-center gap-2 pb-2">
          <Switch
            id="has-history"
            checked={value.hasHistory}
            onCheckedChange={(next) => set("hasHistory", next)}
          />
          <Label htmlFor="has-history" className="text-xs text-muted-foreground">
            Somente com histórico
          </Label>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-9"
          onClick={() => onChange({ ...defaultRealFilters, limit: value.limit })}
        >
          <X className="size-4" /> Limpar filtros
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <Field label={label} className="w-[120px]">
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="—"
      />
    </Field>
  );
}
