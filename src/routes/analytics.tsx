import { createFileRoute } from "@tanstack/react-router";
import { LineChart } from "lucide-react";

import { PlaceholderSection } from "@/components/layout/placeholder-section";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Análises — TikRadar AI" },
      {
        name: "description",
        content: "Área de análises comparativas de produtos, criadores e criativos.",
      },
      { property: "og:title", content: "Análises — TikRadar AI" },
      { property: "og:description", content: "Análises comparativas do TikRadar AI." },
    ],
  }),
  component: () => (
    <PlaceholderSection
      title="Análises"
      description="Comparativos e séries históricas."
      icon={LineChart}
      note="Área reservada. Será desenvolvida em uma próxima etapa."
    />
  ),
});
