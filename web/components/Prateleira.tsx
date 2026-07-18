"use client";

import type { Ticket } from "@/lib/scoring";
import { LAYER_POINTS } from "@/lib/scoring.mjs";
import type { CopaFixture } from "@/lib/copa";
import { catalogFor, catalogMap } from "@/lib/catalog";
import { OUTCOME_LABEL } from "@/lib/labels";

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

const resultShort = (fx: CopaFixture, r: Ticket["result"]) =>
  r === "HOME" ? fx.home.short : r === "AWAY" ? fx.away.short : "X";

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Pontos máximos em jogo do bilhete (soma dos acertos por camada). */
function pointsInPlay(entry: ShelfEntry): { count: number; potencial: number } {
  const map = catalogMap(catalogFor(entry.fixture));
  let count = 0;
  let potencial = 0;
  for (const p of entry.ticket.picks) {
    const m = map[p.marketId];
    if (!m) continue;
    count += 1;
    potencial += LAYER_POINTS[m.camada].hit;
  }
  return { count, potencial };
}

export function Prateleira({
  entries,
  activeId,
  copiedId,
  onOpen,
  onShare,
}: Props) {
  return (
    <section className="reveal mt-12" style={{ animationDelay: "0.1s" }}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b-2 border-dashed border-chalk/12 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">🎟️</span>
          <h2 className="font-display text-xl uppercase tracking-[0.18em] text-chalk">
            Minha prateleira
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-chalk/35">
            {entries.length} bilhete{entries.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-chalk/40">
          Seus bilhetes selados ficam guardados aqui. Compartilhe o link — quem
          abrir faz o mesmo bilhete.
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {entries.map((e) => {
          const active = e.fixtureId === activeId;
          const { count, potencial } = pointsInPlay(e);
          const copied = copiedId === e.fixtureId;
          return (
            <div
              key={e.fixtureId}
              className={`flex w-64 shrink-0 flex-col justify-between border bg-night-900/70 p-4 transition ${
                active
                  ? "border-gold-400 shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                  : "border-chalk/12 hover:border-chalk/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-chalk/35">
                  <span>{e.fixture.stage}</span>
                  <span>{fmtDate(e.submittedAt)}</span>
                </div>
                <div className="mt-1.5 font-display text-2xl uppercase leading-none tracking-wide text-chalk">
                  {e.fixture.home.short}{" "}
                  <span className="text-chalk/30">×</span>{" "}
                  {e.fixture.away.short}
                </div>

                {/* Trava + tally */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-dotted border-chalk/12 pt-3">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-gold-400">
                      Trava
                    </div>
                    <div className="font-display text-sm uppercase tracking-wide text-chalk">
                      {resultShort(e.fixture, e.ticket.result)}{" "}
                      <span className="text-[10px] text-chalk/40">
                        {OUTCOME_LABEL[e.ticket.result]}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl leading-none tabular-nums text-gold-400">
                      +{potencial}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-chalk/40">
                      {count} merc.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => onOpen(e.fixtureId)}
                  className="border border-chalk/20 py-2 font-mono text-[11px] uppercase tracking-widest text-chalk-dim transition hover:border-chalk/45 hover:text-chalk"
                >
                  Abrir
                </button>
                <button
                  onClick={() => onShare(e.fixtureId)}
                  className="border border-gold-400/60 py-2 font-mono text-[11px] uppercase tracking-widest text-gold-400 transition hover:border-gold-400 hover:bg-gold-400/10"
                >
                  {copied ? "✓ copiado" : "🔗 Link"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
