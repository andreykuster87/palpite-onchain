// Dados mockados para o protótipo jogável (Fase 1).
//
// Nada aqui vem do TxLINE ainda: cada fixture carrega um `finalStats`
// pré-determinado (o "resultado real" que o oráculo entregaria no futuro),
// mantido oculto na UI até o jogador "apitar o fim de jogo". Isso permite
// provar a mecânica de pontuação de ponta a ponta, sem backend nem blockchain.
//
// As `lines` são as linhas de mais/menos da partida (como um mercado de
// totals definiria — no futuro, derivadas do feed de odds do TxLINE).
// Sempre meias-linhas (x.5) para nunca haver empate técnico.

import type { Cartela, MatchStats, Outcome, OUPick } from "./scoring";

export interface MarketLines {
  totalGoals: number;
  totalCards: number;
  totalCorners: number;
}

export interface Fixture {
  id: string;
  league: string;
  kickoff: string; // ISO — apenas rótulo
  home: { name: string; short: string };
  away: { name: string; short: string };
  /** Linhas de mais/menos oferecidas para esta partida. */
  lines: MarketLines;
  /** Resultado final simulado (o que o TxLINE proveria). Oculto até apitar. */
  finalStats: MatchStats;
}

export interface Opponent {
  id: string;
  name: string;
  cartela: Cartela;
  submittedAt: number;
}

/** Rodada mockada do Brasileirão. */
export const FIXTURES: Fixture[] = [
  {
    id: "fx-1",
    league: "Brasileirão · Rodada 15",
    kickoff: "2026-07-18T21:30:00Z",
    home: { name: "Flamengo", short: "FLA" },
    away: { name: "Palmeiras", short: "PAL" },
    lines: { totalGoals: 2.5, totalCards: 5.5, totalCorners: 9.5 },
    finalStats: {
      goalsHome: 2,
      goalsAway: 1,
      yellowHome: 2,
      yellowAway: 3,
      redHome: 0,
      redAway: 1,
      cornersHome: 6,
      cornersAway: 4,
    },
  },
  {
    id: "fx-2",
    league: "Brasileirão · Rodada 15",
    kickoff: "2026-07-19T00:00:00Z",
    home: { name: "Corinthians", short: "COR" },
    away: { name: "São Paulo", short: "SAO" },
    lines: { totalGoals: 2.5, totalCards: 6.5, totalCorners: 9.5 },
    finalStats: {
      goalsHome: 1,
      goalsAway: 1,
      yellowHome: 4,
      yellowAway: 2,
      redHome: 0,
      redAway: 0,
      cornersHome: 3,
      cornersAway: 7,
    },
  },
  {
    id: "fx-3",
    league: "Brasileirão · Rodada 15",
    kickoff: "2026-07-19T21:00:00Z",
    home: { name: "Grêmio", short: "GRE" },
    away: { name: "Internacional", short: "INT" },
    lines: { totalGoals: 2.5, totalCards: 4.5, totalCorners: 10.5 },
    finalStats: {
      goalsHome: 0,
      goalsAway: 2,
      yellowHome: 3,
      yellowAway: 1,
      redHome: 1,
      redAway: 0,
      cornersHome: 5,
      cornersAway: 5,
    },
  },
];

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

// PRNG determinístico (mulberry32) — evita depender de Math.random e mantém
// os adversários estáveis entre reloads para uma mesma fixture.
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
 * Gera adversários mockados para uma fixture. Cartelas plausíveis (às vezes
 * acertam a trava, às vezes não) para dar vida ao ranking. Determinístico
 * por fixture.
 */
export function opponentsFor(fixture: Fixture, count = 7): Opponent[] {
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

  const f = fixture.finalStats;

  return NOMES.slice(0, count).map((name, i) => {
    const cartela: Cartela = {
      result: pick(OUTCOMES),
      exactScore: { home: near(f.goalsHome, 1), away: near(f.goalsAway, 1) },
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
