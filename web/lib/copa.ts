// Copa do Mundo 2026 — fixtures REAIS do TxLINE (fase eliminatória).
//
// Os fixtureIds vêm da cobertura oficial do TxLINE
// (documentation/scores/schedule). O app tenta sempre os dados ao vivo via
// /api/fixtures e /api/scores/[id]; este módulo é (1) a lista-semente com os
// IDs reais e (2) o fallback de demonstração quando o oráculo ainda não
// respondeu (ex.: jogo futuro) — nesse caso o "apitar" usa `demoStats`,
// claramente rotulado como simulação na UI.

import type { MatchStats } from "./scoring";
import type { Fixture } from "./mock";

export interface CopaFixture extends Fixture {
  /** ID real no TxLINE — usado nas chamadas de scores/validação. */
  txlineFixtureId: number;
  stage: string;
  status: "FINISHED" | "UPCOMING";
  /** Stats simulados para o modo demo (jogos sem dado final do oráculo). */
  demoStats?: MatchStats;
}

// Linhas de mais/menos por jogo (mata-mata tende a menos gols; no futuro,
// derivadas do feed de odds StablePrice do TxLINE).
const KNOCKOUT_LINES = { totalGoals: 2.5, totalCards: 4.5, totalCorners: 9.5 };

export const COPA_FIXTURES: CopaFixture[] = [
  {
    id: "wc-qf-fra-mar",
    txlineFixtureId: 18209181,
    league: "Copa 2026 · Quartas",
    stage: "Quartas de final",
    status: "FINISHED",
    kickoff: "2026-07-09T20:00:00Z",
    home: { name: "França", short: "FRA" },
    away: { name: "Marrocos", short: "MAR" },
    lines: KNOCKOUT_LINES,
    // Placar real 2–0 (TxLINE schedule); cartões/escanteios virão do snapshot.
    finalStats: { goalsHome: 2, goalsAway: 0 },
  },
  {
    id: "wc-qf-esp-bel",
    txlineFixtureId: 18218149,
    league: "Copa 2026 · Quartas",
    stage: "Quartas de final",
    status: "FINISHED",
    kickoff: "2026-07-10T19:00:00Z",
    home: { name: "Espanha", short: "ESP" },
    away: { name: "Bélgica", short: "BEL" },
    lines: KNOCKOUT_LINES,
    finalStats: { goalsHome: 2, goalsAway: 1 },
  },
  {
    id: "wc-qf-nor-eng",
    txlineFixtureId: 18213979,
    league: "Copa 2026 · Quartas",
    stage: "Quartas de final",
    status: "FINISHED",
    kickoff: "2026-07-11T21:00:00Z",
    home: { name: "Noruega", short: "NOR" },
    away: { name: "Inglaterra", short: "ENG" },
    lines: KNOCKOUT_LINES,
    finalStats: { goalsHome: 1, goalsAway: 2 },
  },
  {
    id: "wc-qf-arg-sui",
    txlineFixtureId: 18222446,
    league: "Copa 2026 · Quartas",
    stage: "Quartas de final",
    status: "FINISHED",
    kickoff: "2026-07-12T01:00:00Z",
    home: { name: "Argentina", short: "ARG" },
    away: { name: "Suíça", short: "SUI" },
    lines: KNOCKOUT_LINES,
    finalStats: { goalsHome: 3, goalsAway: 1 },
  },
  {
    id: "wc-sf-fra-esp",
    txlineFixtureId: 18237038,
    league: "Copa 2026 · Semifinal",
    stage: "Semifinal",
    status: "UPCOMING",
    kickoff: "2026-07-14T19:00:00Z",
    home: { name: "França", short: "FRA" },
    away: { name: "Espanha", short: "ESP" },
    lines: KNOCKOUT_LINES,
    demoStats: {
      goalsHome: 1,
      goalsAway: 2,
      yellowHome: 3,
      yellowAway: 2,
      redHome: 0,
      redAway: 0,
      cornersHome: 4,
      cornersAway: 6,
    },
  },
  {
    id: "wc-sf-eng-arg",
    txlineFixtureId: 18241006,
    league: "Copa 2026 · Semifinal",
    stage: "Semifinal",
    status: "UPCOMING",
    kickoff: "2026-07-15T19:00:00Z",
    home: { name: "Inglaterra", short: "ENG" },
    away: { name: "Argentina", short: "ARG" },
    lines: KNOCKOUT_LINES,
    demoStats: {
      goalsHome: 2,
      goalsAway: 2, // demo: pênaltis não contam no 1X2 do tempo normal
      yellowHome: 4,
      yellowAway: 3,
      redHome: 0,
      redAway: 1,
      cornersHome: 5,
      cornersAway: 7,
    },
  },
];
