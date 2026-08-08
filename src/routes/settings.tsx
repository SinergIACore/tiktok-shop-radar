import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Brain, HardDrive, Send, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — TikRadar AI" },
      {
        name: "description",
        content: "Áreas de configuração de integrações, IA, storage, publicação e sistema.",
      },
      { property: "og:title", content: "Configurações — TikRadar AI" },
      { property: "og:description", content: "Configuração de integrações do TikRadar AI." },
    ],
  }),
  component: SettingsPage,
});

const sections: { title: string; description: string; icon: LucideIcon }[] = [
  { title: "TikTok", description: "Coleta de produtos, vídeos e criadores.", icon: Boxes },
  { title: "Inteligência Artificial", description: "Análise e geração de criativos.", icon: Brain },
  { title: "Storage", description: "Armazenamento de arquivos e mídias.", icon: HardDrive },
  { title: "Publicação", description: "Distribuição de conteúdo gerado.", icon: Send },
  { title: "Sistema", description: "Preferências gerais da aplicação.", icon: Settings2 },
];

function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Configurações"
        description="Nenhuma integração é solicitada nesta etapa. Chaves privadas nunca serão armazenadas no frontend."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="stat-tile flex items-start gap-4 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <section.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-semibold">{section.title}</h2>
                <Badge variant="outline" className="text-muted-foreground">
                  Não configurado
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
