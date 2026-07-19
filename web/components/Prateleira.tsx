"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Ticket, Camada } from "@/lib/scoring";
import { LAYER_POINTS } from "@/lib/scoring.mjs";
import type { CopaFixture } from "@/lib/copa";
import { catalogFor, catalogMap, CAMADA_META } from "@/lib/catalog";
import { type Pool, moneyLabel } from "@/lib/pools";
import { type PoolEntry, hasEntry } from "@/lib/entries";

export interface ShelfEntry {
  fixtureId: string;
  fixture: CopaFixture;
  ticket: Ticket;
  submittedAt: number;
}

interface Props {
  /** Todos os bilhetes selados (templates), do mais novo. */
  shelf: ShelfEntry[];
  /** Bolões em que a pessoa participa (para agrupar + inscrever). */
  pools: Pool[];
  /** Inscrições de bilhetes em bolões. */
  poolEntries: PoolEntry[];
  /** Fixture aberta agora (destaca o card). */
  activeId: string;
  /** fixtureId cujo link acabou de ser copiado (feedback no botão). */
  copiedId: string | null;
  onOpen: (fixtureId: string) => void;
  onShare: (fixtureId: string) => void;
  /** Inscreve o bilhete de `fixtureId` no bolão `poolId` (pagamento simulado). */
  onEnter: (fixtureId: string, poolId: string, ticket: Ticket) => void;
}

interface PickChip {
  emoji: string;
  nome: string;
  side: "SIM" | "NAO";
  camada: Camada;
}

function travaText(fx: CopaFixture, r: Ticket["result"]): string {
  if (r === "DRAW") return "Empate";
  return `${r === "HOME" ? fx.home.short : fx.away.short} vence`;
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Resumo do bilhete: chips dos palpites + pontos máximos em jogo. */
function summarize(entry: ShelfEntry): {
  count: number;
  potencial: number;
  picks: PickChip[];
} {
  const map = catalogMap(catalogFor(entry.fixture));
  const picks: PickChip[] = [];
  let potencial = 0;
  for (const p of entry.ticket.picks) {
    const m = map[p.marketId];
    if (!m) continue;
    potencial += LAYER_POINTS[m.camada].hit;
    picks.push({ emoji: m.emoji, nome: m.nome, side: p.side, camada: m.camada });
  }
  return { count: picks.length, potencial, picks };
}

interface DetailPick {
  emoji: string;
  nome: string;
  pergunta: string;
  /** Rótulo do lado escolhido (o que a pessoa apostou). */
  sideLabel: string;
  side: "SIM" | "NAO";
  camada: Camada;
  pts: number;
}

/** Detalhe COMPLETO do bilhete (sem truncar) — para a visão maximizada. */
function detail(entry: ShelfEntry): { picks: DetailPick[]; potencial: number } {
  const map = catalogMap(catalogFor(entry.fixture));
  const picks: DetailPick[] = [];
  for (const p of entry.ticket.picks) {
    const m = map[p.marketId];
    if (!m) continue;
    picks.push({
      emoji: m.emoji,
      nome: m.nome,
      pergunta: m.pergunta,
      sideLabel: p.side === "SIM" ? m.simLabel : m.naoLabel,
      side: p.side,
      camada: m.camada,
      pts: LAYER_POINTS[m.camada].hit,
    });
  }
  const potencial = picks.reduce((s, p) => s + p.pts, 0);
  return { picks, potencial };
}

/** Card de um bilhete no trilho da prateleira. */
function ShelfCard({
  entry,
  active,
  copied,
  onMaximize,
  onShare,
}: {
  entry: ShelfEntry;
  active: boolean;
  copied: boolean;
  onMaximize: (fixtureId: string) => void;
  onShare: (fixtureId: string) => void;
}) {
  const { count, potencial, picks } = summarize(entry);
  const shown = picks.slice(0, 6);
  const extra = picks.length - shown.length;
  return (
    <article
      className={`flex w-[19.5rem] shrink-0 snap-start flex-col border-2 bg-night-800 transition ${
        active
          ? "border-gold-400 shadow-[6px_6px_0_rgba(0,0,0,0.55)]"
          : "border-chalk/12 shadow-[4px_4px_0_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:border-chalk/40"
      }`}
    >
      {/* Faixa do confronto */}
      <div
        className={`px-4 pb-3 pt-2.5 ${
          active ? "bg-gold-400 text-night-950" : "bg-night-700 text-chalk"
        }`}
      >
        <div
          className={`flex justify-between font-mono text-[10px] uppercase tracking-widest ${
            active ? "text-night-950/70" : "text-chalk/40"
          }`}
        >
          <span>{entry.fixture.stage}</span>
          <span>{fmtDate(entry.submittedAt)}</span>
        </div>
        <div className="mt-1 font-display text-[2rem] uppercase leading-none tracking-wide">
          {entry.fixture.home.short}
          <span className={active ? "text-night-950/40" : "text-chalk/25"}>
            {" × "}
          </span>
          {entry.fixture.away.short}
        </div>
      </div>

      {/* Picote */}
      <div className="relative flex items-center">
        <span className="-ml-2.5 h-5 w-5 rounded-full bg-night-950" />
        <span className="flex-1 border-t-2 border-dashed border-chalk/20" />
        <span className="-mr-2.5 h-5 w-5 rounded-full bg-night-950" />
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3.5">
        {/* Trava */}
        <div className="flex items-center gap-2">
          <span className="border border-gold-400/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-gold-400">
            Trava
          </span>
          <span className="font-display text-lg uppercase leading-none tracking-wide text-chalk">
            {travaText(entry.fixture, entry.ticket.result)}
          </span>
        </div>

        {/* Palpites como chips */}
        {picks.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {shown.map((p, i) => (
              <span
                key={i}
                className="flex items-center gap-1 border border-chalk/15 bg-night-950/50 py-1 pl-1 pr-1.5 font-mono text-[10px] uppercase tracking-wide text-chalk-dim"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    p.side === "SIM" ? "bg-grass-400" : "bg-danger"
                  }`}
                  title={p.side === "SIM" ? "SIM" : "NÃO"}
                />
                <span className="text-xs leading-none">{p.emoji}</span>
                <span className="max-w-[7rem] truncate text-chalk">{p.nome}</span>
              </span>
            ))}
            {extra > 0 && (
              <span className="flex items-center border border-chalk/15 bg-night-950/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-chalk/50">
                +{extra}
              </span>
            )}
          </div>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-widest text-chalk/30">
            Só a trava — sem variáveis
          </p>
        )}

        {/* Pontuação */}
        <div className="mt-auto flex items-end justify-between border-t-2 border-dashed border-chalk/12 pt-3">
          <div className="font-mono text-[10px] uppercase leading-tight tracking-widest text-chalk-dim">
            {count} mercado{count === 1 ? "" : "s"}
            <br />
            valendo
          </div>
          <div className="text-right">
            <div className="font-display text-[2.6rem] leading-[0.8] tabular-nums text-gold-400 [text-shadow:0_0_22px_rgba(255,196,0,0.4)]">
              +{potencial}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-chalk/40">
              pontos em jogo
            </div>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="grid grid-cols-[1fr_auto] gap-2 px-4 pb-4">
        <button
          onClick={() => onMaximize(entry.fixtureId)}
          className="border border-gold-400 bg-gold-400 py-2.5 font-display text-sm uppercase tracking-[0.18em] text-night-950 shadow-[3px_3px_0_rgba(0,0,0,0.5)] transition hover:bg-gold-300 active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,0.5)]"
        >
          {active ? "Ver bilhete" : "Abrir"}
        </button>
        <button
          onClick={() => onShare(entry.fixtureId)}
          className={`border px-3 py-2.5 font-mono text-[11px] uppercase tracking-widest transition ${
            copied
              ? "border-grass-400 text-grass-400"
              : "border-chalk/25 text-chalk-dim hover:border-gold-400 hover:text-gold-400"
          }`}
        >
          {copied ? "✓ copiado" : "🔗 Link"}
        </button>
      </div>
    </article>
  );
}

export function Prateleira({
  shelf,
  pools,
  poolEntries,
  activeId,
  copiedId,
  onOpen,
  onShare,
  onEnter,
}: Props) {
  // Bilhete aberto em tela cheia (maximizado) para revisão + inscrição.
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const openEntry = shelf.find((e) => e.fixtureId === openId) ?? null;
  const openDetail = openEntry ? detail(openEntry) : null;

  // Fecha com Esc; trava o scroll do fundo enquanto o modal está aberto.
  useEffect(() => {
    if (!openEntry) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openEntry]);

  // Ao trocar de bilhete aberto, limpa a seleção de bolão.
  useEffect(() => {
    setSelectedPoolId(null);
  }, [openId]);

  // ----- Agrupamento por bolão -----
  const fxById = new Map(shelf.map((e) => [e.fixtureId, e]));
  const groups = pools
    .map((pool) => ({
      pool,
      items: poolEntries
        .filter((pe) => pe.poolId === pool.id)
        .map((pe): ShelfEntry | null => {
          const base = fxById.get(pe.fixtureId);
          if (!base) return null;
          return {
            fixtureId: pe.fixtureId,
            fixture: base.fixture,
            ticket: pe.ticket,
            submittedAt: pe.enteredAt,
          };
        })
        .filter((x): x is ShelfEntry => x !== null)
        .sort((a, b) => b.submittedAt - a.submittedAt),
    }))
    .filter((g) => g.items.length > 0);

  const enteredFixtureIds = new Set(poolEntries.map((pe) => pe.fixtureId));
  const unentered = shelf.filter((e) => !enteredFixtureIds.has(e.fixtureId));

  // Bolões em que o bilhete aberto ainda NÃO está inscrito.
  const availablePools = openEntry
    ? pools.filter((p) => !hasEntry(poolEntries, p.id, openEntry.fixtureId))
    : [];
  const selectedPool =
    selectedPoolId != null
      ? availablePools.find((p) => p.id === selectedPoolId) ?? null
      : null;

  return (
    <section data-guide="bilhetes" className="reveal mt-14" style={{ animationDelay: "0.1s" }}>
      {/* ---------- Cabeçalho da seção ---------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-gold-400 bg-gold-400/10 text-2xl shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
            🎟️
          </div>
          <div>
            <h2 className="font-display text-3xl uppercase leading-none tracking-[0.12em] text-chalk">
              Meus bilhetes
            </h2>
            <p className="mt-1 max-w-md font-mono text-[11px] leading-relaxed text-chalk-dim">
              Seus bilhetes selados ficam aqui, agrupados por bolão. Abra um e{" "}
              <span className="text-gold-400">inscreva</span> pra concorrer — ou
              mande o <span className="text-gold-400">Link</span> pra alguém.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-2 border-chalk/15 bg-night-900 px-4 py-2">
          <span className="font-display text-3xl leading-none tabular-nums text-gold-400">
            {shelf.length}
          </span>
          <span className="font-mono text-[10px] uppercase leading-tight tracking-widest text-chalk-dim">
            bilhete
            {shelf.length === 1 ? "" : "s"}
            <br />
            selado{shelf.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* ---------- Grupos por bolão ---------- */}
      {groups.map(({ pool, items }) => (
        <div key={pool.id} className="mb-7">
          <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-dashed border-chalk/12 pb-2">
            <span className="text-base leading-none">
              {pool.isPlatform ? "🌎" : "🎟️"}
            </span>
            <span className="font-display text-lg uppercase tracking-wide text-chalk">
              {pool.name}
            </span>
            <span
              className={`font-mono text-[10px] uppercase tracking-widest ${
                pool.buyIn > 0 ? "text-gold-400" : "text-grass-400"
              }`}
            >
              {moneyLabel(pool.buyIn)}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/35">
              · {items.length} inscrito{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex snap-x gap-4 overflow-x-auto pb-3">
            {items.map((e) => (
              <ShelfCard
                key={`${pool.id}:${e.fixtureId}`}
                entry={e}
                active={e.fixtureId === activeId}
                copied={copiedId === e.fixtureId}
                onMaximize={setOpenId}
                onShare={onShare}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ---------- Não inscritos ---------- */}
      {unentered.length > 0 && (
        <div className="mb-2">
          <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-dashed border-chalk/12 pb-2">
            <span className="text-base leading-none">📥</span>
            <span className="font-display text-lg uppercase tracking-wide text-chalk-dim">
              Não inscritos
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/35">
              · abra e escolha um bolão pra concorrer
            </span>
          </div>
          <div className="flex snap-x gap-4 overflow-x-auto pb-3">
            {unentered.map((e) => (
              <ShelfCard
                key={e.fixtureId}
                entry={e}
                active={e.fixtureId === activeId}
                copied={copiedId === e.fixtureId}
                onMaximize={setOpenId}
                onShare={onShare}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---------- Bilhete maximizado (revisão + inscrição) — portal p/ escapar
           do ancestral com transform (reveal) e cobrir a viewport inteira ---------- */}
      {openEntry &&
        openDetail &&
        createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/90 p-4 backdrop-blur-sm"
          onClick={() => setOpenId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            className="relative flex max-h-[88vh] w-full max-w-lg flex-col border-2 border-gold-400 bg-night-900 shadow-[8px_8px_0_rgba(0,0,0,0.6)]"
          >
            {/* Fechar */}
            <button
              onClick={() => setOpenId(null)}
              aria-label="Fechar"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center border border-night-950/30 bg-night-950/20 font-mono text-sm text-night-950 transition hover:bg-night-950/40"
            >
              ✕
            </button>

            {/* Faixa do confronto */}
            <div className="bg-gold-400 px-6 pb-4 pt-5 text-night-950">
              <div className="flex justify-between pr-8 font-mono text-[10px] uppercase tracking-widest text-night-950/70">
                <span>{openEntry.fixture.stage}</span>
                <span>{fmtDate(openEntry.submittedAt)}</span>
              </div>
              <div className="mt-1 font-display text-4xl uppercase leading-none tracking-wide">
                {openEntry.fixture.home.short}
                <span className="text-night-950/40">{" × "}</span>
                {openEntry.fixture.away.short}
              </div>
              <div className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-night-950/60">
                {openEntry.fixture.home.name} × {openEntry.fixture.away.name}
              </div>
            </div>

            {/* Picote */}
            <div className="relative flex items-center">
              <span className="-ml-2.5 h-5 w-5 rounded-full bg-night-950" />
              <span className="flex-1 border-t-2 border-dashed border-chalk/20" />
              <span className="-mr-2.5 h-5 w-5 rounded-full bg-night-950" />
            </div>

            {/* Corpo rolável */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Concorrer: PRIMEIRO (ação principal — senão a pessoa se perde) */}
              <div className="mb-4 border-b-2 border-dashed border-chalk/15 pb-4">
                <div className="mb-2 font-display text-sm uppercase tracking-[0.16em] text-gold-400">
                  Concorrer com esse bilhete
                </div>
                {availablePools.length === 0 ? (
                  <p className="font-mono text-[11px] leading-relaxed text-grass-400">
                    ✓ Você já está concorrendo com esse bilhete em todos os seus
                    bolões.
                  </p>
                ) : (
                  <>
                    <p className="mb-2.5 font-mono text-[10px] leading-relaxed text-chalk/40">
                      Escolha em qual bolão inscrever:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pools.map((p) => {
                        const entered = hasEntry(
                          poolEntries,
                          p.id,
                          openEntry.fixtureId
                        );
                        if (entered) {
                          return (
                            <span
                              key={p.id}
                              className="flex items-center gap-1.5 border border-grass-400/50 bg-grass-400/[0.06] px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-grass-400"
                            >
                              ✓ {p.name}
                            </span>
                          );
                        }
                        const sel = selectedPoolId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPoolId(p.id)}
                            className={`flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition ${
                              sel
                                ? "border-gold-400 bg-gold-400/10 text-gold-400"
                                : "border-chalk/20 text-chalk-dim hover:border-chalk/45 hover:text-chalk"
                            }`}
                          >
                            <span>{p.isPlatform ? "🌎" : "🎟️"}</span>
                            {p.name}
                            <span
                              className={
                                p.buyIn > 0 ? "text-gold-400/80" : "text-grass-400/80"
                              }
                            >
                              {moneyLabel(p.buyIn)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedPool && (
                      <button
                        onClick={() => {
                          onEnter(
                            openEntry.fixtureId,
                            selectedPool.id,
                            openEntry.ticket
                          );
                          setSelectedPoolId(null);
                        }}
                        className="mt-3 w-full border border-gold-400 bg-gold-400 py-2.5 font-display text-sm uppercase tracking-[0.16em] text-night-950 shadow-[3px_3px_0_rgba(0,0,0,0.5)] transition hover:bg-gold-300 active:translate-y-0.5"
                      >
                        {selectedPool.buyIn > 0
                          ? `Pagar ${moneyLabel(selectedPool.buyIn)} e concorrer`
                          : "Concorrer (grátis)"}
                      </button>
                    )}
                    <p className="mt-2 font-mono text-[9px] leading-relaxed text-chalk/30">
                      Pagamento simulado — em breve. Nada é cobrado agora.
                    </p>
                  </>
                )}
              </div>

              {/* Trava */}
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-dashed border-chalk/15 pb-3">
                <span className="border border-gold-400/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-gold-400">
                  Trava
                </span>
                <span className="font-display text-xl uppercase tracking-wide text-chalk">
                  {travaText(openEntry.fixture, openEntry.ticket.result)}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/35">
                  · erra e o bilhete zera
                </span>
              </div>

              {/* Palpites completos */}
              {openDetail.picks.length === 0 ? (
                <p className="py-8 text-center font-mono text-[11px] uppercase tracking-widest text-chalk/35">
                  Só a trava — sem variáveis.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {openDetail.picks.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 border border-chalk/12 bg-night-950/40 p-3"
                    >
                      <span className="mt-0.5 text-xl leading-none">{p.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm uppercase tracking-wide text-chalk">
                            {p.nome}
                          </span>
                          <span
                            className={`font-mono text-[9px] uppercase tracking-widest ${CAMADA_META[p.camada].accent}`}
                          >
                            {CAMADA_META[p.camada].label}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-chalk/45">
                          {p.pergunta}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              p.side === "SIM" ? "bg-grass-400" : "bg-danger"
                            }`}
                          />
                          <span className="font-mono text-[11px] uppercase tracking-wide text-chalk">
                            {p.sideLabel}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 font-display text-lg tabular-nums text-gold-400">
                        +{p.pts}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Rodapé: total + ações */}
            <div className="border-t-2 border-dashed border-chalk/15 bg-night-900 px-6 py-4">
              <div className="mb-3 flex items-end justify-between">
                <span className="font-mono text-[10px] uppercase leading-tight tracking-widest text-chalk-dim">
                  {openDetail.picks.length} mercado
                  {openDetail.picks.length === 1 ? "" : "s"} valendo
                </span>
                <span className="font-display text-3xl leading-none tabular-nums text-gold-400 [text-shadow:0_0_22px_rgba(255,196,0,0.4)]">
                  +{openDetail.potencial}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <button
                  onClick={() => {
                    onOpen(openEntry.fixtureId);
                    setOpenId(null);
                    if (typeof window !== "undefined")
                      window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="border border-chalk/20 py-2.5 font-mono text-[11px] uppercase tracking-widest text-chalk-dim transition hover:border-chalk/45 hover:text-chalk"
                >
                  Ir para o jogo
                </button>
                <button
                  onClick={() => onShare(openEntry.fixtureId)}
                  className={`border px-3 py-2.5 font-mono text-[11px] uppercase tracking-widest transition ${
                    copiedId === openEntry.fixtureId
                      ? "border-grass-400 text-grass-400"
                      : "border-chalk/25 text-chalk-dim hover:border-gold-400 hover:text-gold-400"
                  }`}
                >
                  {copiedId === openEntry.fixtureId ? "✓ copiado" : "🔗 Link"}
                </button>
                <button
                  onClick={() => setOpenId(null)}
                  className="border border-chalk/20 px-3 py-2.5 font-mono text-[11px] uppercase tracking-widest text-chalk-dim transition hover:border-chalk/45 hover:text-chalk"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
