"use client";

import type { Ticket, TicketScoreResult } from "@/lib/scoring";
import type { Fixture } from "@/lib/mock";
import type { Market } from "@/lib/catalog";
import { OUTCOME_LABEL } from "@/lib/labels";

interface Props {
  fixture: Fixture;
  markets: Market[];
  ticket: Ticket;
  /** Resultado da pontuação, se o jogo já foi apitado. */
  score?: TicketScoreResult | null;
}

const resultShort = (fixture: Fixture, r: Ticket["result"]) =>
  r === "HOME" ? fixture.home.short : r === "AWAY" ? fixture.away.short : "X";

/** Pílula ✓/✗ por linha depois do apito. */
function HitPill({ hit, scored }: { hit: boolean; scored: boolean }) {
  if (!scored) {
    return (
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-chalk/35">
        zoeira
      </span>
    );
  }
  return (
    <span
      className={`shrink-0 font-mono text-xs ${hit ? "text-grass-400" : "text-danger"}`}
    >
      {hit ? "✓" : "✗"}
    </span>
  );
}

export function SealedTicket({ fixture, markets, ticket, score }: Props) {
  const byId = (id: string) => markets.find((m) => m.id === id);
  const resultBreak = score?.breakdown.find((b) => b.marketId === "result");

  return (
    <div className="relative space-y-4">
      {/* Trava */}
      <div className="flex items-center justify-between gap-3 border-b border-dotted border-chalk/15 pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-gold-400">
            Trava · Resultado
          </div>
          <div className="font-display text-xl uppercase tracking-wide text-chalk">
            {resultShort(fixture, ticket.result)}{" "}
            <span className="text-sm text-chalk/40">
              {OUTCOME_LABEL[ticket.result]}
            </span>
          </div>
        </div>
        {resultBreak && (
          <HitPill hit={resultBreak.hit} scored />
        )}
      </div>

      {/* Mercados escolhidos */}
      {ticket.picks.length === 0 ? (
        <p className="py-2 text-center font-mono text-[11px] text-chalk/35">
          Bilhete só com a trava — nenhuma variável.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {ticket.picks.map((p) => {
            const m = byId(p.marketId);
            if (!m) return null;
            const b = score?.breakdown.find((x) => x.marketId === p.marketId);
            const label = p.side === "SIM" ? m.simLabel : m.naoLabel;
            return (
              <li
                key={p.marketId}
                className="flex items-center gap-2 border-b border-dotted border-chalk/10 py-1.5"
              >
                <span className="text-sm leading-none">{m.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[13px] uppercase tracking-wide text-chalk">
                    {m.nome}
                  </div>
                  <div className="truncate font-mono text-[10px] uppercase tracking-widest text-chalk/45">
                    {label}
                  </div>
                </div>
                {b && <HitPill hit={b.hit} scored={b.scored} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
