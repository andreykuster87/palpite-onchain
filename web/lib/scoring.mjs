// @ts-check
/**
 * 4Line On-Chain — motor de pontuação (núcleo puro, sem dependências).
 *
 * Mecânica:
 *  1. TRAVA: se o palpite de resultado (1X2) estiver errado, a cartela é
 *     invalidada e pontua 0 — independentemente das variáveis secundárias.
 *  2. SOMA: com a trava validada, cada variável secundária acertada soma o
 *     seu peso; cada errada subtrai a penalidade. Pontuação = soma líquida
 *     (com piso opcional em zero).
 *
 * Variáveis secundárias (exceto placar exato) são MAIS/MENOS (over/under)
 * contra uma linha por partida (ex.: gols 2.5). A linha fica gravada na
 * própria cartela — como em bilhete real, você trava a linha ao apostar —
 * e por isso entra no commit (hash) junto com o palpite. Use meias-linhas
 * (x.5) para nunca haver empate técnico; com linha inteira, empatar com a
 * linha conta como erro para os dois lados.
 *
 * Este módulo é a fonte-da-verdade da regra do jogo. É reusado pelo front
 * (ranking) e pela Edge Function do Supabase. O contrato on-chain replica a
 * mesma lógica de forma minimalista para a liberação de prêmio — e o formato
 * over/under mapeia direto nos predicados de limiar do validateStatV2.
 */

/** @typedef {'HOME'|'DRAW'|'AWAY'} Outcome */
/** @typedef {'OVER'|'UNDER'} OUPick */

/**
 * Palpite mais/menos com a linha travada no bilhete.
 * @typedef {Object} OverUnder
 * @property {OUPick} pick
 * @property {number} line
 */

/**
 * Estatísticas finais da partida, como derivadas do feed TxLINE.
 * @typedef {Object} MatchStats
 * @property {number} goalsHome
 * @property {number} goalsAway
 * @property {number} [yellowHome]
 * @property {number} [yellowAway]
 * @property {number} [redHome]
 * @property {number} [redAway]
 * @property {number} [cornersHome]
 * @property {number} [cornersAway]
 */

/**
 * Palpite do usuário. `result` é obrigatório (a trava); o resto é opcional.
 * @typedef {Object} Cartela
 * @property {Outcome} result
 * @property {{home:number, away:number}} [exactScore]
 * @property {OverUnder} [totalGoals]
 * @property {OverUnder} [totalCards]
 * @property {OverUnder} [totalCorners]
 */

/**
 * @typedef {Object} ScoringConfig
 * @property {boolean} gateIncludesDraw  Se false, empate real invalida trava HOME/AWAY.
 * @property {boolean} floorAtZero        Se true, pontuação mínima é 0.
 * @property {Object} weights
 * @property {number} weights.exactScore
 * @property {number} weights.totalGoals
 * @property {number} weights.totalCards
 * @property {number} weights.totalCorners
 * @property {Object} penalties
 * @property {number} penalties.exactScore
 * @property {number} penalties.totalGoals
 * @property {number} penalties.totalCards
 * @property {number} penalties.totalCorners
 */

/** Configuração padrão (calibrar com playtest). @type {ScoringConfig} */
export const DEFAULT_CONFIG = {
  gateIncludesDraw: true,
  floorAtZero: true,
  weights: { exactScore: 25, totalGoals: 10, totalCards: 8, totalCorners: 8 },
  penalties: { exactScore: 10, totalGoals: 5, totalCards: 4, totalCorners: 4 },
};

/**
 * Deriva o resultado (1X2) a partir dos gols.
 * @param {MatchStats} m
 * @returns {Outcome}
 */
export function outcomeOf(m) {
  if (m.goalsHome > m.goalsAway) return 'HOME';
  if (m.goalsHome < m.goalsAway) return 'AWAY';
  return 'DRAW';
}

/** @param {MatchStats} m @returns {number} */
export function totalGoals(m) {
  return m.goalsHome + m.goalsAway;
}

/** @param {MatchStats} m @returns {number} soma de amarelos e vermelhos dos dois times */
export function totalCards(m) {
  return (m.yellowHome ?? 0) + (m.yellowAway ?? 0) + (m.redHome ?? 0) + (m.redAway ?? 0);
}

/** @param {MatchStats} m @returns {number} */
export function totalCorners(m) {
  return (m.cornersHome ?? 0) + (m.cornersAway ?? 0);
}

/**
 * Um palpite mais/menos acerta?  OVER: total > linha · UNDER: total < linha.
 * (Com meia-linha nunca há igualdade; com linha inteira, igualar = erro.)
 * @param {OverUnder} ou
 * @param {number} actual
 * @returns {boolean}
 */
export function hitOverUnder(ou, actual) {
  return ou.pick === 'OVER' ? actual > ou.line : actual < ou.line;
}

/**
 * Pontua uma cartela contra o resultado final da partida.
 * @param {Cartela} cartela
 * @param {MatchStats} match
 * @param {ScoringConfig} [config]
 * @returns {{ valid:boolean, points:number, breakdown:Array<{key:string, hit:boolean, delta:number}> }}
 */
export function scoreCartela(cartela, match, config = DEFAULT_CONFIG) {
  const actual = outcomeOf(match);

  // --- Fase 1: a trava do resultado ---
  let gatePass = cartela.result === actual;
  if (!config.gateIncludesDraw && actual === 'DRAW') {
    // Modo sem empate: um empate real nunca valida uma trava HOME/AWAY.
    gatePass = false;
  }
  if (!gatePass) {
    return { valid: false, points: 0, breakdown: [{ key: 'result', hit: false, delta: 0 }] };
  }

  // --- Fase 2: soma das variáveis secundárias ---
  /** @type {Array<{key:string, hit:boolean, delta:number}>} */
  const breakdown = [{ key: 'result', hit: true, delta: 0 }];
  let points = 0;

  /** @param {'exactScore'|'totalGoals'|'totalCards'|'totalCorners'} key @param {boolean} hit */
  const apply = (key, hit) => {
    const delta = hit ? config.weights[key] : -config.penalties[key];
    points += delta;
    breakdown.push({ key, hit, delta });
  };

  if (cartela.exactScore) {
    apply(
      'exactScore',
      cartela.exactScore.home === match.goalsHome &&
        cartela.exactScore.away === match.goalsAway
    );
  }
  if (cartela.totalGoals) {
    apply('totalGoals', hitOverUnder(cartela.totalGoals, totalGoals(match)));
  }
  if (cartela.totalCards) {
    apply('totalCards', hitOverUnder(cartela.totalCards, totalCards(match)));
  }
  if (cartela.totalCorners) {
    apply('totalCorners', hitOverUnder(cartela.totalCorners, totalCorners(match)));
  }

  if (config.floorAtZero && points < 0) points = 0;
  return { valid: true, points, breakdown };
}

/**
 * Ordena cartelas para o ranking de uma liga.
 * Desempate: maior pontuação → menor nº de erros → submissão mais antiga.
 * @template {{ points:number, valid:boolean, errors:number, submittedAt:number }} T
 * @param {T[]} entries
 * @returns {T[]} ordenado (melhor primeiro)
 */
export function rankEntries(entries) {
  return [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (a.errors !== b.errors) return a.errors - b.errors;
    return a.submittedAt - b.submittedAt;
  });
}
