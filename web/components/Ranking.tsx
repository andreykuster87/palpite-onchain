"use client";

import { brl } from "@/lib/pools";

export interface RankRow {
  id: string;
  name: string;
  points: number;
  valid: boolean;
  isYou: boolean;
  /** Ainda sem pontuação (ex.: você antes de montar/apitar). Mostra "—". */
  pending?: boolean;
}

interface PrizeInfo {
  pot: number;
  first: number;
  second: number;
  third: number;
}

export function Ranking({
  rows,
  title = "Bolão",
  live = false,
  prize = null,
}: {
  rows: RankRow[];
  /** Nome do bolão (fica em destaque no topo). */
  title?: string;
  /** Selo "ao vivo" piscando (ranking simulado sempre visível). */
  live?: boolean;
  /** Premiação do bolão (mostrada em destaque quando há buy-in). */
  prize?: PrizeInfo | null;
}) {
  return (
    <div
      className="reveal border-2 border-gold-400/40 bg-night-900 p-5 shadow-[5px_5px_0_rgba(0,0,0,0.45)]"
      style={{ animationDelay: "0.08s" }}
    >
      {/* Cabeçalho: nome do bolão em destaque */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-400">
            🏆 Ranking do bolão
          </div>
          <div className="mt-0.5 truncate font-display text-xl uppercase leading-none tracking-wide text-chalk">
            {title}
          </div>
        </div>
        {live ? (
          <span className="blink shrink-0 font-mono text-[10px] uppercase tracking-widest text-grass-400">
            ● ao vivo
          </span>
        ) : (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-chalk/30">
            {rows.length} no páreo
          </span>
        )}
      </div>

      {/* Premiação em destaque (só quando o bolão tem buy-in) */}
      {prize && prize.pot > 0 && (
        <div className="mb-4 border border-gold-400/30 bg-gold-400/[0.05] px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-chalk-dim">
              premiação
            </span>
            <span className="font-display text-2xl leading-none tabular-nums text-gold-400 [text-shadow:0_0_18px_rgba(255,196,0,0.4)]">
              {brl(prize.pot)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-1 font-mono text-[11px] tabular-nums text-chalk">
            <span>🥇 {brl(prize.first)}</span>
            <span className="text-chalk/50">🥈 {brl(prize.second)}</span>
            <span className="text-chalk/40">🥉 {brl(prize.third)}</span>
          </div>
        </div>
      )}

      <ol>
        {rows.map((r, i) => (
          <li
            key={r.id}
            className={`reveal flex items-center gap-3 border-b border-chalk/8 py-2 last:border-0 ${
              r.isYou ? "border-l-2 border-l-gold-400 bg-gold-400/8 pl-3 -ml-px" : ""
            }`}
            style={{ animationDelay: `${0.1 + i * 0.05}s` }}
          >
            <span
              className={`w-7 text-right font-mono text-sm tabular-nums ${
                i === 0 ? "font-bold text-gold-400" : "text-chalk/40"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 truncate text-sm">
              <span className={r.valid ? "text-chalk" : "text-chalk-dim line-through decoration-danger/60"}>
                {r.name}
              </span>
              {r.isYou && (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-gold-400">
                  você
                </span>
              )}
              {!r.valid && (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-danger">
                  trava ✗
                </span>
              )}
            </span>
            {r.pending ? (
              <span className="font-mono text-xs uppercase tracking-widest text-chalk/30">
                —
              </span>
            ) : (
              <span
                className={`font-mono text-sm font-bold tabular-nums ${
                  r.valid ? "text-chalk" : "text-chalk/30"
                }`}
              >
                {r.points}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
