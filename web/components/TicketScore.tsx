"use client";

import type { TicketScoreResult } from "@/lib/scoring";
import type { Market } from "@/lib/catalog";

interface Props {
  score: TicketScoreResult;
  markets: Market[];
}

export function TicketScore({ score, markets }: Props) {
  const nameOf = (id: string) => {
    if (id === "result") return "Resultado (trava)";
    const m = markets.find((mm) => mm.id === id);
    return m ? `${m.emoji} ${m.nome}` : id;
  };
  const secondary = score.breakdown.filter((b) => b.marketId !== "result");

  return (
    <div className="reveal border border-chalk/12 bg-night-900 p-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <span className="font-display text-sm uppercase tracking-[0.2em] text-chalk-dim">
          Sua pontuação
        </span>
        <span
          className={`score-pop font-mono text-5xl font-bold leading-none tabular-nums ${
            score.valid
              ? "text-gold-400 [text-shadow:0_0_24px_rgba(255,196,0,0.45)]"
              : "text-danger [text-shadow:0_0_24px_rgba(255,95,86,0.4)]"
          }`}
        >
          {score.points}
        </span>
      </div>

      {!score.valid ? (
        <div className="border border-danger/40 bg-danger/10 px-3 py-3 text-sm leading-relaxed text-danger">
          <span className="font-display uppercase tracking-widest">Trava errada.</span>{" "}
          <span className="text-chalk-dim">
            O bilhete foi invalidado e zerou — sem acertar o resultado, nada de
            pontos. É o coração da mecânica.
          </span>
        </div>
      ) : (
        <ul className="font-mono text-sm">
          <li className="flex items-baseline py-1.5 text-grass-400">
            <span>✓ Resultado (trava)</span>
            <span className="leader" />
            <span className="text-[11px] uppercase tracking-widest">ok</span>
          </li>
          {secondary.map((b, i) => (
            <li key={`${b.marketId}-${i}`} className="flex items-baseline py-1.5">
              <span className={b.hit ? "text-chalk" : "text-chalk-dim"}>
                {b.scored ? (b.hit ? "✓" : "✗") : "•"} {nameOf(b.marketId)}
              </span>
              <span className="leader" />
              {b.scored ? (
                <span
                  className={`font-bold tabular-nums ${
                    b.delta >= 0 ? "text-grass-400" : "text-danger"
                  }`}
                >
                  {b.delta > 0 ? "+" : ""}
                  {b.delta}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-widest text-chalk/35">
                  zoeira
                </span>
              )}
            </li>
          ))}
          {secondary.length === 0 && (
            <li className="py-1.5 text-chalk/35">Bilhete só com a trava.</li>
          )}
        </ul>
      )}
    </div>
  );
}
