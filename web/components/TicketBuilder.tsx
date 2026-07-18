"use client";

import type { Outcome, Ticket, TicketPick } from "@/lib/scoring";
import { LAYER_POINTS } from "@/lib/scoring.mjs";
import type { Fixture } from "@/lib/mock";
import { CAMADA_META, SETOR_META, SETOR_ORDER, type Market } from "@/lib/catalog";
import { OUTCOME_LABEL } from "@/lib/labels";

interface Props {
  fixture: Fixture;
  markets: Market[];
  ticket: Ticket;
  onChange: (t: Ticket) => void;
  onSeal: () => void;
}

/** Selo de camada com a pontuação em jogo (ex.: "MÉDIA +8/−3", "BÔNUS +3"). */
function CamadaBadge({ camada }: { camada: Market["camada"] }) {
  const meta = CAMADA_META[camada];
  const pts = LAYER_POINTS[camada];
  return (
    <span
      className={`shrink-0 whitespace-nowrap border border-current/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${meta.accent}`}
    >
      {meta.label}
      <span className="ml-1 opacity-80">
        +{pts.hit}
        {pts.miss > 0 ? `/−${pts.miss}` : ""}
      </span>
    </span>
  );
}

export function TicketBuilder({ fixture, markets, ticket, onChange, onSeal }: Props) {
  const outcomes: Outcome[] = ["HOME", "DRAW", "AWAY"];
  const pickOf = (id: string): TicketPick | undefined =>
    ticket.picks.find((p) => p.marketId === id);

  const setResult = (result: Outcome) => onChange({ ...ticket, result });

  const setSide = (marketId: string, side: "SIM" | "NAO") => {
    const current = pickOf(marketId);
    let picks: TicketPick[];
    if (current?.side === side) {
      picks = ticket.picks.filter((p) => p.marketId !== marketId); // clica de novo = tira
    } else if (current) {
      picks = ticket.picks.map((p) => (p.marketId === marketId ? { marketId, side } : p));
    } else {
      picks = [...ticket.picks, { marketId, side }];
    }
    onChange({ ...ticket, picks });
  };

  // Tally ao vivo: mercados escolhidos + potencial máximo em jogo (bônus incluso).
  const scoringPicks = ticket.picks.filter((p) =>
    markets.some((mm) => mm.id === p.marketId)
  );
  const potencial = scoringPicks.reduce((sum, p) => {
    const m = markets.find((mm) => mm.id === p.marketId)!;
    return sum + LAYER_POINTS[m.camada].hit;
  }, 0);

  return (
    <div className="space-y-6">
      {/* ---------- Trava do resultado ---------- */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-sm uppercase tracking-[0.18em] text-gold-400">
            1 · Trava · Resultado
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-danger">
            ✂ errou aqui, zera tudo
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {outcomes.map((o) => {
            const active = ticket.result === o;
            const teamShort =
              o === "HOME" ? fixture.home.short : o === "AWAY" ? fixture.away.short : "X";
            return (
              <button
                key={o}
                type="button"
                onClick={() => setResult(o)}
                className={`flex flex-col items-center gap-0.5 border px-3 pb-2 pt-3 transition ${
                  active
                    ? "border-gold-400 bg-gold-400 text-night-950 shadow-[4px_4px_0_rgba(0,0,0,0.55)]"
                    : "border-chalk/15 bg-night-950/50 text-chalk-dim hover:border-chalk/40 hover:text-chalk"
                }`}
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

      {/* ---------- Variáveis-meme por setor ---------- */}
      <div className="space-y-5">
        <div className="font-display text-sm uppercase tracking-[0.18em] text-gold-400">
          2 · Monte seu bilhete <span className="text-chalk/30">· escolha os mercados</span>
        </div>

        {SETOR_ORDER.map((setor) => {
          const group = markets.filter((m) => m.setor === setor);
          if (!group.length) return null;
          const sm = SETOR_META[setor];
          return (
            <div key={setor}>
              <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-chalk-dim">
                <span>{sm.emoji}</span>
                <span>{sm.label}</span>
                <span className="h-px flex-1 bg-chalk/10" />
              </div>
              <div className="space-y-2">
                {group.map((m) => {
                  const pick = pickOf(m.id);
                  const selected = !!pick;
                  return (
                    <div
                      key={m.id}
                      className={`border px-3 py-2.5 transition ${
                        selected
                          ? "border-chalk/30 bg-night-950/60"
                          : "border-chalk/10 bg-night-950/30"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base leading-none">{m.emoji}</span>
                            <span className="truncate font-display text-[15px] uppercase tracking-wide text-chalk">
                              {m.nome}
                            </span>
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] leading-snug text-chalk/45">
                            {m.pergunta}
                          </div>
                        </div>
                        <CamadaBadge camada={m.camada} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            ["SIM", m.simLabel, "text-grass-400"],
                            ["NAO", m.naoLabel, "text-danger"],
                          ] as const
                        ).map(([side, label, tone]) => {
                          const active = pick?.side === side;
                          return (
                            <button
                              key={side}
                              type="button"
                              onClick={() => setSide(m.id, side)}
                              className={`border px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
                                active
                                  ? "border-gold-400 bg-gold-400 text-night-950 shadow-[3px_3px_0_rgba(0,0,0,0.5)]"
                                  : `border-chalk/15 bg-night-900/60 ${tone} hover:border-chalk/40`
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Tally + selar ---------- */}
      <div className="border-t-2 border-dashed border-chalk/15 pt-4">
        <div className="mb-3 flex items-end justify-between">
          <div className="font-mono text-[11px] uppercase tracking-widest text-chalk-dim">
            {scoringPicks.length} mercado{scoringPicks.length === 1 ? "" : "s"} valendo
          </div>
          <div className="text-right">
            <div className="font-display text-3xl leading-none tabular-nums text-gold-400 [text-shadow:0_0_20px_rgba(255,196,0,0.35)]">
              +{potencial}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-chalk/40">
              pontos em jogo
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onSeal}
          className="w-full border border-gold-400 bg-gold-400 py-3.5 font-display text-lg uppercase tracking-[0.22em] text-night-950 shadow-[5px_5px_0_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 hover:bg-gold-300 active:translate-y-0 active:shadow-[2px_2px_0_rgba(0,0,0,0.55)]"
        >
          Selar bilhete
        </button>
      </div>
    </div>
  );
}
