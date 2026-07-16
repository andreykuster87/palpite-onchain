// Copa do Mundo 2026 — fixtures REAIS do TxLINE (fase eliminatória).
//
// Os fixtureIds e todos os `finalStats` abaixo vieram do próprio oráculo
// (fixtures/snapshot + scores/snapshot na devnet, tier grátis ativado em
// 17/07/2026). O app tenta sempre os dados ao vivo via /api/fixtures e
// /api/scores/[id]; este módulo é (1) a lista-semente com os IDs reais e
// (2) o fallback de demonstração — para jogos ainda sem dado final, o
// "apitar" usa `demoStats`, claramente rotulado como simulação na UI.

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
    // Stats reais do snapshot TxLINE (statKeys 1–8).
    finalStats: {
      goalsHome: 2, goalsAway: 0,
      yellowHome: 0, yellowAway: 1,
      redHome: 0, redAway: 0,
      cornersHome: 5, cornersAway: 5,
    },
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
    finalStats: {
      goalsHome: 2, goalsAway: 1,
      yellowHome: 2, yellowAway: 2,
      redHome: 0, redAway: 0,
      cornersHome: 5, cornersAway: 1,
    },
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
    finalStats: {
      goalsHome: 1, goalsAway: 2,
      yellowHome: 1, yellowAway: 0,
      redHome: 0, redAway: 0,
      cornersHome: 7, cornersAway: 4,
    },
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
    finalStats: {
      goalsHome: 3, goalsAway: 1,
      yellowHome: 3, yellowAway: 1,
      redHome: 0, redAway: 1,
      cornersHome: 8, cornersAway: 2,
    },
  },
  {
    id: "wc-sf-fra-esp",
    txlineFixtureId: 18237038,
    league: "Copa 2026 · Semifinal",
    stage: "Semifinal",
    status: "FINISHED",
    kickoff: "2026-07-14T19:00:00Z",
    home: { name: "França", short: "FRA" },
    away: { name: "Espanha", short: "ESP" },
    lines: KNOCKOUT_LINES,
    finalStats: {
      goalsHome: 0, goalsAway: 2,
      yellowHome: 2, yellowAway: 1,
      redHome: 0, redAway: 0,
      cornersHome: 7, cornersAway: 1,
    },
  },
  {
    id: "wc-sf-eng-arg",
    txlineFixtureId: 18241006,
    league: "Copa 2026 · Semifinal",
    stage: "Semifinal",
    status: "FINISHED",
    kickoff: "2026-07-15T19:00:00Z",
    home: { name: "Inglaterra", short: "ENG" },
    away: { name: "Argentina", short: "ARG" },
    lines: KNOCKOUT_LINES,
    finalStats: {
      goalsHome: 1, goalsAway: 2,
      yellowHome: 1, yellowAway: 3,
      redHome: 0, redAway: 0,
      cornersHome: 1, cornersAway: 6,
    },
  },
  {
    id: "wc-3rd-fra-eng",
    txlineFixtureId: 18257865,
    league: "Copa 2026 · 3º lugar",
    stage: "Decisão de 3º lugar",
    status: "UPCOMING",
    kickoff: "2026-07-18T21:00:00Z",
    home: { name: "França", short: "FRA" },
    away: { name: "Inglaterra", short: "ENG" },
    lines: KNOCKOUT_LINES,
    demoStats: {
      goalsHome: 2, goalsAway: 1,
      yellowHome: 2, yellowAway: 2,
      redHome: 0, redAway: 0,
      cornersHome: 6, cornersAway: 5,
    },
  },
  {
    id: "wc-final-esp-arg",
    txlineFixtureId: 18257739,
    league: "Copa 2026 · FINAL",
    stage: "Final",
    status: "UPCOMING",
    kickoff: "2026-07-19T19:00:00Z",
    home: { name: "Espanha", short: "ESP" },
    away: { name: "Argentina", short: "ARG" },
    lines: KNOCKOUT_LINES,
    demoStats: {
      goalsHome: 1, goalsAway: 2,
      yellowHome: 3, yellowAway: 2,
      redHome: 0, redAway: 0,
      cornersHome: 5, cornersAway: 4,
    },
  },
];
