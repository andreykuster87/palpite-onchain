// Tipos de fixture e geração de adversários mockados para o ranking.
//
// A liga de adversários é simulada no protótipo (Fase 1) — pessoas reais
// entram na Fase Supabase. Os adversários palpitam de forma plausível em
// torno das stats de referência da partida, com erros realistas.

import type { Cartela, MatchStats, Outcome, OUPick, Ticket } from "./scoring";
import { marketHappened, outcomeOf } from "./scoring.mjs";
import type { Market } from "./catalog";

export interface MarketLines {
  totalGoals: number;
  totalCards: number;
  totalCorners: number;
}

export interface Fixture {
  id: string;
  league: string;
  kickoff: string; // ISO
  home: { name: string; short: string };
  away: { name: string; short: string };
  /** Linhas de mais/menos oferecidas para esta partida (sempre x.5). */
  lines: MarketLines;
  /** Stats finais, se já conhecidas (parciais ou completas). */
  finalStats?: MatchStats;
}

export interface Opponent {
  id: string;
  name: string;
  cartela: Cartela;
  submittedAt: number;
}

const NOMES = [
  "Ana",
  "Bruno",
  "Carla",
  "Diego",
  "Eduarda",
  "Felipe",
  "Gabi",
  "Henrique",
  "Isadora",
  "João",
  "Karina",
  "Lucas",
  "Marina",
  "Nando",
  "Olívia",
  "Paulo",
  "Rafa",
  "Sofia",
];

/** Fatia de `count` nomes começando em `offset` (circular) — cada bolão
 *  mostra um elenco diferente e estável. */
function namesFrom(offset: number, count: number): string[] {
  return Array.from(
    { length: Math.min(count, NOMES.length) },
    (_, i) => NOMES[(offset + i) % NOMES.length]
  );
}

/**
 * Roster (participantes simulados) de um bolão — ESTÁVEL por `seed` (código do
 * bolão) e independente de fixture: é a mesma lista em qualquer jogo. Fonte
 * única de "quem está no bolão", usada tanto pela lista de participantes quanto
 * pelo ranking (que só varia os palpites por partida). Quando o Supabase entrar,
 * vira a consulta a `pool_members`.
 */
export function poolMembers(seed: string, count?: number): string[] {
  const rand = mulberry32(seedFromString(`${seed}:members`));
  const n = count ?? 4 + Math.floor(rand() * 5); // 4–8
  const offset = Math.floor(rand() * NOMES.length);
  return namesFrom(offset, n);
}

export interface Standing {
  name: string;
  points: number;
}

/**
 * Ranking SIMULADO do bolão — sempre visível, pra dar vida (os nomes da galera
 * aparecendo mesmo antes do apito). Pontos pseudo-aleatórios estáveis por
 * `seed` (código do bolão), do maior pro menor. Puramente decorativo até o
 * ranking real (por inscrição + oráculo) entrar com o backend.
 */
export function poolStandings(seed: string, count?: number): Standing[] {
  const names = poolMembers(seed, count);
  const rand = mulberry32(seedFromString(`${seed}:standings`));
  return names
    .map((name) => ({
      name,
      // 5..58 pontos, com um pouco de cauda alta para haver um "líder".
      points: 5 + Math.floor(rand() * 48) + Math.floor(rand() * 6),
    }))
    .sort((a, b) => b.points - a.points);
}

// PRNG determinístico (mulberry32) — mantém os adversários estáveis entre
// reloads para uma mesma fixture.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const OUTCOMES: Outcome[] = ["HOME", "DRAW", "AWAY"];

/**
 * Gera adversários mockados para uma fixture, palpitando em torno de
 * `refStats` (as stats reais/simuladas da partida). Determinístico por
 * fixture.
 */
export function opponentsFor(
  fixture: Fixture,
  refStats: MatchStats,
  count = 7
): Opponent[] {
  const rand = mulberry32(seedFromString(fixture.id));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const near = (base: number, spread: number) =>
    Math.max(0, base + Math.round((rand() - 0.5) * 2 * spread));
  /** Mais/menos aleatório contra a linha — ou nenhum palpite (1/4 das vezes). */
  const maybeOU = (line: number): { pick: OUPick; line: number } | undefined => {
    const r = rand();
    if (r < 0.25) return undefined;
    return { pick: r < 0.625 ? "OVER" : "UNDER", line };
  };

  return NOMES.slice(0, count).map((name, i) => {
    const cartela: Cartela = {
      result: pick(OUTCOMES),
      exactScore: {
        home: near(refStats.goalsHome, 1),
        away: near(refStats.goalsAway, 1),
      },
      totalGoals: maybeOU(fixture.lines.totalGoals),
      totalCards: maybeOU(fixture.lines.totalCards),
      totalCorners: maybeOU(fixture.lines.totalCorners),
    };
    return {
      id: `opp-${fixture.id}-${i}`,
      name,
      cartela,
      submittedAt: 1_700_000_000_000 + i * 60_000,
    };
  });
}

export interface TicketOpponent {
  id: string;
  name: string;
  ticket: Ticket;
  submittedAt: number;
}

/**
 * Adversários no modelo de bilhete-meme. Palpitam em torno das stats de
 * referência com "habilidade" imperfeita: acertam a trava e o lado de cada
 * mercado com probabilidade < 1, gerando um ranking com spread realista.
 *
 * Determinístico por (fixture + bolão): a `seed` (código do bolão) faz cada
 * liga mostrar um campo estável e distinto — dois dispositivos com o mesmo
 * código veem os mesmos adversários. Quando o Supabase entrar, esta função é
 * substituída pelos bilhetes reais dos membros.
 */
export function ticketOpponentsFor(
  fixture: Fixture,
  markets: Market[],
  refStats: MatchStats,
  opts: { seed?: string; count?: number } = {}
): TicketOpponent[] {
  const seed = opts.seed ?? "";
  // Elenco vem do roster estável do bolão (mesmos nomes em qualquer jogo);
  // aqui só variamos os PALPITES por partida (semente inclui o fixture.id).
  const names = poolMembers(seed, opts.count);
  const rand = mulberry32(seedFromString(`${fixture.id}:${seed}:tickets`));
  const actual = outcomeOf(refStats);

  return names.map((name, i) => {
    // Trava: 60% acerta o resultado real; senão, escolhe qualquer um.
    const result: Outcome = rand() < 0.6 ? actual : OUTCOMES[Math.floor(rand() * 3)];

    const picks = markets
      .filter(() => rand() < 0.55) // opta por ~metade dos mercados
      .map((m) => {
        const happened = marketHappened(m.resolve, refStats);
        // 62% "habilidade": alinha o lado com o que aconteceu.
        const correct = rand() < 0.62;
        const side: "SIM" | "NAO" = (happened === correct ? "SIM" : "NAO");
        return { marketId: m.id, side };
      });

    return {
      id: `topp-${fixture.id}-${seed}-${i}`,
      name,
      ticket: { result, picks },
      submittedAt: 1_700_000_000_000 + i * 60_000,
    };
  });
}
