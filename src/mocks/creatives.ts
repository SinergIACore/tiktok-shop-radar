import type { Creative } from "@/types";

import beautyDevice from "@/assets/products/beauty-device.jpg";
import miniProjector from "@/assets/products/mini-projector.jpg";
import tumbler from "@/assets/products/tumbler.jpg";
import petBrush from "@/assets/products/pet-brush.jpg";

/**
 * Mocked creatives used exclusively for interface development.
 * No video is fetched, downloaded or played in this stage.
 */
export const mockCreatives: Creative[] = [
  {
    id: "crv-001",
    productId: "prd-001",
    thumbnail: beautyDevice,
    creator: { handle: "@glow.lab", displayName: "Glow Lab" },
    views: 2840000,
    likes: 312000,
    comments: 8400,
    engagementRate: 12.1,
    durationSeconds: 27,
    analysis: {
      hook: "Eu testei por 14 dias e nao esperava esse resultado.",
      cta: "Link na bio enquanto o estoque durar.",
      caption: "Rotina de skincare em 3 passos com o aparelho que viralizou.",
      hashtags: ["#skincare", "#tiktokshop", "#glowup"],
    },
    publishedAt: "2026-08-02T18:20:00.000Z",
  },
  {
    id: "crv-002",
    productId: "prd-001",
    thumbnail: beautyDevice,
    creator: { handle: "@rotina.real", displayName: "Rotina Real" },
    views: 1120000,
    likes: 96000,
    comments: 3120,
    engagementRate: 8.8,
    durationSeconds: 34,
    analysis: {
      hook: "Pare de gastar com limpeza de pele em salao.",
      cta: "Toca no carrinho amarelo.",
      caption: "Comparativo antes e depois com prova social.",
      hashtags: ["#beleza", "#antesedepois"],
    },
    publishedAt: "2026-08-04T21:05:00.000Z",
  },
  {
    id: "crv-003",
    productId: "prd-002",
    thumbnail: miniProjector,
    creator: { handle: "@setup.br", displayName: "Setup BR" },
    views: 3960000,
    likes: 402000,
    comments: 11200,
    engagementRate: 10.4,
    durationSeconds: 21,
    analysis: {
      hook: "Transformei minha parede em cinema por menos de R$ 300.",
      cta: "Confere o link fixado.",
      caption: "Setup de cinema em casa em 20 segundos.",
      hashtags: ["#setup", "#achadinhos", "#cinemaemcasa"],
    },
    publishedAt: "2026-08-01T23:40:00.000Z",
  },
  {
    id: "crv-004",
    productId: "prd-003",
    thumbnail: tumbler,
    creator: { handle: "@daily.sip", displayName: "Daily Sip" },
    views: 780000,
    likes: 51000,
    comments: 1900,
    engagementRate: 6.7,
    durationSeconds: 18,
    analysis: {
      hook: "Gelo intacto depois de 12 horas no carro.",
      cta: "Garanta o seu hoje.",
      caption: "Teste de temperatura em tempo real.",
      hashtags: ["#copotermico", "#teste"],
    },
    publishedAt: "2026-08-05T15:10:00.000Z",
  },
  {
    id: "crv-005",
    productId: "prd-004",
    thumbnail: petBrush,
    creator: { handle: "@petcasa", displayName: "Pet Casa" },
    views: 1640000,
    likes: 188000,
    comments: 6100,
    engagementRate: 11.8,
    durationSeconds: 25,
    analysis: {
      hook: "A quantidade de pelo que saiu me assustou.",
      cta: "Corre que esgota.",
      caption: "Escova com limpeza automatica em acao.",
      hashtags: ["#pets", "#petlovers", "#achadinhos"],
    },
    publishedAt: "2026-08-06T12:55:00.000Z",
  },
];
