"use client";

import type { Cartela, Outcome, OverUnder, OUPick } from "@/lib/scoring";
import type { Fixture } from "@/lib/mock";
import { OUTCOME_LABEL } from "@/lib/labels";

interface Props {
  fixture: Fixture;
  cartela: Cartela;
  onChange: (c: Cartela) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

/** Linha de palpite mais/menos: clique seleciona; clicar de novo desmarca. */
function OUField({
  label,
  line,
  value,
  onChange,
  disabled,
}: {
  label: string;
  line: number;
  value: OverUnder | undefined;
  onChange: (v: OverUnder | undefined) => void;
  disabled?: boolean;
}) {
  const toggle = (pick: OUPick) =>
    onChange(value?.pick === pick ? undefined : { pick, line });

  const btn = (pick: OUPick, arrow: string, text: string) => {
    const active = value?.pick === pick;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => toggle(pick)}
        className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
          active
            ? "border-gold-400 bg-gold-400 text-night-950 shadow-[3px_3px_0_rgba(0,0,0,0.55)]"
            : "border-chalk/15 bg-night-950/50 text-chalk-dim hover:border-chalk/40 hover:text-chalk"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={active ? "" : pick === "OVER" ? "text-grass-400" : "text-danger"}>
          {arrow}
        </span>
        {text} {line}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dotted border-chalk/15 py-2.5">
      <span className="text-sm text-chalk-dim">{label}</span>
      <div className="flex gap-1.5">
        {btn("OVER", "▲", "mais de")}
        {btn("UNDER", "▼", "menos de")}
      </div>
    </div>
  );
}

export function CartelaForm({ fixture, cartela, onChange, onSubmit, disabled }: Props) {
  const outcomes: Outcome[] = ["HOME", "DRAW", "AWAY"];
  const set = (patch: Partial<Cartela>) => onChange({ ...cartela, ...patch });

  return (
    <div className="space-y-6">
      {/* Trava do resultado */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-sm uppercase tracking-[0.18em] text-gold-400">
            Trava · Resultado
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-danger">
            ✂ errou aqui, zera tudo
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {outcomes.map((o) => {
            const active = cartela.result === o;
            const teamShort =
              o === "HOME" ? fixture.home.short : o === "AWAY" ? fixture.away.short : "X";
            return (
              <button
                key={o}
                type="button"
                disabled={disabled}
                onClick={() => set({ result: o })}
                className={`group flex flex-col items-center gap-0.5 border px-3 pb-2 pt-3 transition ${
                  active
                    ? "border-gold-400 bg-gold-400 text-night-950 shadow-[4px_4px_0_rgba(0,0,0,0.55)]"
                    : "border-chalk/15 bg-night-950/50 text-chalk-dim hover:border-chalk/40 hover:text-chalk"
                } disabled:cursor-not-allowed`}
              >
                <span className="font-display text-2xl leading-none tracking-wide">
                  {teamShort}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                  {OUTCOME_LABEL[o]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Variáveis secundárias */}
      <div>
        <div className="mb-1 font-display text-sm uppercase tracking-[0.18em] text-chalk-dim">
          Variáveis <span className="text-chalk/30">· somam ou subtraem</span>
        </div>

        {/* Placar exato continua exato — é a variável de maior peso */}
        <div className="flex items-center justify-between gap-3 border-b border-dotted border-chalk/15 py-2.5">
          <span className="text-sm text-chalk-dim">Placar exato</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              disabled={disabled}
              value={cartela.exactScore?.home ?? ""}
              onChange={(e) =>
                set({
                  exactScore: {
                    home: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)),
                    away: cartela.exactScore?.away ?? 0,
                  },
                })
              }
              placeholder={fixture.home.short}
              className="w-14 border border-chalk/15 bg-night-950/70 px-2 py-1 text-center font-mono text-base text-chalk outline-none transition focus:border-gold-400 disabled:opacity-40"
            />
            <span className="font-mono text-chalk/30">×</span>
            <input
              type="number"
              min={0}
              disabled={disabled}
              value={cartela.exactScore?.away ?? ""}
              onChange={(e) =>
                set({
                  exactScore: {
                    home: cartela.exactScore?.home ?? 0,
                    away: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)),
                  },
                })
              }
              placeholder={fixture.away.short}
              className="w-14 border border-chalk/15 bg-night-950/70 px-2 py-1 text-center font-mono text-base text-chalk outline-none transition focus:border-gold-400 disabled:opacity-40"
            />
          </div>
        </div>

        <OUField
          label="Total de gols"
          line={fixture.lines.totalGoals}
          value={cartela.totalGoals}
          onChange={(v) => set({ totalGoals: v })}
          disabled={disabled}
        />
        <OUField
          label="Total de cartões"
          line={fixture.lines.totalCards}
          value={cartela.totalCards}
          onChange={(v) => set({ totalCards: v })}
          disabled={disabled}
        />
        <OUField
          label="Total de escanteios"
          line={fixture.lines.totalCorners}
          value={cartela.totalCorners}
          onChange={(v) => set({ totalCorners: v })}
          disabled={disabled}
        />
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={onSubmit}
          className="w-full border border-gold-400 bg-gold-400 py-3.5 font-display text-lg uppercase tracking-[0.22em] text-night-950 shadow-[5px_5px_0_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 hover:bg-gold-300 active:translate-y-0 active:shadow-[2px_2px_0_rgba(0,0,0,0.55)]"
        >
          Selar cartela
        </button>
      )}
    </div>
  );
}
