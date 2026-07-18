// Tipagem TS para o motor de pontuação (scoring.mjs). Mantém o .mjs como
// fonte-da-verdade em JS puro (reusado pela Edge Function e testes node),
// e dá tipos fortes ao front sem duplicar a lógica.

export type Outcome = "HOME" | "DRAW" | "AWAY";
export type OUPick = "OVER" | "UNDER";

/** Palpite mais/menos com a linha travada no bilhete. */
export interface OverUnder {
  pick: OUPick;
  line: number;
}

export interface MatchStats {
  goalsHome: number;
  goalsAway: number;
  yellowHome?: number;
  yellowAway?: number;
  redHome?: number;
  redAway?: number;
  cornersHome?: number;
  cornersAway?: number;
  /** Craques (PlayerStats agregado). */
  topScorerGoals?: number;
  penGoalsTotal?: number;
  penAttemptsTotal?: number;
  maxPlayerYellows?: number;
}

export interface Cartela {
  result: Outcome;
  exactScore?: { home: number; away: number };
  totalGoals?: OverUnder;
  totalCards?: OverUnder;
  totalCorners?: OverUnder;
}

export interface ScoringConfig {
  gateIncludesDraw: boolean;
  floorAtZero: boolean;
  weights: {
    exactScore: number;
    totalGoals: number;
    totalCards: number;
    totalCorners: number;
  };
  penalties: {
    exactScore: number;
    totalGoals: number;
    totalCards: number;
    totalCorners: number;
  };
}

export interface ScoreBreakdownItem {
  key: string;
  hit: boolean;
  delta: number;
}

export interface ScoreResult {
  valid: boolean;
  points: number;
  breakdown: ScoreBreakdownItem[];
}

export const DEFAULT_CONFIG: ScoringConfig;

export function outcomeOf(m: MatchStats): Outcome;
export function totalGoals(m: MatchStats): number;
export function totalCards(m: MatchStats): number;
export function totalCorners(m: MatchStats): number;
export function hitOverUnder(ou: OverUnder, actual: number): boolean;
export function scoreCartela(
  cartela: Cartela,
  match: MatchStats,
  config?: ScoringConfig
): ScoreResult;
export function rankEntries<
  T extends { points: number; valid: boolean; errors: number; submittedAt: number }
>(entries: T[]): T[];

/* ---------- Motor v2: bilhetes-meme ---------- */

export type Camada = "facil" | "media" | "dificil" | "zoeira";
export type Cmp = "over" | "under" | "atLeast" | "atMost" | "is";

export interface MarketResolve {
  metric: string;
  cmp: Cmp;
  line: number;
}

export interface TicketPick {
  marketId: string;
  side: "SIM" | "NAO";
}

export interface Ticket {
  result: Outcome;
  picks: TicketPick[];
}

export interface TicketBreakdownItem {
  marketId: string;
  hit: boolean;
  happened?: boolean;
  side?: "SIM" | "NAO";
  scored: boolean;
  delta: number;
}

export interface TicketScoreResult {
  valid: boolean;
  points: number;
  breakdown: TicketBreakdownItem[];
}

export const LAYER_POINTS: Record<Camada, { hit: number; miss: number }>;
export const MARKET_METRICS: Record<string, (m: MatchStats) => number>;

export function marketHappened(resolve: MarketResolve, stats: MatchStats): boolean;
export function scoreTicket(
  ticket: Ticket,
  stats: MatchStats,
  markets: Record<string, { camada: Camada; resolve: MarketResolve }>,
  config?: ScoringConfig
): TicketScoreResult;
export function ticketErrors(scored: { breakdown: TicketBreakdownItem[] }): number;
