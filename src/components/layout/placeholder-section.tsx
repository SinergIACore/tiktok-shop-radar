import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

interface PlaceholderSectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  note: string;
}

export function PlaceholderSection({
  title,
  description,
  icon: Icon,
  note,
}: PlaceholderSectionProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
