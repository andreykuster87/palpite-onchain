// Testes do motor v2 (bilhetes-meme). Rodar com:
//   node --test web/lib/scoring.ticket.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreTicket,
  marketHappened,
  ticketErrors,
  LAYER_POINTS,
  DEFAULT_CONFIG,
} from './scoring.mjs';

// Partida de referência: mandante 2x1, 5 cartões, 9 escanteios, 1 vermelho.
const match = {
  goalsHome: 2, goalsAway: 1,
  yellowHome: 2, yellowAway: 2,
  redHome: 0, redAway: 1,
  cornersHome: 5, cornersAway: 4,
};

// Catálogo mínimo id→mercado (o mesmo formato que catalogMap produz).
const M = {
  gols:     { camada: 'facil',   resolve: { metric: 'totalGoals', cmp: 'over', line: 2.5 } }, // aconteceu
  cartoes:  { camada: 'facil',   resolve: { metric: 'totalCards', cmp: 'over', line: 5.5 } }, // NÃO aconteceu (5)
  ambas:    { camada: 'media',   resolve: { metric: 'bothScore', cmp: 'atLeast', line: 1 } }, // aconteceu
  vermelho: { camada: 'dificil', resolve: { metric: 'redsTotal', cmp: 'atLeast', line: 1 } }, // aconteceu
  panca:    { camada: 'zoeira',  resolve: { metric: 'totalCards', cmp: 'atLeast', line: 6 } }, // NÃO aconteceu (5)
};

test('marketHappened interpreta os comparadores', () => {
  assert.equal(marketHappened(M.gols.resolve, match), true);
  assert.equal(marketHappened(M.cartoes.resolve, match), false);
  assert.equal(marketHappened(M.ambas.resolve, match), true);
  assert.equal(marketHappened(M.vermelho.resolve, match), true);
  assert.equal(marketHappened({ metric: 'goalDiff', cmp: 'is', line: 1 }, match), true);
});

test('trava errada invalida o bilhete (pontua 0)', () => {
  const r = scoreTicket({ result: 'AWAY', picks: [{ marketId: 'gols', side: 'SIM' }] }, match, M);
  assert.equal(r.valid, false);
  assert.equal(r.points, 0);
});

test('trava certa + lados certos somam pelas camadas', () => {
  const ticket = {
    result: 'HOME',
    picks: [
      { marketId: 'gols', side: 'SIM' },      // aconteceu → +5 (fácil)
      { marketId: 'ambas', side: 'SIM' },     // aconteceu → +8 (média)
      { marketId: 'vermelho', side: 'SIM' },  // aconteceu → +15 (difícil)
    ],
  };
  const r = scoreTicket(ticket, match, M);
  assert.equal(r.valid, true);
  assert.equal(r.points, LAYER_POINTS.facil.hit + LAYER_POINTS.media.hit + LAYER_POINTS.dificil.hit);
  assert.equal(r.points, 28);
});

test('lado NÃO acerta quando o mercado não acontece', () => {
  // cartões NÃO passou de 5.5 → apostar NÃO acerta (+5 fácil).
  const r = scoreTicket({ result: 'HOME', picks: [{ marketId: 'cartoes', side: 'NAO' }] }, match, M);
  assert.equal(r.points, LAYER_POINTS.facil.hit);
});

test('lado errado subtrai a penalidade da camada (piso em 0)', () => {
  // cartões SIM mas não aconteceu → −3, com piso vira 0.
  const r = scoreTicket({ result: 'HOME', picks: [{ marketId: 'cartoes', side: 'SIM' }] }, match, M);
  assert.equal(r.points, 0);
  // sem piso, fica negativo.
  const cfg = { ...DEFAULT_CONFIG, floorAtZero: false };
  const r2 = scoreTicket({ result: 'HOME', picks: [{ marketId: 'cartoes', side: 'SIM' }] }, match, M, cfg);
  assert.equal(r2.points, -LAYER_POINTS.facil.miss);
});

test('zoeira é aposta bônus: acerto +3, erro 0 (nunca penaliza)', () => {
  // panca (6+ cartões) NÃO aconteceu (real 5) → apostar NÃO acerta o bônus.
  const acerto = scoreTicket({ result: 'HOME', picks: [{ marketId: 'panca', side: 'NAO' }] }, match, M);
  assert.equal(acerto.valid, true);
  assert.equal(acerto.points, LAYER_POINTS.zoeira.hit); // +3
  // Apostar SIM erra, mas bônus não tira ponto.
  const erro = scoreTicket({ result: 'HOME', picks: [{ marketId: 'panca', side: 'SIM' }] }, match, M);
  assert.equal(erro.points, 0);
  const item = erro.breakdown.find((b) => b.marketId === 'panca');
  assert.equal(item.delta, 0);
});

test('ticketErrors conta só mercados que pontuam e erraram', () => {
  const ticket = {
    result: 'HOME',
    picks: [
      { marketId: 'gols', side: 'NAO' },     // errou (aconteceu) → conta
      { marketId: 'cartoes', side: 'SIM' },  // errou (não aconteceu) → conta
      { marketId: 'ambas', side: 'SIM' },    // acertou → não conta
      { marketId: 'panca', side: 'SIM' },    // errou, mas bônus (delta 0) → não conta
    ],
  };
  const r = scoreTicket(ticket, match, M);
  assert.equal(ticketErrors(r), 2);
});

test('mercado inexistente no catálogo é ignorado', () => {
  const r = scoreTicket({ result: 'HOME', picks: [{ marketId: 'fantasma', side: 'SIM' }] }, match, M);
  assert.equal(r.valid, true);
  assert.equal(r.points, 0);
  assert.equal(r.breakdown.length, 1); // só a trava
});
