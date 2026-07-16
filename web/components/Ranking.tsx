"use client";

export interface RankRow {
  id: string;
  name: string;
  points: number;
  valid: boolean;
  isYou: boolean;
}

export function Ranking({ rows }: { rows: RankRow[] }) {
  return (
    <div className="reveal border border-chalk/12 bg-night-900 p-5" style={{ animationDelay: "0.08s" }}>
      <div className="mb-3 font-display text-sm uppercase tracking-[0.2em] text-chalk-dim">
        Ranking da liga
      </div>
      <ol>
        {rows.map((r, i) => (
          <li
            key={r.id}
            className={`flex items-center gap-3 border-b border-chalk/8 py-2 last:border-0 ${
              r.isYou ? "border-l-2 border-l-gold-400 bg-gold-400/8 pl-3 -ml-px" : ""
            }`}
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
            <span
              className={`font-mono text-sm font-bold tabular-nums ${
                r.valid ? "text-chalk" : "text-chalk/30"
              }`}
            >
              {r.points}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
