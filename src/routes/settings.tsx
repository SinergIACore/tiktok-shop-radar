import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Boxes, Brain, HardDrive, Loader2, Send, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TikTokState =
  | "not_configured"
  | "not_connected"
  | "connected"
  | "missing_scopes"
  | "token_expired"
  | "token_invalid";

type TikTokStatus = {
  configured: boolean;
  state: TikTokState;
  connected: boolean;
  market: string | null;
  expiresAt: string | null;
  openId: string | null;
  grantedScopes: string[];
  missingScopes: string[];
};

const STATE_LABEL: Record<TikTokState, string> = {
  not_configured: "Não configurado",
  not_connected: "Não conectado",
  connected: "Conectado",
  missing_scopes: "Scopes incompletos",
  token_expired: "Token expirado",
  token_invalid: "Token inválido ou revogado",
};

export const Route = createFileRoute("/settings")({
  validateSearch: (search: Record<string, unknown>) => ({
    tiktok: typeof search["tiktok"] === "string" ? (search["tiktok"] as string) : undefined,
    reason: typeof search["reason"] === "string" ? (search["reason"] as string) : undefined,
  }),
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
  { title: "Inteligência Artificial", description: "Análise e geração de criativos.", icon: Brain },
  { title: "Storage", description: "Armazenamento de arquivos e mídias.", icon: HardDrive },
  { title: "Publicação", description: "Distribuição de conteúdo gerado.", icon: Send },
  { title: "Sistema", description: "Preferências gerais da aplicação.", icon: Settings2 },
];

function TikTokCard() {
  const search = useSearch({ from: "/settings" });
  const status = useQuery<TikTokStatus>({
    queryKey: ["tiktok-integration-status"],
    queryFn: async () => {
      const response = await fetch("/api/integrations/tiktok/status");
      if (!response.ok) throw new Error("Falha ao consultar o status da integração.");
      return (await response.json()) as TikTokStatus;
    },
  });

  const data = status.data;
  const connected = data?.connected ?? false;
  const configured = data?.configured ?? false;
  const state: TikTokState = data?.state ?? "not_configured";

  return (
    <div className="stat-tile flex items-start gap-4 p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <Boxes className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-base font-semibold">TikTok</h2>
          {status.isPending ? (
            <Badge variant="outline" className="text-muted-foreground">
              <Loader2 className="mr-1 size-3 animate-spin" /> Verificando
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={
                connected ? "border-primary/40 text-primary" : "text-muted-foreground"
              }
            >
              {STATE_LABEL[state]}
            </Badge>
          )}
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Autorização de Creator (Affiliate Creator API).
        </p>

        {data && state !== "not_configured" && state !== "not_connected" && (
          <p className="mt-1 text-sm text-muted-foreground">
            Creator: <span className="text-foreground">{data.openId ?? "não informado"}</span>
            {data.market ? ` · Mercado: ${data.market}` : ""}
          </p>
        )}

        {data && data.missingScopes.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Scopes ausentes: {data.missingScopes.join(", ")}
          </p>
        )}

        {search.tiktok === "error" && (
          <p className="mt-2 text-sm text-destructive">
            Não foi possível concluir a autorização.
            {search.reason ? ` (${search.reason})` : ""}
          </p>
        )}
        {search.tiktok === "connected" && !connected && (
          <p className="mt-2 text-sm text-muted-foreground">Autorização recebida.</p>
        )}

        {configured && (
          <div className="mt-3">
            <Button asChild size="sm" variant={connected ? "outline" : "default"}>
              <a href="/api/auth/tiktok/connect">
                {connected ? "Reconectar" : "Conectar TikTok Shop"}
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Configurações"
        description="Nenhuma integração é solicitada nesta etapa. Chaves privadas nunca serão armazenadas no frontend."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TikTokCard />
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

