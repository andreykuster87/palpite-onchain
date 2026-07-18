// @ts-check
/**
 * Adaptador: payload de scores do TxLINE → MatchStats do jogo.
 *
 * O feed usa statKeys numéricos (ver STAT_KEYS em txline.mjs): 1/2 = gols,
 * 3/4 = amarelos, 5/6 = vermelhos, 7/8 = escanteios (P1/P2), com prefixo de
 * período (0 = jogo inteiro). Este adaptador é deliberadamente defensivo:
 * aceita as formas plausíveis do snapshot (array de updates, objeto com
 * `stats`, mapa chave→valor) e retorna null se não reconhecer — o chamador
 * cai no fallback de demo. Refinar contra o payload real na primeira chamada
 * autenticada.
 */

/** Chave base (jogo inteiro) → campo de MatchStats. */
const KEY_TO_FIELD = {
  1: 'goalsHome',
  2: 'goalsAway',
  3: 'yellowHome',
  4: 'yellowAway',
  5: 'redHome',
  6: 'redAway',
  7: 'cornersHome',
  8: 'cornersAway',
};

/**
 * Extrai pares {statKey, value} de formatos variados.
 * @param {any} node
 * @param {Map<number, number>} out
 */
function collectStats(node, out) {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) collectStats(item, out);
    return;
  }
  if (typeof node !== 'object') return;

  // Forma { statKey|key|stat: n, value|val|count: n }
  const key = node.statKey ?? node.key ?? node.stat;
  const value = node.value ?? node.val ?? node.count;
  if (typeof key === 'number' && typeof value === 'number') {
    out.set(key, value); // updates chegam em ordem; o último vence
    return;
  }

  // Forma mapa { "1": 2, "2": 0, ... } — chaves numéricas diretas
  const entries = Object.entries(node);
  const numericPairs = entries.filter(
    ([k, v]) => /^\d+$/.test(k) && typeof v === 'number'
  );
  if (numericPairs.length >= 2 && numericPairs.length === entries.length) {
    for (const [k, v] of numericPairs) out.set(Number(k), /** @type {number} */ (v));
    return;
  }

  // Recursão em campos prováveis (payload real usa 'Stats', PascalCase)
  for (const field of ['Stats', 'stats', 'scoreboard', 'updates', 'data', 'payload', 'summary']) {
    if (field in node) collectStats(node[field], out);
  }
}

/**
 * Converte um payload de snapshot em MatchStats (chaves de jogo inteiro).
 * @param {any} payload resposta de /scores/snapshot/{fixtureId}
 * @returns {import('./scoring').MatchStats | null}
 */
export function snapshotToMatchStats(payload) {
  // Guarda o payload cru p/ agregar PlayerStats de TODOS os updates (o dado por
  // jogador pode não estar no mesmo update de maior Seq que carrega `Stats`).
  const rawPayload = payload;
  // O snapshot real é um array de updates com `Seq` crescente; o estado final
  // da partida é o update de maior Seq que carrega `Stats`.
  if (Array.isArray(payload)) {
    const withStats = payload.filter((u) => u && typeof u === 'object' && u.Stats);
    if (withStats.length) {
      withStats.sort((a, b) => (a.Seq ?? 0) - (b.Seq ?? 0));
      payload = withStats[withStats.length - 1];
    }
  }

  /** @type {Map<number, number>} */
  const found = new Map();
  collectStats(payload, found);

  // Sem os gols (chaves 1 e 2) não há partida pontuável.
  if (!found.has(1) || !found.has(2)) return null;

  /** @type {any} */
  const stats = {};
  for (const [key, field] of Object.entries(KEY_TO_FIELD)) {
    const v = found.get(Number(key));
    if (v != null) stats[field] = v;
  }

  // Craques: agrega o PlayerStats (por playerId, sem nome no feed) em escalares.
  const agg = aggregatePlayerStats(rawPayload);
  if (agg) Object.assign(stats, agg);

  return stats;
}

/**
 * Agrega o PlayerStats do feed em escalares para os mercados de craque.
 * Cada update traz PlayerStats CUMULATIVO (forma { Participant1: { "<playerId>":
 * {goals,yellowCards,redCards,penaltyGoals,penaltyAttempts} }, Participant2: {} });
 * como acumula, o máximo de cada escalar entre updates = o valor final.
 * @param {any} rawPayload array de updates (ou objeto único)
 * @returns {{topScorerGoals:number, penGoalsTotal:number, penAttemptsTotal:number, maxPlayerYellows:number} | null}
 */
function aggregatePlayerStats(rawPayload) {
  const updates = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
  let topScorerGoals = 0;
  let penGoalsTotal = 0;
  let penAttemptsTotal = 0;
  let maxPlayerYellows = 0;
  let sawAny = false;
  for (const u of updates) {
    const ps = u && u.PlayerStats;
    if (!ps || typeof ps !== 'object') continue;
    let penGoals = 0;
    let penAttempts = 0;
    for (const side of ['Participant1', 'Participant2']) {
      const players = ps[side];
      if (!players || typeof players !== 'object') continue;
      for (const p of Object.values(players)) {
        if (!p || typeof p !== 'object') continue;
        sawAny = true;
        const g = Number(/** @type {any} */ (p).goals) || 0;
        const y = Number(/** @type {any} */ (p).yellowCards) || 0;
        if (g > topScorerGoals) topScorerGoals = g;
        if (y > maxPlayerYellows) maxPlayerYellows = y;
        penGoals += Number(/** @type {any} */ (p).penaltyGoals) || 0;
        penAttempts += Number(/** @type {any} */ (p).penaltyAttempts) || 0;
      }
    }
    if (penGoals > penGoalsTotal) penGoalsTotal = penGoals;
    if (penAttempts > penAttemptsTotal) penAttemptsTotal = penAttempts;
  }
  if (!sawAny) return null;
  return { topScorerGoals, penGoalsTotal, penAttemptsTotal, maxPlayerYellows };
}
