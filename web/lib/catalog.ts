// Catálogo de mercados-meme por fixture (Fase A — mercados de TIME + Zoeira).
//
// Cada item é uma "zoeira por cima, um stat real do TxLINE por baixo": um
// nome-meme + um predicado puro (`resolve`) que o motor v2 (scoreTicket em
// scoring.mjs) avalia contra as MatchStats do oráculo. O usuário monta o
// bilhete escolhendo mercados e, para cada um, o lado SIM/NÃO.
//
// Dois setores nesta fase:
//  • ESTATÍSTICAS — pontua; só métricas de TIME confirmadas no feed
//    (gols, cartões, escanteios, vermelhos). Chutes a gol NÃO existem no
//    oráculo (sondado ao vivo: só statKeys 1–8), por isso ficam de fora.
//  • ZOEIRA — não pontua; sabor curado com craques por seleção e piadas de
//    histórico. Não depende do oráculo nem de scraping.
//
// Craques por jogador que PONTUAM entram na Fase B (estender o adapter para
// PlayerStats + Lineups).

import type { Camada, MarketResolve } from "./scoring";
import type { CopaFixture } from "./copa";

export type Setor = "estatisticas" | "zoeira";

export interface Market {
  id: string;
  setor: Setor;
  emoji: string;
  /** Nome-meme curto (título do item no builder). */
  nome: string;
  /** Descrição/pergunta do que precisa acontecer. */
  pergunta: string;
  /** Rótulo do lado "aposto que acontece". */
  simLabel: string;
  /** Rótulo do lado "aposto que não". */
  naoLabel: string;
  camada: Camada;
  resolve: MarketResolve;
}

/** Metadados de cada camada (rótulo + cor de acento para a UI). */
export const CAMADA_META: Record<
  Camada,
  { label: string; short: string; accent: string }
> = {
  facil: { label: "Fácil", short: "F", accent: "text-grass-400" },
  media: { label: "Média", short: "M", accent: "text-gold-400" },
  dificil: { label: "Difícil", short: "D", accent: "text-danger" },
  // Zoeira pontua como "bônus": soma no acerto, não pune no erro.
  zoeira: { label: "Bônus", short: "B", accent: "text-gold-300" },
};

export const SETOR_META: Record<Setor, { label: string; emoji: string }> = {
  estatisticas: { label: "Estatísticas", emoji: "📊" },
  zoeira: { label: "Zoeira", emoji: "🤡" },
};

/** Ordem de exibição dos setores no builder. */
export const SETOR_ORDER: Setor[] = ["estatisticas", "zoeira"];

/**
 * Monta o catálogo de mercados-meme de uma fixture, tecendo os nomes dos
 * times e as linhas de mais/menos daquele jogo.
 */
export function catalogFor(fixture: CopaFixture): Market[] {
  const H = fixture.home.short;
  const A = fixture.away.short;
  const Hn = fixture.home.name;
  const An = fixture.away.name;
  const L = fixture.lines;

  return [
    // ================= 📊 ESTATÍSTICAS (pontua) =================

    // ---------- Fácil (over/under ~50/50 contra as linhas) ----------
    {
      id: "gols-total",
      setor: "estatisticas",
      emoji: "☔",
      nome: "Chuva de gols",
      pergunta: `Total de gols acima de ${L.totalGoals}?`,
      simLabel: `MAIS de ${L.totalGoals}`,
      naoLabel: `MENOS de ${L.totalGoals}`,
      camada: "facil",
      resolve: { metric: "totalGoals", cmp: "over", line: L.totalGoals },
    },
    {
      id: "cartoes-total",
      setor: "estatisticas",
      emoji: "🎴",
      nome: "Chá de cartão",
      pergunta: `Total de cartões acima de ${L.totalCards}?`,
      simLabel: `MAIS de ${L.totalCards}`,
      naoLabel: `MENOS de ${L.totalCards}`,
      camada: "facil",
      resolve: { metric: "totalCards", cmp: "over", line: L.totalCards },
    },
    {
      id: "escanteios-total",
      setor: "estatisticas",
      emoji: "🚩",
      nome: "Festival de escanteio",
      pergunta: `Total de escanteios acima de ${L.totalCorners}?`,
      simLabel: `MAIS de ${L.totalCorners}`,
      naoLabel: `MENOS de ${L.totalCorners}`,
      camada: "facil",
      resolve: { metric: "totalCorners", cmp: "over", line: L.totalCorners },
    },

    // ---------- Média ----------
    {
      id: "ambas-marcam",
      setor: "estatisticas",
      emoji: "🤝",
      nome: "As duas balançam a rede",
      pergunta: `${Hn} e ${An} marcam?`,
      simLabel: "VAI ROLAR",
      naoLabel: "NÃO ROLA",
      camada: "media",
      resolve: { metric: "bothScore", cmp: "atLeast", line: 1 },
    },
    {
      id: "mandante-2mais",
      setor: "estatisticas",
      emoji: "🥅",
      nome: `${H} atropela`,
      pergunta: `${Hn} faz 2 ou mais?`,
      simLabel: "FAZ 2+",
      naoLabel: "NÃO FAZ",
      camada: "media",
      resolve: { metric: "goalsHome", cmp: "atLeast", line: 2 },
    },
    {
      id: "visitante-2mais",
      setor: "estatisticas",
      emoji: "🥅",
      nome: `${A} atropela`,
      pergunta: `${An} faz 2 ou mais?`,
      simLabel: "FAZ 2+",
      naoLabel: "NÃO FAZ",
      camada: "media",
      resolve: { metric: "goalsAway", cmp: "atLeast", line: 2 },
    },

    // ---------- Difícil (raro, paga mais) ----------
    {
      id: "goleada",
      setor: "estatisticas",
      emoji: "💣",
      nome: "Goleada histórica",
      pergunta: "Alguém vence por 3+ de diferença?",
      simLabel: "GOLEIA",
      naoLabel: "JOGO EQUILIBRADO",
      camada: "dificil",
      resolve: { metric: "goalDiff", cmp: "atLeast", line: 3 },
    },
    {
      id: "chuveiro",
      setor: "estatisticas",
      emoji: "🟥",
      nome: "Alguém vai pro chuveiro",
      pergunta: "Sai cartão vermelho?",
      simLabel: "VAI TER VERMELHO",
      naoLabel: "NINGUÉM EXPULSO",
      camada: "dificil",
      resolve: { metric: "redsTotal", cmp: "atLeast", line: 1 },
    },

    // ================= 🤡 ZOEIRA · aposta bônus (+3, não pune) =================
    // Resolvem por stat de TIME, mas com clima de zoeira. Erra e não perde nada.
    {
      id: "z-pancadaria",
      setor: "zoeira",
      emoji: "🥊",
      nome: "Pancadaria",
      pergunta: "Jogo pegado com 6+ cartões?",
      simLabel: "VAI FERVER",
      naoLabel: "JOGO LIMPO",
      camada: "zoeira",
      resolve: { metric: "totalCards", cmp: "atLeast", line: 6 },
    },
    {
      id: "z-baile",
      setor: "zoeira",
      emoji: "🎪",
      nome: "Baile de gols",
      pergunta: "Golaçada: 4 ou mais no jogo?",
      simLabel: "É BAILE",
      naoLabel: "JOGO DURO",
      camada: "zoeira",
      resolve: { metric: "totalGoals", cmp: "atLeast", line: 4 },
    },
    {
      id: "z-retranca",
      setor: "zoeira",
      emoji: "🤏",
      nome: "Amarrado no fundo",
      pergunta: "Poucos escanteios: 7 ou menos?",
      simLabel: "TRANCADO",
      naoLabel: "PRESSÃO TOTAL",
      camada: "zoeira",
      resolve: { metric: "totalCorners", cmp: "atMost", line: 7 },
    },
    {
      id: "z-cardiaco",
      setor: "zoeira",
      emoji: "🎢",
      nome: "Decisão de cardíaco",
      pergunta: "Jogo apertado, decidido por 1 gol ou empate?",
      simLabel: "NO SUFOCO",
      naoLabel: "FOLGADO",
      camada: "zoeira",
      resolve: { metric: "goalDiff", cmp: "atMost", line: 1 },
    },
    {
      id: "z-amarelada",
      setor: "zoeira",
      emoji: "🟨",
      nome: "Chuva de amarelo",
      pergunta: "5 ou mais cartões amarelos?",
      simLabel: "CHOVE AMARELO",
      naoLabel: "DE BOA",
      camada: "zoeira",
      resolve: { metric: "yellowsTotal", cmp: "atLeast", line: 5 },
    },
  ];
}

/** Índice id→mercado para o motor (scoreTicket recebe este mapa). */
export function catalogMap(markets: Market[]): Record<string, Market> {
  return Object.fromEntries(markets.map((m) => [m.id, m]));
}
