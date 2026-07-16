import type { Outcome } from "./scoring";

export const OUTCOME_LABEL: Record<Outcome, string> = {
  HOME: "Mandante",
  DRAW: "Empate",
  AWAY: "Visitante",
};

export const VAR_LABEL: Record<string, string> = {
  result: "Resultado (trava)",
  exactScore: "Placar exato",
  totalGoals: "Total de gols",
  totalCards: "Total de cartões",
  totalCorners: "Total de escanteios",
};
