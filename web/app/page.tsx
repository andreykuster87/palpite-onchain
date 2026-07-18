"use client";

import { useEffect, useMemo, useState } from "react";
import { scoreTicket, ticketErrors, rankEntries } from "@/lib/scoring.mjs";
import type { Ticket, MatchStats } from "@/lib/scoring";
import { ticketOpponentsFor } from "@/lib/mock";
import { COPA_FIXTURES, type CopaFixture } from "@/lib/copa";
import { catalogFor, catalogMap } from "@/lib/catalog";
import { commitHash } from "@/lib/hash";
import { TicketBuilder } from "@/components/TicketBuilder";
import { SealedTicket } from "@/components/SealedTicket";
import { TicketScore } from "@/components/TicketScore";
import { Ranking, type RankRow } from "@/components/Ranking";
import { readShareFromHash, buildShareUrl, type SharedTicket } from "@/lib/share";

// v4: bilhetes-meme (Ticket) com catálogo por fixture.
const STORAGE_KEY = "palpite:tickets:v4";

type SavedTickets = Record<string, { ticket: Ticket; submittedAt: number }>;
type StatsSource = "txline" | "demo";
type WhistledMap = Record<string, { stats: MatchStats; source: StatsSource }>;

function newDraft(): Ticket {
  return { result: "HOME", picks: [] };
}

/** Stats de demonstração: usa o que se sabe e completa o resto de forma plausível. */
function demoFill(fixture: CopaFixture): MatchStats {
  return {
    yellowHome: 2,
    yellowAway: 2,
    redHome: 0,
    redAway: 0,
    cornersHome: 5,
    cornersAway: 4,
    goalsHome: 1,
    goalsAway: 1,
    ...fixture.finalStats,
    ...fixture.demoStats,
  };
}

function kickoffLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default function Home() {
  const [fixtures, setFixtures] = useState<CopaFixture[]>(COPA_FIXTURES);
  const [dataSource, setDataSource] = useState<"txline" | "seed">("seed");
  const [fixtureId, setFixtureId] = useState<string>(COPA_FIXTURES[0].id);
  const [draft, setDraft] = useState<Ticket>(newDraft());
  const [saved, setSaved] = useState<SavedTickets>({});
  const [whistled, setWhistled] = useState<WhistledMap>({});
  const [whistling, setWhistling] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // Bilhete compartilhado carregado do hash da URL (#b=…), se houver.
  const [incoming, setIncoming] = useState<SharedTicket | null>(null);
  const [copied, setCopied] = useState(false);

  const fixture = fixtures.find((f) => f.id === fixtureId) ?? fixtures[0];
  const savedEntry = saved[fixture.id];
  const finished = whistled[fixture.id];
  // Estamos vendo um bilhete que veio de um amigo (para esta fixture)?
  const fromFriend = !!incoming && incoming.fixtureId === fixture.id;

  // Catálogo de mercados-meme desta fixture (nomes dos times + linhas tecidos).
  const markets = useMemo(() => catalogFor(fixture), [fixture]);
  const marketsMap = useMemo(() => catalogMap(markets), [markets]);

  // Fixtures ao vivo da API (cai no seed embutido se indisponível).
  useEffect(() => {
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.fixtures) && d.fixtures.length) setFixtures(d.fixtures);
        setDataSource(d.source === "txline" ? "txline" : "seed");
      })
      .catch(() => setDataSource("seed"));
  }, []);

  // Abriu um link com #b=… ? Decodifica o bilhete do amigo e vai pra fixture dele.
  useEffect(() => {
    const shared = readShareFromHash();
    if (!shared) return;
    setIncoming(shared);
    if (COPA_FIXTURES.some((fx) => fx.id === shared.fixtureId)) {
      setFixtureId(shared.fixtureId);
    }
  }, []);

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

  // Ao trocar de fixture, decide o que vai pro rascunho:
  //  1) bilhete já selado desta fixture (não sobrescreve);
  //  2) bilhete de um amigo (link), com os picks saneados contra o catálogo;
  //  3) rascunho novo.
  useEffect(() => {
    const savedTicket = saved[fixture.id]?.ticket;
    if (savedTicket) {
      setDraft(savedTicket);
      return;
    }
    if (incoming && incoming.fixtureId === fixture.id) {
      const picks = incoming.ticket.picks.filter((p) => marketsMap[p.marketId]);
      setDraft({ result: incoming.ticket.result, picks });
      return;
    }
    setDraft(newDraft());
  }, [fixture.id, saved, incoming, marketsMap]);

  function handleSeal() {
    setSaved((s) => ({
      ...s,
      [fixture.id]: { ticket: draft, submittedAt: Date.now() },
    }));
  }

  /** Gera o link do bilhete selado e copia pro clipboard (com fallback). */
  async function shareTicket() {
    if (!savedEntry) return;
    const url = buildShareUrl(fixture.id, savedEntry.ticket);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard indisponível (contexto não-seguro): mostra pra copiar à mão.
      window.prompt("Copie o link do seu bilhete:", url);
    }
  }

  function reopen() {
    setSaved((s) => {
      const next = { ...s };
      delete next[fixture.id];
      return next;
    });
    setWhistled((w) => {
      const next = { ...w };
      delete next[fixture.id];
      return next;
    });
    setDraft(savedEntry?.ticket ?? newDraft());
  }

  /** Apita: tenta o dado real do oráculo; sem ele, simulação rotulada. */
  async function whistle() {
    setWhistling(true);
    let result: { stats: MatchStats; source: StatsSource } = {
      stats: demoFill(fixture),
      source: "demo",
    };
    try {
      const res = await fetch(`/api/scores/${fixture.txlineFixtureId}`);
      if (res.ok) {
        const d = await res.json();
        if (d?.stats) result = { stats: d.stats, source: "txline" };
      }
    } catch {
      /* mantém demo */
    }
    setWhistled((w) => ({ ...w, [fixture.id]: result }));
    setWhistling(false);
  }

  const score = useMemo(
    () =>
      savedEntry && finished
        ? scoreTicket(savedEntry.ticket, finished.stats, marketsMap)
        : null,
    [savedEntry, finished, marketsMap]
  );

  const ranking = useMemo<RankRow[]>(() => {
    if (!savedEntry || !finished) return [];
    const opponents = ticketOpponentsFor(fixture, markets, finished.stats);
    const all = [
      {
        id: "you",
        name: "Você",
        isYou: true,
        ticket: savedEntry.ticket,
        submittedAt: savedEntry.submittedAt,
      },
      ...opponents.map((o) => ({
        id: o.id,
        name: o.name,
        isYou: false,
        ticket: o.ticket,
        submittedAt: o.submittedAt,
      })),
    ];
    const scored = all.map((e) => {
      const r = scoreTicket(e.ticket, finished.stats, marketsMap);
      return {
        id: e.id,
        name: e.name,
        isYou: e.isYou,
        points: r.points,
        valid: r.valid,
        errors: ticketErrors(r),
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
  }, [savedEntry, finished, fixture, markets, marketsMap]);

  const f = finished?.stats;
  const totalCards = f
    ? (f.yellowHome ?? 0) + (f.yellowAway ?? 0) + (f.redHome ?? 0) + (f.redAway ?? 0)
    : 0;
  const totalCorners = f ? (f.cornersHome ?? 0) + (f.cornersAway ?? 0) : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      {/* ---------- Cabeçalho ---------- */}
      <header className="reveal mb-8 flex flex-wrap items-end justify-between gap-6 border-b-2 border-dashed border-chalk/12 pb-7">
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.35em] text-grass-400">
            Copa do Mundo 2026 · mata-mata
          </div>
          <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-wide text-chalk sm:text-6xl">
            4Line
            <br />
            <span className="text-gold-400 [text-shadow:0_0_32px_rgba(255,196,0,0.35)]">
              On-Chain
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-chalk-dim">
            Monte seu <span className="text-chalk">bilhete-meme</span>: cada zoeira por
            cima, um mercado real do oráculo por baixo. Acerte a{" "}
            <span className="text-chalk">trava do resultado</span> e some pontos.
          </p>
        </div>
        <div className="border border-chalk/15 px-4 py-3 font-mono text-[11px] uppercase leading-relaxed tracking-widest text-chalk-dim">
          oráculo txline · devnet
          <br />
          <span className={dataSource === "txline" ? "text-grass-400" : "text-chalk/35"}>
            {dataSource === "txline" ? "● feed ao vivo" : "○ fixtures da cobertura oficial"}
          </span>
        </div>
      </header>

      {/* ---------- Seletor de partidas ---------- */}
      <div
        className="reveal mb-8 flex gap-2.5 overflow-x-auto pb-1"
        style={{ animationDelay: "0.06s" }}
      >
        {fixtures.map((fx) => {
          const active = fx.id === fixture.id;
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
                {fx.stage} · {kickoffLabel(fx.kickoff)}
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
              {finished ? (
                <span className={finished.source === "txline" ? "text-grass-400" : "text-gold-400"}>
                  ● {finished.source === "txline" ? "dado do oráculo" : "simulação"}
                </span>
              ) : (
                <span className="blink text-grass-400">● aguardando bilhetes</span>
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
                {f ? (
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

            {f && (
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

          {/* Bilhete */}
          <div
            className="reveal relative border border-chalk/12 bg-night-800 p-6"
            style={{ animationDelay: "0.14s" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="font-display text-sm uppercase tracking-[0.2em] text-chalk">
                {savedEntry ? "Bilhete" : "Montar bilhete"}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/35">
                fixture {fixture.txlineFixtureId} · {fixture.home.short}×{fixture.away.short}
              </span>
            </div>

            {/* Picote do bilhete */}
            <div className="-mx-6 mb-5 flex items-center">
              <span className="-ml-2 h-4 w-4 rounded-full bg-night-950" />
              <span className="flex-1 border-t-2 border-dashed border-chalk/15" />
              <span className="-mr-2 h-4 w-4 rounded-full bg-night-950" />
            </div>

            {!savedEntry ? (
              <>
                {fromFriend && (
                  <div className="mb-5 flex items-start gap-2.5 border border-dashed border-gold-400/40 bg-gold-400/[0.06] px-3.5 py-2.5">
                    <span className="text-base leading-none">🎟️</span>
                    <div className="font-mono text-[11px] leading-relaxed text-gold-300">
                      <span className="uppercase tracking-widest text-gold-400">
                        Bilhete de um amigo
                      </span>
                      <br />
                      Já preenchemos os mesmos palpites. Revise, ajuste se quiser e
                      sele o <span className="text-chalk">seu</span>.
                    </div>
                  </div>
                )}
                <TicketBuilder
                  fixture={fixture}
                  markets={markets}
                  ticket={draft}
                  onChange={setDraft}
                  onSeal={handleSeal}
                />
              </>
            ) : (
              <div className="space-y-5">
                <div className="relative">
                  <SealedTicket
                    fixture={fixture}
                    markets={markets}
                    ticket={savedEntry.ticket}
                    score={score}
                  />
                  {!finished && (
                    <div className="stamp pointer-events-none absolute right-1 top-0 border-[3px] border-gold-400/80 px-3 py-1 font-display text-xl uppercase tracking-[0.25em] text-gold-400/90">
                      Selado
                    </div>
                  )}
                </div>

                {/* Commit (código de barras) */}
                <div className="border-t-2 border-dashed border-chalk/15 pt-4">
                  <div className="barcode" />
                  <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-widest text-chalk/35">
                    <span>commit local</span>
                    <span>{commitHash(savedEntry.ticket).slice(0, 24)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {!finished && (
                    <button
                      onClick={whistle}
                      disabled={whistling}
                      className="flex-1 border border-gold-400 bg-gold-400 py-3.5 font-display text-lg uppercase tracking-[0.22em] text-night-950 shadow-[5px_5px_0_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 hover:bg-gold-300 active:translate-y-0 active:shadow-[2px_2px_0_rgba(0,0,0,0.55)] disabled:cursor-wait disabled:opacity-70"
                    >
                      {whistling ? "Consultando oráculo…" : "🔔 Apitar fim de jogo"}
                    </button>
                  )}
                  <button
                    onClick={shareTicket}
                    className="border border-gold-400/60 px-4 py-3.5 font-mono text-xs uppercase tracking-widest text-gold-400 transition hover:border-gold-400 hover:bg-gold-400/10"
                  >
                    {copied ? "✓ link copiado" : "🔗 Compartilhar"}
                  </button>
                  <button
                    onClick={reopen}
                    className="border border-chalk/20 px-4 py-3.5 font-mono text-xs uppercase tracking-widest text-chalk-dim transition hover:border-chalk/45 hover:text-chalk"
                  >
                    Refazer
                  </button>
                </div>
                {!finished && (
                  <p className="text-center font-mono text-[11px] leading-relaxed text-chalk/35">
                    Bilhete selado (commit). O apito consulta o oráculo TxLINE; sem
                    dado final disponível, roda uma simulação rotulada.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Coluna lateral ---------- */}
        <aside className="space-y-6">
          {score ? (
            <TicketScore score={score} markets={markets} />
          ) : (
            <div
              className="reveal border border-dashed border-chalk/15 p-8 text-center"
              style={{ animationDelay: "0.18s" }}
            >
              <div className="font-display text-lg uppercase tracking-[0.2em] text-chalk/30">
                Aguardando apito
              </div>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-chalk/35">
                Monte e sele um bilhete, depois apite o fim de jogo para ver sua
                pontuação e o ranking.
              </p>
            </div>
          )}
          {ranking.length > 0 && <Ranking rows={ranking} />}
        </aside>
      </div>

      <footer className="mt-14 border-t border-chalk/8 pt-5 text-center font-mono text-[11px] uppercase tracking-widest text-chalk/25">
        Copa 2026 · oráculo TxLINE (devnet) · motor lib/scoring.mjs · liquidação
        on-chain em breve
      </footer>
    </main>
  );
}
