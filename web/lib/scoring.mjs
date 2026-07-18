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
 * @property {number} [topScorerGoals]    maior nº de gols de UM jogador (PlayerStats)
 * @property {number} [penGoalsTotal]     pênaltis convertidos no jogo (soma)
 * @property {number} [penAttemptsTotal]  pênaltis cobrados no jogo (soma)
 * @property {number} [maxPlayerYellows]  maior nº de amarelos de UM jogador
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

/* ===================================================================== *
 *  MOTOR v2 — bilhetes-meme (Fase A)                                    *
 *                                                                       *
 *  O usuário monta o próprio bilhete escolhendo mercados-meme (cada     *
 *  zoeira por cima, um stat real do TxLINE por baixo). Mantém a mesma   *
 *  TRAVA 1X2 e o mesmo formato de over/under — só que agora as          *
 *  variáveis vêm de um catálogo por camada de dificuldade, e cada       *
 *  mercado resolve contra uma métrica derivada de MatchStats.           *
 * ===================================================================== */

/**
 * Camadas de dificuldade → pontuação (acerto / erro). A assimetria
 * recompensa habilidade; "zoeira" é puro sabor e não pontua.
 * @typedef {'facil'|'media'|'dificil'|'zoeira'} Camada
 */
export const LAYER_POINTS = {
  facil: { hit: 5, miss: 3 },
  media: { hit: 8, miss: 3 },
  dificil: { hit: 15, miss: 5 },
  // Zoeira é "aposta bônus": soma de leve no acerto e NUNCA penaliza no erro.
  zoeira: { hit: 3, miss: 0 },
};

/**
 * Métricas derivadas de MatchStats que os mercados-meme resolvem.
 * Predicados booleanos retornam 0/1 para caírem no mesmo comparador.
 * @type {Record<string, (m: MatchStats) => number>}
 */
export const MARKET_METRICS = {
  totalGoals: (m) => m.goalsHome + m.goalsAway,
  totalCards: (m) =>
    (m.yellowHome ?? 0) + (m.yellowAway ?? 0) + (m.redHome ?? 0) + (m.redAway ?? 0),
  totalCorners: (m) => (m.cornersHome ?? 0) + (m.cornersAway ?? 0),
  goalsHome: (m) => m.goalsHome,
  goalsAway: (m) => m.goalsAway,
  redsTotal: (m) => (m.redHome ?? 0) + (m.redAway ?? 0),
  yellowsTotal: (m) => (m.yellowHome ?? 0) + (m.yellowAway ?? 0),
  bothScore: (m) => (m.goalsHome > 0 && m.goalsAway > 0 ? 1 : 0),
  goalDiff: (m) => Math.abs(m.goalsHome - m.goalsAway),
  // Craques (via PlayerStats agregado — sem nome, só o dado real por jogador).
  topScorerGoals: (m) => m.topScorerGoals ?? 0,
  penGoals: (m) => m.penGoalsTotal ?? 0,
  penMissed: (m) => (m.penAttemptsTotal ?? 0) - (m.penGoalsTotal ?? 0),
  maxPlayerYellows: (m) => m.maxPlayerYellows ?? 0,
};

/**
 * Regra de resolução de um mercado-meme (dado puro, no catálogo).
 * @typedef {Object} MarketResolve
 * @property {string} metric  chave em MARKET_METRICS
 * @property {'over'|'under'|'atLeast'|'atMost'|'is'} cmp
 * @property {number} line
 */

/**
 * O mercado "aconteceu"?  Interpreta o predicado sobre a métrica.
 * @param {MarketResolve} resolve
 * @param {MatchStats} stats
 * @returns {boolean}
 */
export function marketHappened(resolve, stats) {
  const fn = MARKET_METRICS[resolve.metric];
  if (!fn) throw new Error(`métrica desconhecida: ${resolve.metric}`);
  const v = fn(stats);
  switch (resolve.cmp) {
    case 'over':
      return v > resolve.line;
    case 'under':
      return v < resolve.line;
    case 'atLeast':
      return v >= resolve.line;
    case 'atMost':
      return v <= resolve.line;
    case 'is':
      return v === resolve.line;
    default:
      throw new Error(`comparador desconhecido: ${resolve.cmp}`);
  }
}

/**
 * Escolha do usuário sobre um mercado do catálogo. `side === 'SIM'` = o
 * usuário aposta que o mercado acontece; `'NAO'` = aposta que não.
 * @typedef {Object} TicketPick
 * @property {string} marketId
 * @property {'SIM'|'NAO'} side
 */

/**
 * Bilhete-meme: a trava 1X2 + os mercados escolhidos.
 * @typedef {Object} Ticket
 * @property {Outcome} result
 * @property {TicketPick[]} picks
 */

/**
 * @typedef {Object} TicketBreakdownItem
 * @property {string} marketId
 * @property {boolean} hit
 * @property {boolean} [happened]
 * @property {'SIM'|'NAO'} [side]
 * @property {boolean} scored     false para mercados de zoeira (não pontua)
 * @property {number} delta
 */

/**
 * Pontua um bilhete-meme contra o resultado final.
 *
 * Mesma TRAVA 1X2 do scoreCartela: errou o resultado, zera. Com a trava
 * validada, cada mercado escolhido acerta/erra pela sua camada. Mercados
 * de zoeira entram no bilhete mas não movem o placar.
 *
 * @param {Ticket} ticket
 * @param {MatchStats} stats
 * @param {Record<string, {camada:Camada, resolve:MarketResolve}>} markets  catálogo id→mercado da fixture
 * @param {ScoringConfig} [config]
 * @returns {{ valid:boolean, points:number, breakdown:TicketBreakdownItem[] }}
 */
export function scoreTicket(ticket, stats, markets, config = DEFAULT_CONFIG) {
  const actual = outcomeOf(stats);

  let gatePass = ticket.result === actual;
  if (!config.gateIncludesDraw && actual === 'DRAW') gatePass = false;
  if (!gatePass) {
    return {
      valid: false,
      points: 0,
      breakdown: [{ marketId: 'result', hit: false, scored: true, delta: 0 }],
    };
  }

  /** @type {TicketBreakdownItem[]} */
  const breakdown = [{ marketId: 'result', hit: true, scored: true, delta: 0 }];
  let points = 0;

  for (const pick of ticket.picks ?? []) {
    const market = markets[pick.marketId];
    if (!market) continue; // catálogo mudou — ignora silenciosamente
    const happened = marketHappened(market.resolve, stats);
    const betYes = pick.side === 'SIM';
    const hit = happened === betYes;
    const layer = LAYER_POINTS[market.camada] ?? LAYER_POINTS.facil;
    // Um mercado "pontua" se pode mover o placar (acerto ou penalidade > 0).
    const scored = layer.hit !== 0 || layer.miss !== 0;
    const delta = hit ? layer.hit : layer.miss === 0 ? 0 : -layer.miss;
    points += delta;
    breakdown.push({ marketId: pick.marketId, hit, happened, side: pick.side, scored, delta });
  }

  if (config.floorAtZero && points < 0) points = 0;
  return { valid: true, points, breakdown };
}

/**
 * Nº de erros que custaram pontos — usado no desempate do ranking. Erros de
 * zoeira (bônus, penalidade 0) não contam, pois não tiram pontos.
 * @param {{ breakdown: TicketBreakdownItem[] }} scored
 * @returns {number}
 */
export function ticketErrors(scored) {
  return scored.breakdown.filter((b) => !b.hit && b.delta < 0).length;
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
