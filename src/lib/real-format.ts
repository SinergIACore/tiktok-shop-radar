/** Formatting helpers for real (persisted) product data. "—" for unknown. */

export const DASH = "—";

export function formatNumber(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatMoney(value: number | null | undefined, currency: string | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  const amount = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${currency} ${amount}` : amount;
}

export function formatDelta(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, fractionDigits)}`;
}

export function deltaTone(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0)
    return "text-muted-foreground";
  return value > 0 ? "text-growth" : "text-destructive";
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return DASH;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function orDash(value: string | null | undefined): string {
  return value && value.trim() !== "" ? value : DASH;
}
