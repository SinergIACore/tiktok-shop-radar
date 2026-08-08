import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Compass, Play, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DASH, formatDateTime, formatMoney, formatNumber, orDash } from "@/lib/real-format";
import { discoveryService } from "@/services/discovery.service";
import type { DiscoveryRunResponse, SearchType } from "@/types/discovery";

export const Route = createFileRoute("/discovery")({
  head: () => ({
    meta: [
      { title: "Descoberta de produtos — TikRadar AI" },
      {
        name: "description",
        content:
          "Pesquise produtos do TikTok Shop por palavra-chave, nome ou nicho e ingira os resultados com limites de custo controlados.",
      },
      { property: "og:title", content: "Descoberta de produtos — TikRadar AI" },
      {
        property: "og:description",
        content: "Pesquisas manuais por palavra-chave, nome de produto e nicho, com ingestão real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoveryPage,
});

const TREND_LABEL: Record<string, string> = {
  insufficient_data: "DADOS INSUFICIENTES",
  accelerating: "Acelerando",
  growing: "Crescendo",
  stable: "Estável",
  decelerating: "Desacelerando",
  declining: "Em queda",
};

const TYPE_LABEL: Record<SearchType, string> = {
  keyword: "Palavra-chave",
  product_name: "Nome de produto",
  niche: "Nicho",
};

function DiscoveryPage() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<DiscoveryRunResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const niches = useQuery({
    queryKey: ["discovery-niches"],
    queryFn: () => discoveryService.listNiches(),
    retry: false,
  });

  const searches = useQuery({
    queryKey: ["discovery-searches"],
    queryFn: () => discoveryService.listSearches({ limit: 50 }),
    retry: false,
  });

  const onRunSuccess = (data: DiscoveryRunResponse) => {
    setResult(data);
    setRunError(null);
    void queryClient.invalidateQueries({ queryKey: ["discovery-searches"] });
  };
  const onRunError = (error: unknown) => {
    setResult(null);
    setRunError(error instanceof Error ? error.message : "Falha na execução.");
  };

  // Quick search ------------------------------------------------------------
  const [quickQuery, setQuickQuery] = useState("");
  const [quickType, setQuickType] = useState<"keyword" | "product_name">("keyword");
  const [quickLimit, setQuickLimit] = useState(5);

  const quickRun = useMutation({
    mutationFn: () =>
      discoveryService.quickSearch({
        query: quickQuery,
        type: quickType,
        maxProductsPerTerm: quickLimit,
      }),
    onSuccess: onRunSuccess,
    onError: onRunError,
  });

  // Niche run ---------------------------------------------------------------
  const [nicheLimits, setNicheLimits] = useState({ terms: 5, products: 5 });
  const nicheRun = useMutation({
    mutationFn: async (nicheKey: string) => {
      const niche = niches.data?.niches.find((entry) => entry.key === nicheKey);
      if (!niche) throw new Error("Nicho indisponível.");
      const search = await discoveryService.createSearch({
        name: niche.name,
        type: "niche",
        nicheKey: niche.key,
        terms: niche.terms,
      });
      return discoveryService.runSearch(search.id, {
        maxTermsPerRun: nicheLimits.terms,
        maxProductsPerTerm: nicheLimits.products,
      });
    },
    onSuccess: onRunSuccess,
    onError: onRunError,
  });

  // Saved search run --------------------------------------------------------
  const savedRun = useMutation({
    mutationFn: (id: string) => discoveryService.runSearch(id),
    onSuccess: onRunSuccess,
    onError: onRunError,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      discoveryService.updateSearch(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discovery-searches"] }),
  });

  // New saved search --------------------------------------------------------
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<SearchType>("keyword");
  const [newQuery, setNewQuery] = useState("");
  const [newNiche, setNewNiche] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const createSearch = useMutation({
    mutationFn: () =>
      discoveryService.createSearch(
        newType === "niche"
          ? { name: newName, type: "niche", nicheKey: newNiche }
          : { name: newName, type: newType, query: newQuery },
      ),
    onSuccess: () => {
      setNewName("");
      setNewQuery("");
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: ["discovery-searches"] });
    },
    onError: (error: unknown) =>
      setCreateError(error instanceof Error ? error.message : "Falha ao criar pesquisa."),
  });

  const running = quickRun.isPending || nicheRun.isPending || savedRun.isPending;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Descoberta"
        description="Pesquise por palavra-chave, nome de produto ou nicho. Toda execução é manual e respeita limites de custo."
        actions={<Compass className="size-6 text-muted-foreground" aria-hidden />}
      />

      {/* A) Busca rápida */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Busca rápida</h2>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="quick-query">O que você quer pesquisar?</Label>
            <Input
              id="quick-query"
              value={quickQuery}
              onChange={(event) => setQuickQuery(event.target.value)}
              placeholder="women dress, mini projector, pet grooming brush..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={quickType}
              onValueChange={(value) => setQuickType(value as "keyword" | "product_name")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Palavra-chave</SelectItem>
                <SelectItem value="product_name">Nome de produto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-28 space-y-1.5">
            <Label htmlFor="quick-limit">Limite</Label>
            <Input
              id="quick-limit"
              type="number"
              min={1}
              max={niches.data?.limits.max.maxProductsPerTerm ?? 20}
              value={quickLimit}
              onChange={(event) => setQuickLimit(Number(event.target.value))}
            />
          </div>
          <Button
            onClick={() => quickRun.mutate()}
            disabled={running || quickQuery.trim().length === 0}
          >
            <Search className="size-4" />
            {quickRun.isPending ? "Pesquisando..." : "Pesquisar e ingerir"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O provider pode retornar resultados semanticamente relacionados: não existe correspondência
          exata garantida por nome.
        </p>
      </section>

      {/* B) Pesquisa por nicho */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Pesquisa por nicho</h2>
          <div className="flex items-end gap-3">
            <div className="w-32 space-y-1.5">
              <Label htmlFor="niche-terms">Máx. termos</Label>
              <Input
                id="niche-terms"
                type="number"
                min={1}
                max={niches.data?.limits.max.maxTermsPerRun ?? 10}
                value={nicheLimits.terms}
                onChange={(event) =>
                  setNicheLimits((prev) => ({ ...prev, terms: Number(event.target.value) }))
                }
              />
            </div>
            <div className="w-32 space-y-1.5">
              <Label htmlFor="niche-products">Máx. por termo</Label>
              <Input
                id="niche-products"
                type="number"
                min={1}
                max={niches.data?.limits.max.maxProductsPerTerm ?? 20}
                value={nicheLimits.products}
                onChange={(event) =>
                  setNicheLimits((prev) => ({ ...prev, products: Number(event.target.value) }))
                }
              />
            </div>
          </div>
        </div>

        {niches.isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(niches.data?.niches ?? []).map((niche) => (
              <div
                key={niche.key}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium">{niche.name}</h3>
                    <Badge variant="secondary">{niche.termCount} termos</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {niche.terms.slice(0, 3).join(", ")}
                    {niche.terms.length > 3 ? "..." : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={running}
                  onClick={() => nicheRun.mutate(niche.key)}
                >
                  <Play className="size-4" /> Executar pesquisa
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Os termos são um ponto de partida editável e não cobrem todo o nicho.
        </p>
      </section>

      {runError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="size-4 text-destructive" />
          {runError}
        </div>
      )}

      {/* Resultados da execução */}
      {result && <RunResult data={result} />}

      {/* C) Pesquisas salvas */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Pesquisas salvas</h2>

        <div className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Nome</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Vestido feminino"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={newType} onValueChange={(value) => setNewType(value as SearchType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Palavra-chave</SelectItem>
                <SelectItem value="product_name">Nome de produto</SelectItem>
                <SelectItem value="niche">Nicho</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {newType === "niche" ? (
            <div className="space-y-1.5">
              <Label>Nicho</Label>
              <Select value={newNiche} onValueChange={setNewNiche}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(niches.data?.niches ?? []).map((niche) => (
                    <SelectItem key={niche.key} value={niche.key}>
                      {niche.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="new-query">Query</Label>
              <Input
                id="new-query"
                value={newQuery}
                onChange={(event) => setNewQuery(event.target.value)}
                placeholder="women dress"
              />
            </div>
          )}
          <Button
            variant="secondary"
            disabled={createSearch.isPending || newName.trim().length === 0}
            onClick={() => createSearch.mutate()}
          >
            Nova pesquisa
          </Button>
          {createError && (
            <p className="text-xs text-destructive md:col-span-4">{createError}</p>
          )}
        </div>

        {searches.isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (searches.data?.items.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma pesquisa salva ainda.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Query/Nicho</TableHead>
                  <TableHead className="text-right">Termos</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead>Última execução</TableHead>
                  <TableHead className="text-right">Execuções</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(searches.data?.items ?? []).map((search) => (
                  <TableRow key={search.id}>
                    <TableCell className="font-medium">{search.name}</TableCell>
                    <TableCell>{TYPE_LABEL[search.type]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {orDash(search.query ?? search.nicheKey)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {search.terms.length}
                    </TableCell>
                    <TableCell>
                      <Badge variant={search.active ? "secondary" : "outline"}>
                        {search.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {search.lastRunAt ? formatDateTime(search.lastRunAt) : DASH}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{search.runCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={running || !search.active}
                          onClick={() => savedRun.mutate(search.id)}
                        >
                          Executar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={toggleActive.isPending}
                          onClick={() =>
                            toggleActive.mutate({ id: search.id, active: !search.active })
                          }
                        >
                          {search.active ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function RunResult({ data }: { data: DiscoveryRunResponse }) {
  const { run, products, errors, limits } = data;
  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold">Resultado da execução</h2>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Recebidos" value={String(run.received)} />
        <Stat label="Produtos únicos" value={String(run.uniqueProducts)} />
        <Stat label="Criados" value={String(run.productsCreated)} />
        <Stat label="Atualizados" value={String(run.productsUpdated)} />
        <Stat label="Snapshots criados" value={String(run.snapshotsCreated)} />
        <Stat label="Snapshots ignorados" value={String(run.snapshotsSkipped)} />
      </div>
      <p className="text-xs text-muted-foreground">
        {run.termsExecuted} termo(s) executado(s) — limite de {limits.maxTermsPerRun} termos e{" "}
        {limits.maxProductsPerTerm} produtos por termo.
      </p>

      {errors.length > 0 && (
        <div className="space-y-1 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Termos com falha</p>
          {errors.map((entry) => (
            <p key={entry.term} className="text-xs text-muted-foreground">
              {entry.term}: {entry.message}
            </p>
          ))}
        </div>
      )}

      {products.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">GMV</TableHead>
                <TableHead>Tendência</TableHead>
                <TableHead>Evidência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link
                      to="/products/$productId"
                      params={{ productId: product.id }}
                      className="flex items-center gap-3 hover:underline"
                    >
                      {product.thumbnail ? (
                        <img
                          src={product.thumbnail}
                          alt={product.name ?? "Produto"}
                          loading="lazy"
                          className="size-10 rounded-md object-cover"
                        />
                      ) : (
                        <span className="size-10 rounded-md bg-muted" aria-hidden />
                      )}
                      <span className="line-clamp-2 max-w-sm text-sm">
                        {orDash(product.name)}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {orDash(product.sellerName)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatMoney(product.price, product.currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatNumber(product.soldCount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatMoney(product.gmv, product.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.trendStatus === "insufficient_data" ? "outline" : "secondary"
                      }
                    >
                      {TREND_LABEL[product.trendStatus] ?? product.trendStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.trendEvidence}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
