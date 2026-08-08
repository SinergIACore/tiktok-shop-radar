import { Eye, Heart, MessageCircle, Timer } from "lucide-react";

import { formatCompact, formatDuration } from "@/lib/format";
import type { Creative } from "@/types";

interface CreativeCardProps {
  creative: Creative;
  onSelect: (creative: Creative) => void;
}

export function CreativeCard({ creative, onSelect }: CreativeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(creative)}
      className="stat-tile group overflow-hidden text-left transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-[9/12] overflow-hidden bg-secondary">
        <img
          src={creative.thumbnail}
          alt={`Criativo de ${creative.creator.displayName}`}
          loading="lazy"
          width={512}
          height={512}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[11px] tabular-nums backdrop-blur">
          <Timer className="size-3" />
          {formatDuration(creative.durationSeconds)}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <p className="text-sm font-medium">{creative.creator.displayName}</p>
        <p className="text-xs text-muted-foreground">{creative.creator.handle}</p>
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums">
            <Eye className="size-3.5" />
            {formatCompact(creative.views)}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Heart className="size-3.5" />
            {formatCompact(creative.likes)}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <MessageCircle className="size-3.5" />
            {formatCompact(creative.comments)}
          </span>
        </div>
      </div>
    </button>
  );
}
