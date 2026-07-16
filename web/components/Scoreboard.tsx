"use client";

import type { ScoreResult } from "@/lib/scoring";
import { VAR_LABEL } from "@/lib/labels";

export function Scoreboard({ score }: { score: ScoreResult }) {
  const secondary = score.breakdown.filter((b) => b.key !== "result");

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
            A cartela foi invalidada e zerou — sem ler o jogo, nada de pontos. É o
            coração da mecânica.
          </span>
        </div>
      ) : (
        <ul className="font-mono text-sm">
          <li className="flex items-baseline py-1.5 text-grass-400">
            <span>✓ {VAR_LABEL.result}</span>
            <span className="leader" />
            <span className="uppercase tracking-widest text-[11px]">ok</span>
          </li>
          {secondary.map((b, i) => (
            <li key={`${b.key}-${i}`} className="flex items-baseline py-1.5">
              <span className={b.hit ? "text-chalk" : "text-chalk-dim"}>
                {b.hit ? "✓" : "✗"} {VAR_LABEL[b.key] ?? b.key}
              </span>
              <span className="leader" />
              <span
                className={`font-bold tabular-nums ${
                  b.delta >= 0 ? "text-grass-400" : "text-danger"
                }`}
              >
                {b.delta > 0 ? "+" : ""}
                {b.delta}
              </span>
            </li>
          ))}
          {secondary.length === 0 && (
            <li className="py-1.5 text-chalk/35">Nenhuma variável secundária preenchida.</li>
          )}
        </ul>
      )}
    </div>
  );
}
