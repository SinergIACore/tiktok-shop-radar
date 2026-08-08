import { cn } from "@/lib/utils";

interface ViralScoreProps {
  /** 0-100 */
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function tone(value: number) {
  if (value >= 85) return "text-viral";
  if (value >= 70) return "text-growth";
  if (value >= 50) return "text-alert";
  return "text-muted-foreground";
}

export function ViralScore({ value, size = "md", showLabel = true, className }: ViralScoreProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const dimension = size === "lg" ? 88 : size === "md" ? 60 : 44;
  const stroke = size === "lg" ? 7 : 5;
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg width={dimension} height={dimension} className="-rotate-90">
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            strokeWidth={stroke}
            className="fill-none stroke-border"
          />
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("fill-none transition-[stroke-dashoffset]", tone(clamped))}
            stroke="currentColor"
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-mono font-semibold",
            size === "lg" ? "text-xl" : size === "md" ? "text-sm" : "text-xs",
            tone(clamped),
          )}
        >
          {Math.round(clamped)}
        </span>
      </div>
      {showLabel && (
        <div className="leading-tight">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Viral Score</p>
          <p className="text-xs text-muted-foreground">0–100</p>
        </div>
      )}
    </div>
  );
}
