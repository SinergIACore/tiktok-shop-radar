import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";

import { PlaceholderSection } from "@/components/layout/placeholder-section";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Biblioteca — TikRadar AI" },
      {
        name: "description",
        content: "Biblioteca de materiais salvos, referências e versões geradas.",
      },
      { property: "og:title", content: "Biblioteca — TikRadar AI" },
      { property: "og:description", content: "Materiais salvos e referências do TikRadar AI." },
    ],
  }),
  component: () => (
    <PlaceholderSection
      title="Biblioteca"
      description="Materiais salvos e referências."
      icon={Library}
      note="Área reservada. Será desenvolvida em uma próxima etapa."
    />
  ),
});
