// Tipos de fixture e geração de adversários mockados para o ranking.
//
// A liga de adversários é simulada no protótipo (Fase 1) — pessoas reais
// entram na Fase Supabase. Os adversários palpitam de forma plausível em
// torno das stats de referência da partida, com erros realistas.

import type { Cartela, MatchStats, Outcome, OUPick } from "./scoring";

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
];

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
