"use client";

import { useEffect, useMemo, useState } from "react";
import { scoreCartela, rankEntries } from "@/lib/scoring.mjs";
import type { Cartela } from "@/lib/scoring";
import { FIXTURES, opponentsFor, type Fixture } from "@/lib/mock";
import { commitHash } from "@/lib/hash";
import { CartelaForm } from "@/components/CartelaForm";
import { Scoreboard } from "@/components/Scoreboard";
import { Ranking, type RankRow } from "@/components/Ranking";

// v2: variáveis secundárias migraram de número exato para over/under.
const STORAGE_KEY = "palpite:cartelas:v2";

type SavedCartelas = Record<string, { cartela: Cartela; submittedAt: number }>;

function newDraft(): Cartela {
  return { result: "HOME" };
}

function errorsOf(cartela: Cartela, fixture: Fixture): number {
  return scoreCartela(cartela, fixture.finalStats).breakdown.filter((b) => !b.hit).length;
}

function kickoffLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default function Home() {
  const [fixtureId, setFixtureId] = useState<string>(FIXTURES[0].id);
  const [draft, setDraft] = useState<Cartela>(newDraft());
  const [saved, setSaved] = useState<SavedCartelas>({});
  const [whistled, setWhistled] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  const fixture = FIXTURES.find((f) => f.id === fixtureId)!;
  const savedEntry = saved[fixtureId];
  const isWhistled = !!whistled[fixtureId];

  // Hidrata do localStorage no cliente.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* ignora storage indisponível */
    }
    setHydrated(true);
  }, []);

  // Persiste sempre que 'saved' muda (após hidratar).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* ignora */
    }
  }, [saved, hydrated]);

  // Ao trocar de fixture, carrega a cartela selada (se houver) no rascunho.
  useEffect(() => {
    setDraft(saved[fixtureId]?.cartela ?? newDraft());
  }, [fixtureId, saved]);

  function handleSubmit() {
    setSaved((s) => ({
      ...s,
      [fixtureId]: { cartela: draft, submittedAt: Date.now() },
    }));
  }

  function reopen() {
    setSaved((s) => {
      const next = { ...s };
      delete next[fixtureId];
      return next;
    });
    setWhistled((w) => ({ ...w, [fixtureId]: false }));
    setDraft(savedEntry?.cartela ?? newDraft());
  }

  const score = useMemo(
    () =>
      savedEntry && isWhistled
        ? scoreCartela(savedEntry.cartela, fixture.finalStats)
        : null,
    [savedEntry, isWhistled, fixture]
  );

  const ranking = useMemo<RankRow[]>(() => {
    if (!savedEntry || !isWhistled) return [];
    const opponents = opponentsFor(fixture);
    const you = {
      id: "you",
      name: "Você",
      isYou: true,
      cartela: savedEntry.cartela,
      submittedAt: savedEntry.submittedAt,
    };
    const all = [
      you,
      ...opponents.map((o) => ({
        id: o.id,
        name: o.name,
        isYou: false,
        cartela: o.cartela,
        submittedAt: o.submittedAt,
      })),
    ];
    const scored = all.map((e) => {
      const r = scoreCartela(e.cartela, fixture.finalStats);
      return {
        id: e.id,
        name: e.name,
        isYou: e.isYou,
        points: r.points,
        valid: r.valid,
        errors: errorsOf(e.cartela, fixture),
        submittedAt: e.submittedAt,
      };
    });
    return rankEntries(scored).map((r) => ({
      id: r.id,
      name: r.name,
      points: r.points,
      valid: r.valid,
      isYou: r.isYou,
    }));
  }, [savedEntry, isWhistled, fixture]);

  const f = fixture.finalStats;
  const totalCards =
    (f.yellowHome ?? 0) + (f.yellowAway ?? 0) + (f.redHome ?? 0) + (f.redAway ?? 0);
  const totalCorners = (f.cornersHome ?? 0) + (f.cornersAway ?? 0);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      {/* ---------- Cabeçalho ---------- */}
      <header className="reveal mb-8 flex flex-wrap items-end justify-between gap-6 border-b-2 border-dashed border-chalk/12 pb-7">
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.35em] text-grass-400">
            Liga experimental · fase 1
          </div>
          <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-wide text-chalk sm:text-6xl">
            Palpite
            <br />
            <span className="text-gold-400 [text-shadow:0_0_32px_rgba(255,196,0,0.35)]">
              On-Chain
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-chalk-dim">
            Preveja o jogo, não escale time. Acerte a{" "}
            <span className="text-chalk">trava do resultado</span>; as variáveis são
            o desempate.
          </p>
        </div>
        <div className="border border-chalk/15 px-4 py-3 font-mono text-[11px] uppercase leading-relaxed tracking-widest text-chalk-dim">
          protótipo local
          <br />
          <span className="text-chalk/35">dados mockados · sem dinheiro real</span>
        </div>
      </header>

      {/* ---------- Seletor de partidas ---------- */}
      <div
        className="reveal mb-8 flex gap-2.5 overflow-x-auto pb-1"
        style={{ animationDelay: "0.06s" }}
      >
        {FIXTURES.map((fx) => {
          const active = fx.id === fixtureId;
          const done = !!saved[fx.id];
          return (
            <button
              key={fx.id}
              onClick={() => setFixtureId(fx.id)}
              className={`flex shrink-0 flex-col border px-4 py-2.5 text-left transition ${
                active
                  ? "border-gold-400 bg-night-800 shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                  : "border-chalk/12 bg-night-900/60 hover:border-chalk/35"
              }`}
            >
              <span className="font-display text-lg uppercase tracking-wider text-chalk">
                {fx.home.short} <span className="text-chalk/30">×</span> {fx.away.short}
                {done && <span className="ml-2 align-middle text-xs text-gold-400">●</span>}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/40">
                {kickoffLabel(fx.kickoff)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ---------- Coluna principal ---------- */}
        <section className="space-y-6">
          {/* Placar de estádio */}
          <div
            className="scoreboard reveal relative overflow-hidden border border-chalk/12 bg-night-900 px-6 py-7"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="mb-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.25em]">
              <span className="text-chalk-dim">{fixture.league}</span>
              {isWhistled ? (
                <span className="text-danger">● encerrado</span>
              ) : (
                <span className="blink text-grass-400">● a jogar</span>
              )}
            </div>

            <div className="relative flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <div className="font-display text-2xl uppercase leading-none tracking-wide text-chalk sm:text-4xl">
                  {fixture.home.name}
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/40">
                  mandante
                </div>
              </div>

              <div className="px-2 text-center">
                {isWhistled ? (
                  <div className="score-pop font-mono text-6xl font-bold tabular-nums leading-none text-gold-400 [text-shadow:0_0_36px_rgba(255,196,0,0.5)] sm:text-7xl">
                    {f.goalsHome}
                    <span className="text-chalk/25">–</span>
                    {f.goalsAway}
                  </div>
                ) : (
                  <div className="font-display text-4xl uppercase text-chalk/15 sm:text-5xl">
                    vs
                  </div>
                )}
              </div>

              <div className="flex-1 text-center">
                <div className="font-display text-2xl uppercase leading-none tracking-wide text-chalk sm:text-4xl">
                  {fixture.away.name}
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/40">
                  visitante
                </div>
              </div>
            </div>

            {isWhistled && (
              <div className="relative mt-7 grid grid-cols-3 gap-2 border-t border-dashed border-chalk/12 pt-5 text-center">
                {[
                  { v: f.goalsHome + f.goalsAway, l: "gols" },
                  { v: totalCards, l: "cartões" },
                  { v: totalCorners, l: "escanteios" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="font-mono text-2xl font-bold tabular-nums text-chalk">
                      {s.v}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/40">
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bilhete da cartela */}
          <div
            className="reveal relative border border-chalk/12 bg-night-800 p-6"
            style={{ animationDelay: "0.14s" }}
          >
            {/* Cabeçalho do bilhete */}
            <div className="mb-5 flex items-center justify-between">
              <span className="font-display text-sm uppercase tracking-[0.2em] text-chalk">
                Cartela
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/35">
                nº {fixture.id.replace("fx-", "").padStart(4, "0")} · {fixture.home.short}×
                {fixture.away.short}
              </span>
            </div>

            {/* Picote do bilhete */}
            <div className="-mx-6 mb-5 flex items-center">
              <span className="-ml-2 h-4 w-4 rounded-full bg-night-950" />
              <span className="flex-1 border-t-2 border-dashed border-chalk/15" />
              <span className="-mr-2 h-4 w-4 rounded-full bg-night-950" />
            </div>

            {!savedEntry ? (
              <CartelaForm
                fixture={fixture}
                cartela={draft}
                onChange={setDraft}
                onSubmit={handleSubmit}
              />
            ) : (
              <div className="space-y-5">
                <div className="relative">
                  <CartelaForm
                    fixture={fixture}
                    cartela={savedEntry.cartela}
                    onChange={() => {}}
                    onSubmit={() => {}}
                    disabled
                  />
                  {/* Carimbo */}
                  <div className="stamp pointer-events-none absolute right-2 top-1 border-[3px] border-gold-400/80 px-3 py-1 font-display text-xl uppercase tracking-[0.25em] text-gold-400/90">
                    Selada
                  </div>
                </div>

                {/* Commit (código de barras) */}
                <div className="border-t-2 border-dashed border-chalk/15 pt-4">
                  <div className="barcode" />
                  <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-widest text-chalk/35">
                    <span>commit local</span>
                    <span>{commitHash(savedEntry.cartela).slice(0, 24)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {!isWhistled && (
                    <button
                      onClick={() => setWhistled((w) => ({ ...w, [fixtureId]: true }))}
                      className="flex-1 border border-gold-400 bg-gold-400 py-3.5 font-display text-lg uppercase tracking-[0.22em] text-night-950 shadow-[5px_5px_0_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 hover:bg-gold-300 active:translate-y-0 active:shadow-[2px_2px_0_rgba(0,0,0,0.55)]"
                    >
                      🔔 Apitar fim de jogo
                    </button>
                  )}
                  <button
                    onClick={reopen}
                    className="border border-chalk/20 px-4 py-3.5 font-mono text-xs uppercase tracking-widest text-chalk-dim transition hover:border-chalk/45 hover:text-chalk"
                  >
                    Refazer
                  </button>
                </div>
                {!isWhistled && (
                  <p className="text-center font-mono text-[11px] leading-relaxed text-chalk/35">
                    Cartela selada (commit). No jogo real, o resultado viria provado
                    pelo oráculo TxLINE — aqui simulamos o apito.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Coluna lateral ---------- */}
        <aside className="space-y-6">
          {score ? (
            <Scoreboard score={score} />
          ) : (
            <div
              className="reveal border border-dashed border-chalk/15 p-8 text-center"
              style={{ animationDelay: "0.18s" }}
            >
              <div className="font-display text-lg uppercase tracking-[0.2em] text-chalk/30">
                Aguardando apito
              </div>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-chalk/35">
                Sele uma cartela e apite o fim de jogo para ver sua pontuação e o
                ranking.
              </p>
            </div>
          )}
          {ranking.length > 0 && <Ranking rows={ranking} />}
        </aside>
      </div>

      <footer className="mt-14 border-t border-chalk/8 pt-5 text-center font-mono text-[11px] uppercase tracking-widest text-chalk/25">
        Protótipo local · motor de pontuação lib/scoring.mjs · Solana em breve
      </footer>
    </main>
  );
}
