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
