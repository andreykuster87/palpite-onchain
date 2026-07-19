"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { type Pool, moneyLabel, brl, poolAcceptsFixture } from "@/lib/pools";

/**
 * Modal que aparece AO SELAR o palpite: escolha em qual(is) bolão(ões)
 * concorrer com esse bilhete. Seleção MÚLTIPLA — pode marcar vários; a cobrança
 * é ÚNICA pelo total somado dos buy-ins (pagamento simulado por enquanto).
 * Bolões de outro(s) jogo(s) aparecem travados (não aceitam este bilhete).
 */
export function EnterPoolsModal({
  pools,
  fixtureId,
  fixtureLabels,
  alreadyIn,
  preselect = [],
  onConfirm,
  onSkip,
}: {
  pools: Pool[];
  /** Jogo do bilhete sendo selado (pra checar compatibilidade). */
  fixtureId: string;
  /** Rótulos "FRA×MAR" por fixtureId. */
  fixtureLabels: Record<string, string>;
  /** Bolões em que este bilhete já está inscrito (mostra "já inscrito"). */
  alreadyIn: string[];
  /** Bolões pré-marcados (ex.: o bolão ativo). */
  preselect?: string[];
  onConfirm: (poolIds: string[]) => void;
  onSkip: () => void;
}) {
  const [sel, setSel] = useState<Set<string>>(
    () =>
      new Set(
        preselect.filter((id) => {
          if (alreadyIn.includes(id)) return false;
          const p = pools.find((x) => x.id === id);
          return p ? poolAcceptsFixture(p, fixtureId) : false;
        })
      )
  );

  // Esc fecha (pular) + trava o scroll do fundo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onSkip();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onSkip]);

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const total = useMemo(
    () => pools.filter((p) => sel.has(p.id)).reduce((s, p) => s + p.buyIn, 0),
    [pools, sel]
  );
  const count = sel.size;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/90 p-4 backdrop-blur-sm"
      onClick={onSkip}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[88vh] w-full max-w-md flex-col border-2 border-gold-400 bg-night-900 shadow-[8px_8px_0_rgba(0,0,0,0.6)]"
      >
        {/* Cabeçalho */}
        <div className="bg-gold-400 px-6 pb-4 pt-5 text-night-950">
          <div className="font-mono text-[10px] uppercase tracking-widest text-night-950/70">
            🎟️ palpite selado
          </div>
          <div className="mt-1 font-display text-2xl uppercase leading-none tracking-wide">
            Concorrer nos bolões
          </div>
          <div className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-night-950/60">
            marque um ou mais — cobrança única pelo total
          </div>
        </div>

        {/* Lista de bolões (multi-seleção) */}
        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {pools.map((p) => {
            const entered = alreadyIn.includes(p.id);
            const accepts = poolAcceptsFixture(p, fixtureId);
            const blocked = entered || !accepts;
            const checked = entered || sel.has(p.id);
            const games = p.games.map((id) => fixtureLabels[id] ?? id).join(" · ");
            return (
              <button
                key={p.id}
                type="button"
                disabled={blocked}
                title={!accepts ? `Só aceita: ${games}` : undefined}
                onClick={() => toggle(p.id)}
                className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left transition ${
                  entered
                    ? "cursor-default border-grass-400/40 bg-grass-400/[0.05]"
                    : !accepts
                      ? "cursor-not-allowed border-chalk/10 bg-night-950/20 opacity-50"
                      : checked
                        ? "border-gold-400 bg-gold-400/10"
                        : "border-chalk/15 bg-night-950/40 hover:border-chalk/40"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border font-mono text-[11px] ${
                    !accepts && !entered
                      ? "border-danger/50 text-danger"
                      : checked
                        ? entered
                          ? "border-grass-400 text-grass-400"
                          : "border-gold-400 bg-gold-400 text-night-950"
                        : "border-chalk/30 text-transparent"
                  }`}
                >
                  {!accepts && !entered ? "✗" : "✓"}
                </span>
                <span className="text-sm">{p.isPlatform ? "🌎" : "🎟️"}</span>
                <span className="flex-1 truncate font-display text-sm uppercase tracking-wide text-chalk">
                  {p.name}
                </span>
                {entered ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-grass-400">
                    já inscrito
                  </span>
                ) : !accepts ? (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-danger">
                    outro jogo
                  </span>
                ) : (
                  <span
                    className={`font-mono text-[11px] uppercase tracking-widest ${
                      p.buyIn > 0 ? "text-gold-400" : "text-grass-400"
                    }`}
                  >
                    {moneyLabel(p.buyIn)}
                  </span>
                )}
              </button>
            );
          })}
          {pools.some((p) => !alreadyIn.includes(p.id) && !poolAcceptsFixture(p, fixtureId)) && (
            <p className="border border-danger/30 bg-danger/[0.06] px-3 py-1.5 font-mono text-[10px] leading-relaxed text-danger">
              ✗ Bolões travados são de outro(s) jogo(s) — não aceitam este bilhete
              ({fixtureLabels[fixtureId] ?? "este jogo"}).
            </p>
          )}
        </div>

        {/* Rodapé: total + pagamento único */}
        <div className="border-t-2 border-dashed border-chalk/15 bg-night-900 px-5 py-4">
          <div className="mb-3 flex items-end justify-between">
            <span className="font-mono text-[10px] uppercase leading-tight tracking-widest text-chalk-dim">
              {count} bolão{count === 1 ? "" : "s"} selecionado
              {count === 1 ? "" : "s"}
              <br />
              total a pagar
            </span>
            <span className="font-display text-3xl leading-none tabular-nums text-gold-400 [text-shadow:0_0_20px_rgba(255,196,0,0.4)]">
              {total > 0 ? brl(total) : "Grátis"}
            </span>
          </div>
          <button
            onClick={() => onConfirm([...sel])}
            disabled={count === 0}
            className="w-full border border-gold-400 bg-gold-400 py-3 font-display text-base uppercase tracking-[0.18em] text-night-950 shadow-[4px_4px_0_rgba(0,0,0,0.5)] transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {total > 0 ? `Pagar ${brl(total)} e concorrer` : "Concorrer (grátis)"}
          </button>
          <button
            onClick={onSkip}
            className="mt-2 w-full py-1.5 font-mono text-[11px] uppercase tracking-widest text-chalk/40 transition hover:text-chalk"
          >
            Agora não · só assistir
          </button>
          <p className="mt-1.5 text-center font-mono text-[9px] leading-relaxed text-chalk/30">
            Pagamento simulado — em breve. Nada é cobrado agora.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
