"use client";

import type { Ticket, Camada } from "@/lib/scoring";
import { LAYER_POINTS } from "@/lib/scoring.mjs";
import type { CopaFixture } from "@/lib/copa";
import { catalogFor, catalogMap } from "@/lib/catalog";

export interface ShelfEntry {
  fixtureId: string;
  fixture: CopaFixture;
  ticket: Ticket;
  submittedAt: number;
}

interface Props {
  entries: ShelfEntry[];
  /** Fixture aberta agora (destaca o card). */
  activeId: string;
  /** fixtureId cujo link acabou de ser copiado (feedback no botão). */
  copiedId: string | null;
  onOpen: (fixtureId: string) => void;
  onShare: (fixtureId: string) => void;
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

export function Prateleira({
  entries,
  activeId,
  copiedId,
  onOpen,
  onShare,
}: Props) {
  return (
    <section className="reveal mt-14" style={{ animationDelay: "0.1s" }}>
      {/* ---------- Cabeçalho da seção ---------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-gold-400 bg-gold-400/10 text-2xl shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
            🎟️
          </div>
          <div>
            <h2 className="font-display text-3xl uppercase leading-none tracking-[0.12em] text-chalk">
              Minha prateleira
            </h2>
            <p className="mt-1 max-w-md font-mono text-[11px] leading-relaxed text-chalk-dim">
              Seus bilhetes selados ficam aqui. Toque em{" "}
              <span className="text-gold-400">Link</span> e mande pra alguém — quem
              abrir faz o mesmo bilhete.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-2 border-chalk/15 bg-night-900 px-4 py-2">
          <span className="font-display text-3xl leading-none tabular-nums text-gold-400">
            {entries.length}
          </span>
          <span className="font-mono text-[10px] uppercase leading-tight tracking-widest text-chalk-dim">
            bilhete
            {entries.length === 1 ? "" : "s"}
            <br />
            na prateleira
          </span>
        </div>
      </div>

      {/* ---------- Trilho de bilhetes ---------- */}
      <div className="flex snap-x gap-4 overflow-x-auto pb-3">
        {entries.map((e) => {
          const active = e.fixtureId === activeId;
          const { count, potencial, picks } = summarize(e);
          const copied = copiedId === e.fixtureId;
          const shown = picks.slice(0, 6);
          const extra = picks.length - shown.length;
          return (
            <article
              key={e.fixtureId}
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
                  <span>{e.fixture.stage}</span>
                  <span>{fmtDate(e.submittedAt)}</span>
                </div>
                <div className="mt-1 font-display text-[2rem] uppercase leading-none tracking-wide">
                  {e.fixture.home.short}
                  <span className={active ? "text-night-950/40" : "text-chalk/25"}>
                    {" × "}
                  </span>
                  {e.fixture.away.short}
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
                    {travaText(e.fixture, e.ticket.result)}
                  </span>
                </div>

                {/* Palpites como chips (o meme visível) */}
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
                        <span className="max-w-[7rem] truncate text-chalk">
                          {p.nome}
                        </span>
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

                {/* Pontuação em destaque */}
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
                  onClick={() => onOpen(e.fixtureId)}
                  className="border border-gold-400 bg-gold-400 py-2.5 font-display text-sm uppercase tracking-[0.18em] text-night-950 shadow-[3px_3px_0_rgba(0,0,0,0.5)] transition hover:bg-gold-300 active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,0.5)]"
                >
                  {active ? "Aberto" : "Abrir"}
                </button>
                <button
                  onClick={() => onShare(e.fixtureId)}
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
        })}
      </div>
    </section>
  );
}
