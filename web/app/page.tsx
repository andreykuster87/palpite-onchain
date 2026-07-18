"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scoreTicket, ticketErrors, rankEntries } from "@/lib/scoring.mjs";
import type { Ticket, MatchStats } from "@/lib/scoring";
import { ticketOpponentsFor, poolMembers, poolStandings } from "@/lib/mock";
import { COPA_FIXTURES, type CopaFixture } from "@/lib/copa";
import { catalogFor, catalogMap } from "@/lib/catalog";
import { commitHash } from "@/lib/hash";
import { TicketBuilder } from "@/components/TicketBuilder";
import { SealedTicket } from "@/components/SealedTicket";
import { TicketScore } from "@/components/TicketScore";
import { Ranking, type RankRow } from "@/components/Ranking";
import { readShareFromHash, buildShareUrl, type SharedTicket } from "@/lib/share";
import { Prateleira } from "@/components/Prateleira";
import { HowToPlay } from "@/components/HowToPlay";
import { PoolBar } from "@/components/PoolBar";
import {
  PLATFORM_POOL,
  listPools,
  createPool,
  joinByCode,
  joinPool,
  leavePool,
  buildInviteUrl,
  readInviteFromHash,
  prizeBreakdown,
  type Pool,
} from "@/lib/pools";
import { getIdentity, setNickname as persistNickname, type Identity } from "@/lib/identity";
import {
  listEntries,
  enterPool,
  removeEntriesForPool,
  type PoolEntry,
} from "@/lib/entries";

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
    // Craques (agregado plausível p/ o modo demo — jogo sem dado final real).
    topScorerGoals: 1,
    penGoalsTotal: 0,
    penAttemptsTotal: 0,
    maxPlayerYellows: 1,
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
  // Minuto da partida ao vivo por fixture (0..90). Ausente = não começou; 90 = fim.
  const [liveMin, setLiveMin] = useState<Record<string, number>>({});
  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Bilhete compartilhado carregado do hash da URL (#b=…), se houver.
  const [incoming, setIncoming] = useState<SharedTicket | null>(null);
  // fixtureId cujo link foi copiado agora há pouco (feedback "✓ copiado").
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bolões (local): identidade, lista de bolões e o bolão ativo.
  const [identity, setIdentity] = useState<Identity>({ userId: "", nickname: "" });
  const [pools, setPools] = useState<Pool[]>([PLATFORM_POOL]);
  const [activePoolId, setActivePoolId] = useState<string>(PLATFORM_POOL.id);
  const [copiedPoolId, setCopiedPoolId] = useState<string | null>(null);
  // Inscrições de bilhetes em bolões (pagamento simulado por enquanto).
  const [poolEntries, setPoolEntries] = useState<PoolEntry[]>([]);
  // Guia "Como jogar" — dispensável (some depois que a pessoa entende).
  const [guideDismissed, setGuideDismissed] = useState(false);

  const activePool = pools.find((p) => p.id === activePoolId) ?? PLATFORM_POOL;
  // Participantes simulados do bolão ativo (roster estável por código).
  const activeMembers = useMemo(
    () => poolMembers(activePool.code, activePool.isPlatform ? 11 : undefined),
    [activePool]
  );

  const fixture = fixtures.find((f) => f.id === fixtureId) ?? fixtures[0];
  const savedEntry = saved[fixture.id];
  const finished = whistled[fixture.id];
  // Fase da partida desta fixture: relógio ao vivo → resultado final.
  const lm = liveMin[fixture.id];
  const isLive = lm !== undefined && lm < 90;
  const isFinal = !!finished && (lm === undefined || lm >= 90);
  // Estamos vendo um bilhete que veio de um amigo (para esta fixture)?
  const fromFriend = !!incoming && incoming.fixtureId === fixture.id;

  // Catálogo de mercados-meme desta fixture (nomes dos times + linhas tecidos).
  const markets = useMemo(() => catalogFor(fixture), [fixture]);
  const marketsMap = useMemo(() => catalogMap(markets), [markets]);

  // Minha prateleira: todos os bilhetes que selei (por fixture), do mais novo.
  const shelf = useMemo(
    () =>
      Object.entries(saved)
        .map(([fid, e]) => {
          const fx = fixtures.find((f) => f.id === fid);
          return fx
            ? { fixtureId: fid, fixture: fx, ticket: e.ticket, submittedAt: e.submittedAt }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.submittedAt - a.submittedAt),
    [saved, fixtures]
  );

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
      if (localStorage.getItem("palpite:guideSeen") === "1") setGuideDismissed(true);
    } catch {
      /* ignora storage indisponível */
    }
    setHydrated(true);
  }, []);

  function dismissGuide() {
    setGuideDismissed(true);
    try {
      localStorage.setItem("palpite:guideSeen", "1");
    } catch {
      /* ignora */
    }
  }

  // Persiste sempre que 'saved' muda (após hidratar).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* ignora */
    }
  }, [saved, hydrated]);

  // Hidrata identidade + bolões (local) e trata convite no hash (#p=…).
  useEffect(() => {
    setIdentity(getIdentity());
    const invite = readInviteFromHash();
    if (invite) {
      joinPool(invite, Date.now());
      setActivePoolId(invite.id);
    }
    setPools(listPools());
    setPoolEntries(listEntries());
    try {
      const savedActive = localStorage.getItem("palpite:activePool:v1");
      // Convite tem prioridade sobre o bolão salvo.
      if (savedActive && !invite) setActivePoolId(savedActive);
    } catch {
      /* ignora */
    }
  }, []);

  // Persiste o bolão ativo (após hidratar).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("palpite:activePool:v1", activePoolId);
    } catch {
      /* ignora */
    }
  }, [activePoolId, hydrated]);

  // ---- Ações de bolão (a camada lib persiste; o estado espelha) ----
  function handleCreatePool(name: string, buyIn: number) {
    const pool = createPool(name, buyIn, Date.now());
    setPools(listPools());
    setActivePoolId(pool.id);
  }
  function handleJoinCode(code: string) {
    const pool = joinByCode(code, Date.now());
    setPools(listPools());
    if (pool) setActivePoolId(pool.id);
  }
  function handleLeavePool(id: string) {
    leavePool(id);
    setPoolEntries(removeEntriesForPool(id)); // some as inscrições daquele bolão
    setPools(listPools());
    if (activePoolId === id) setActivePoolId(PLATFORM_POOL.id);
  }
  /** Inscreve o bilhete de uma fixture num bolão (pagamento simulado). */
  function handleEnterPool(fixtureId: string, poolId: string, ticket: Ticket) {
    const pool = pools.find((p) => p.id === poolId);
    setPoolEntries(
      enterPool(poolId, fixtureId, ticket, pool?.buyIn ?? 0, Date.now())
    );
  }
  function handleSetNickname(name: string) {
    setIdentity(persistNickname(name));
  }
  async function handleCopyInvite(id: string) {
    const pool = pools.find((p) => p.id === id);
    if (!pool) return;
    const url = buildInviteUrl(pool);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPoolId(id);
      window.setTimeout(() => setCopiedPoolId((c) => (c === id ? null : c)), 2200);
    } catch {
      window.prompt("Copie o link de convite do bolão:", url);
    }
  }

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

  function stopLiveTimer() {
    if (liveTimer.current) {
      clearInterval(liveTimer.current);
      liveTimer.current = null;
    }
  }
  // Limpa o timer ao desmontar.
  useEffect(() => () => stopLiveTimer(), []);

  /**
   * Busca o resultado final (oráculo/demo) e roda a partida AO VIVO: o relógio
   * vai de 0' a 90'; os palpites vão confirmando/negando conforme o minuto de
   * resolução de cada um; no 90' fecha o placar final. Simulado por enquanto
   * (jogos do demo já encerrados); troca por in-play real com o stream do oráculo.
   */
  async function playLive(fx: CopaFixture) {
    let result: { stats: MatchStats; source: StatsSource } = {
      stats: demoFill(fx),
      source: "demo",
    };
    try {
      const res = await fetch(`/api/scores/${fx.txlineFixtureId}`);
      if (res.ok) {
        const d = await res.json();
        if (d?.stats) result = { stats: d.stats, source: "txline" };
      }
    } catch {
      /* mantém demo */
    }
    const fid = fx.id;
    setWhistled((w) => ({ ...w, [fid]: result }));
    stopLiveTimer();
    setLiveMin((m) => ({ ...m, [fid]: 0 }));
    liveTimer.current = setInterval(() => {
      setLiveMin((m) => {
        const cur = Math.min(90, (m[fid] ?? 0) + 2);
        if (cur >= 90) stopLiveTimer();
        return { ...m, [fid]: cur };
      });
    }, 200); // ~9s de jogo
  }

  function handleSeal() {
    setSaved((s) => ({
      ...s,
      [fixture.id]: { ticket: draft, submittedAt: Date.now() },
    }));
    playLive(fixture); // sela → começa a partida ao vivo
  }

  /** Gera o link de um bilhete selado (por fixture) e copia pro clipboard. */
  async function shareById(fid: string) {
    const entry = saved[fid];
    if (!entry) return;
    const url = buildShareUrl(fid, entry.ticket);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(fid);
      window.setTimeout(
        () => setCopiedId((c) => (c === fid ? null : c)),
        2200
      );
    } catch {
      // Clipboard indisponível (contexto não-seguro): mostra pra copiar à mão.
      window.prompt("Copie o link do seu bilhete:", url);
    }
  }

  function reopen() {
    stopLiveTimer();
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
    setLiveMin((m) => {
      const next = { ...m };
      delete next[fixture.id];
      return next;
    });
    setDraft(savedEntry?.ticket ?? newDraft());
  }

  // Pontuação por palpite (hit/miss) — disponível já durante o ao vivo (o reveal
  // por minuto é feito no SealedTicket). O TOTAL só é exibido no fim (isFinal).
  const score = useMemo(
    () =>
      savedEntry && finished
        ? scoreTicket(savedEntry.ticket, finished.stats, marketsMap)
        : null,
    [savedEntry, finished, marketsMap]
  );

  // Ranking SIMULADO enquanto o jogo não terminou; no fim (isFinal), pontuação
  // real de você + adversários contra o dado do oráculo.
  const rankingSimulated = !(savedEntry && isFinal);

  const ranking = useMemo<RankRow[]>(() => {
    const count = activePool.isPlatform ? 11 : undefined;
    const youName = identity.nickname || "Você";

    // Fim de jogo: pontuação real.
    if (savedEntry && isFinal) {
      const opponents = ticketOpponentsFor(fixture, markets, finished.stats, {
        seed: activePool.code,
        count,
      });
      const all = [
        {
          id: "you",
          name: youName,
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
    }

    // Sempre-visível: ranking SIMULADO do bolão (nomes da galera aparecendo) +
    // você pendente até montar/apitar.
    const rows: RankRow[] = poolStandings(activePool.code, count).map((s, i) => ({
      id: `sim-${i}`,
      name: s.name,
      points: s.points,
      valid: true,
      isYou: false,
    }));
    rows.push({
      id: "you",
      name: youName,
      points: 0,
      valid: true,
      isYou: true,
      pending: true,
    });
    return rows;
  }, [savedEntry, isFinal, finished, fixture, markets, marketsMap, activePool, identity.nickname]);

  // Placar final só aparece no fim do jogo (durante o ao vivo mostra o relógio).
  const f = isFinal ? finished?.stats : undefined;
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

      {/* ---------- Barra de bolões ---------- */}
      <PoolBar
        pools={pools}
        activePoolId={activePoolId}
        identity={identity}
        members={activeMembers}
        standings={ranking}
        live={rankingSimulated}
        copiedPoolId={copiedPoolId}
        onSelect={setActivePoolId}
        onCreate={handleCreatePool}
        onJoinCode={handleJoinCode}
        onLeave={handleLeavePool}
        onSetNickname={handleSetNickname}
        onCopyInvite={handleCopyInvite}
      />

      {/* ---------- Seletor de partidas ---------- */}
      <div
        data-guide="jogo"
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

      {/* ---------- Guia "Como jogar" (fase de montar, dispensável) ---------- */}
      {!savedEntry && !guideDismissed && (
        <div className="mb-6">
          <HowToPlay onDismiss={dismissGuide} />
        </div>
      )}

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
              {isLive ? (
                <span className="blink text-grass-400">● ao vivo · {lm}&apos;</span>
              ) : isFinal ? (
                <span className={finished?.source === "txline" ? "text-grass-400" : "text-gold-400"}>
                  ● encerrado · {finished?.source === "txline" ? "dado do oráculo" : "simulação"}
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
                ) : isLive ? (
                  <div className="score-pop font-mono text-5xl font-bold tabular-nums leading-none text-grass-400 sm:text-6xl">
                    {lm}
                    <span className="text-lg text-grass-400/60">&apos;</span>
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

            {isLive && (
              <div className="relative mt-7 border-t border-dashed border-chalk/12 pt-5">
                <div className="h-1.5 w-full overflow-hidden bg-night-800">
                  <div
                    className="h-full bg-grass-400 transition-[width] duration-150 ease-linear"
                    style={{ width: `${Math.round((lm! / 90) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-chalk/40">
                  bola rolando · os palpites vão confirmando
                </div>
              </div>
            )}

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
                    liveMin={isLive ? lm : undefined}
                  />
                  {!isFinal && (
                    <div className="stamp pointer-events-none absolute right-1 top-0 border-[3px] border-gold-400/80 px-3 py-1 font-display text-xl uppercase tracking-[0.25em] text-gold-400/90">
                      {isLive ? "No ar" : "Selado"}
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
                  {/* Bilhete selado que ainda não jogou (ex.: após reload): assistir. */}
                  {!finished && !isLive && (
                    <button
                      onClick={() => playLive(fixture)}
                      className="flex-1 border border-gold-400 bg-gold-400 py-3.5 font-display text-lg uppercase tracking-[0.22em] text-night-950 shadow-[5px_5px_0_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 hover:bg-gold-300 active:translate-y-0 active:shadow-[2px_2px_0_rgba(0,0,0,0.55)]"
                    >
                      ▶ Assistir resultado
                    </button>
                  )}
                  {isLive && (
                    <div className="flex flex-1 items-center justify-center gap-2 border border-grass-400/50 bg-grass-400/[0.06] py-3.5 font-display text-lg uppercase tracking-[0.22em] text-grass-400">
                      <span className="blink">●</span> Ao vivo · {lm}&apos;
                    </div>
                  )}
                  <button
                    onClick={() => shareById(fixture.id)}
                    className="border border-gold-400/60 px-4 py-3.5 font-mono text-xs uppercase tracking-widest text-gold-400 transition hover:border-gold-400 hover:bg-gold-400/10"
                  >
                    {copiedId === fixture.id ? "✓ link copiado" : "🔗 Compartilhar"}
                  </button>
                  <button
                    onClick={reopen}
                    className="border border-chalk/20 px-4 py-3.5 font-mono text-xs uppercase tracking-widest text-chalk-dim transition hover:border-chalk/45 hover:text-chalk"
                  >
                    Refazer
                  </button>
                </div>
                {isLive ? (
                  <div className="flex items-start gap-2.5 border border-grass-400/40 bg-grass-400/[0.06] px-3.5 py-2.5">
                    <span className="text-base leading-none">👀</span>
                    <p className="font-mono text-[11px] leading-relaxed text-grass-400">
                      <span className="uppercase tracking-widest">Acompanhe ao vivo</span>
                      <br />
                      Palpite selado! Agora é só torcer: cada aposta vai{" "}
                      <span className="text-grass-300">confirmando ou negando</span>{" "}
                      conforme o jogo anda. No apito final, o{" "}
                      <span className="text-grass-300">resultado completo</span> + sua
                      pontuação e o ranking.
                    </p>
                  </div>
                ) : (
                  !isFinal && (
                    <p className="text-center font-mono text-[11px] leading-relaxed text-chalk/35">
                      Palpite selado (commit). &quot;Assistir&quot; consulta o oráculo
                      TxLINE; sem dado final, roda uma simulação rotulada.
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Coluna lateral ---------- */}
        <aside className="space-y-6">
          {/* Ranking do bolão em destaque no topo (nome + premiação + posições) */}
          <Ranking
            rows={ranking}
            title={activePool.name}
            live={rankingSimulated}
            prize={
              activePool.buyIn > 0
                ? prizeBreakdown(activePool.buyIn, activeMembers.length + 1)
                : null
            }
          />
          {/* Detalhe da sua pontuação (abaixo do ranking) */}
          {isFinal && score ? (
            <TicketScore score={score} markets={markets} />
          ) : (
            <div
              className="reveal border border-dashed border-chalk/15 p-6 text-center"
              style={{ animationDelay: "0.18s" }}
            >
              <div
                className={`font-display text-base uppercase tracking-[0.2em] ${
                  isLive ? "blink text-grass-400" : "text-chalk/30"
                }`}
              >
                {isLive ? `● Jogo ao vivo · ${lm}'` : "Aguardando seu palpite"}
              </div>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-chalk/35">
                {isLive
                  ? "Os palpites vão confirmando durante a partida. No apito final, sua pontuação detalhada."
                  : "Monte e sele seu palpite para acompanhar o jogo ao vivo e disputar o ranking."}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ---------- Minha prateleira (bilhetes selados, compartilháveis) ---------- */}
      {shelf.length > 0 && (
        <Prateleira
          shelf={shelf}
          pools={pools}
          poolEntries={poolEntries}
          activeId={fixture.id}
          copiedId={copiedId}
          onOpen={setFixtureId}
          onShare={shareById}
          onEnter={handleEnterPool}
        />
      )}

      <footer className="mt-14 border-t border-chalk/8 pt-5 text-center font-mono text-[11px] uppercase tracking-widest text-chalk/25">
        Copa 2026 · oráculo TxLINE (devnet) · motor lib/scoring.mjs · liquidação
        on-chain em breve
      </footer>
    </main>
  );
}
