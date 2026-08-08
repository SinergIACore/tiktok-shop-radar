import { createFileRoute } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";

import { PlaceholderSection } from "@/components/layout/placeholder-section";

export const Route = createFileRoute("/creatives")({
  head: () => ({
    meta: [
      { title: "Criativos — TikRadar AI" },
      {
        name: "description",
        content: "Área de inteligência de criativos: ganchos, CTAs, legendas e hashtags.",
      },
      { property: "og:title", content: "Criativos — TikRadar AI" },
      { property: "og:description", content: "Inteligência de criativos do TikRadar AI." },
    ],
  }),
  component: () => (
    <PlaceholderSection
      title="Criativos"
      description="Biblioteca de criativos analisados."
      icon={Clapperboard}
      note="A análise de criativos está disponível a partir do detalhe de cada produto. Esta área será desenvolvida em uma próxima etapa."
    />
  ),
});
