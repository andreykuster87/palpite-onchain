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

  // Recursão em campos prováveis
  for (const field of ['stats', 'scoreboard', 'updates', 'data', 'payload', 'summary']) {
    if (field in node) collectStats(node[field], out);
  }
}

/**
 * Converte um payload de snapshot em MatchStats (chaves de jogo inteiro).
 * @param {any} payload resposta de /scores/snapshot/{fixtureId}
 * @returns {import('./scoring').MatchStats | null}
 */
export function snapshotToMatchStats(payload) {
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
  return stats;
}
