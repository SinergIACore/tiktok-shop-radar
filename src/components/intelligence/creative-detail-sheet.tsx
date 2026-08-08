import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCompact, formatDuration, formatPercent } from "@/lib/format";
import type { Creative } from "@/types";

interface CreativeDetailSheetProps {
  creative: Creative | null;
  onOpenChange: (open: boolean) => void;
}

const NOT_CONNECTED = "Funcionalidade será conectada em uma próxima etapa.";

export function CreativeDetailSheet({ creative, onOpenChange }: CreativeDetailSheetProps) {
  return (
    <Sheet open={Boolean(creative)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {creative && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display">Análise do criativo</SheetTitle>
              <SheetDescription>
                {creative.creator.displayName} · {creative.creator.handle}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-8">
              <div className="overflow-hidden rounded-lg border border-border bg-secondary">
                <img
                  src={creative.thumbnail}
                  alt={`Criativo de ${creative.creator.displayName}`}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="aspect-[9/12] w-full object-cover"
                />
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Visualizações" value={formatCompact(creative.views)} />
                <Metric label="Curtidas" value={formatCompact(creative.likes)} />
                <Metric label="Comentários" value={formatCompact(creative.comments)} />
                <Metric label="Engajamento" value={formatPercent(creative.engagementRate)} />
                <Metric label="Duração" value={formatDuration(creative.durationSeconds)} />
              </dl>

              <Separator />

              <div className="space-y-4 text-sm">
                <Field label="Gancho" value={creative.analysis.hook} />
                <Field label="CTA" value={creative.analysis.cta} />
                <Field label="Legenda" value={creative.analysis.caption} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Hashtags</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {creative.analysis.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => toast.info(NOT_CONNECTED)}>Analisar Criativo</Button>
                <Button variant="outline" onClick={() => toast.info(NOT_CONNECTED)}>
                  Criar Minha Versão
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-base tabular-nums">{value}</dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}
