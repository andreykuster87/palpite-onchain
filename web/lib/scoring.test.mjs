// Testes do motor de pontuação. Rodar com: node --test web/lib/scoring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreCartela,
  outcomeOf,
  totalGoals,
  totalCards,
  totalCorners,
  hitOverUnder,
  rankEntries,
  DEFAULT_CONFIG,
} from './scoring.mjs';

// Partida de referência: mandante vence 2x1, 5 cartões, 9 escanteios.
const match = {
  goalsHome: 2, goalsAway: 1,
  yellowHome: 2, yellowAway: 2,
  redHome: 0, redAway: 1,
  cornersHome: 5, cornersAway: 4,
};

test('derivados da partida', () => {
  assert.equal(outcomeOf(match), 'HOME');
  assert.equal(totalGoals(match), 3);
  assert.equal(totalCards(match), 5);
  assert.equal(totalCorners(match), 9);
});

test('over/under contra a linha', () => {
  assert.equal(hitOverUnder({ pick: 'OVER', line: 2.5 }, 3), true);
  assert.equal(hitOverUnder({ pick: 'UNDER', line: 2.5 }, 3), false);
  assert.equal(hitOverUnder({ pick: 'UNDER', line: 3.5 }, 3), true);
  // Linha inteira: igualar a linha é erro para os dois lados (por isso x.5).
  assert.equal(hitOverUnder({ pick: 'OVER', line: 3 }, 3), false);
  assert.equal(hitOverUnder({ pick: 'UNDER', line: 3 }, 3), false);
});

test('trava errada invalida a cartela (pontua 0)', () => {
  const r = scoreCartela({ result: 'AWAY', exactScore: { home: 2, away: 1 } }, match);
  assert.equal(r.valid, false);
  assert.equal(r.points, 0);
});

test('trava certa + todos os acertos soma tudo', () => {
  const cartela = {
    result: 'HOME',
    exactScore: { home: 2, away: 1 },
    totalGoals: { pick: 'OVER', line: 2.5 },   // real 3 → acerto
    totalCards: { pick: 'UNDER', line: 5.5 },  // real 5 → acerto
    totalCorners: { pick: 'OVER', line: 8.5 }, // real 9 → acerto
  };
  const r = scoreCartela(cartela, match);
  assert.equal(r.valid, true);
  // 25 + 10 + 8 + 8 = 51
  assert.equal(r.points, 51);
});

test('trava certa mas variáveis erradas subtrai penalidades', () => {
  const cartela = {
    result: 'HOME',
    exactScore: { home: 3, away: 0 },          // erro
    totalGoals: { pick: 'UNDER', line: 2.5 },  // real 3 → erro
  };
  const r = scoreCartela(cartela, match);
  assert.equal(r.valid, true);
  // -10 -5 = -15 → piso em 0
  assert.equal(r.points, 0);
});

test('sem piso, pontuação pode ficar negativa', () => {
  const cfg = { ...DEFAULT_CONFIG, floorAtZero: false };
  const cartela = {
    result: 'HOME',
    exactScore: { home: 0, away: 0 },
    totalGoals: { pick: 'UNDER', line: 2.5 },
  };
  const r = scoreCartela(cartela, match, cfg);
  assert.equal(r.points, -15);
});

test('modo sem empate: empate real invalida trava', () => {
  const draw = { goalsHome: 1, goalsAway: 1 };
  const cfg = { ...DEFAULT_CONFIG, gateIncludesDraw: false };
  const r = scoreCartela({ result: 'HOME' }, draw, cfg);
  assert.equal(r.valid, false);
});

test('ranking ordena por pontos, erros e horário', () => {
  const ranked = rankEntries([
    { points: 30, valid: true, errors: 1, submittedAt: 100 },
    { points: 51, valid: true, errors: 0, submittedAt: 200 },
    { points: 51, valid: true, errors: 0, submittedAt: 150 }, // empate → mais antigo ganha
  ]);
  assert.equal(ranked[0].submittedAt, 150);
  assert.equal(ranked[1].submittedAt, 200);
  assert.equal(ranked[2].points, 30);
});
