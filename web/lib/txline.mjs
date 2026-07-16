// @ts-check
/**
 * Cliente TxLINE — helpers de autenticação e leitura de dados de scores.
 * Organiza o fluxo do Quickstart em funções reusáveis. Sem dependência de
 * wallet aqui; a parte on-chain (subscribe/activate) fica no script devnet.
 */

export const NETWORKS = {
  mainnet: {
    apiOrigin: 'https://txline.txodds.com',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    programId: '9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA',
    txlTokenMint: 'Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL',
  },
  devnet: {
    apiOrigin: 'https://txline-dev.txodds.com',
    rpcUrl: 'https://api.devnet.solana.com',
    programId: '6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J',
    txlTokenMint: '4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG',
  },
};

/**
 * Cria um cliente para uma rede.
 * @param {'mainnet'|'devnet'} network
 */
export function createTxlineClient(network = 'devnet') {
  const cfg = NETWORKS[network];
  if (!cfg) throw new Error(`Rede inválida: ${network}`);
  const apiBase = `${cfg.apiOrigin}/api`;

  /** JWT de convidado. Renovar em caso de 401. */
  async function guestToken() {
    const res = await fetch(`${cfg.apiOrigin}/auth/guest/start`, { method: 'POST' });
    if (!res.ok) throw new Error(`guest/start ${res.status}`);
    const data = await res.json();
    return data.token;
  }

  /** Headers para requisições de dados (JWT sempre; X-Api-Token quando ativado). */
  function headers(jwt, apiToken) {
    /** @type {Record<string,string>} */
    const h = { Authorization: `Bearer ${jwt}` };
    if (apiToken) h['X-Api-Token'] = apiToken;
    return h;
  }

  /**
   * Snapshot de scores de uma fixture.
   * @param {string} jwt @param {string|undefined} apiToken @param {string|number} fixtureId
   */
  async function scoresSnapshot(jwt, apiToken, fixtureId) {
    const res = await fetch(`${apiBase}/scores/snapshot?fixtureId=${fixtureId}`, {
      headers: headers(jwt, apiToken),
    });
    if (!res.ok) throw new Error(`scores/snapshot ${res.status}`);
    return res.json();
  }

  /**
   * Provas de validação de stats (para liquidar on-chain com validateStatV2).
   * @param {string} jwt @param {string|undefined} apiToken
   * @param {{fixtureId:string|number, seq:number, statKeys:number[]}} q
   */
  async function statValidation(jwt, apiToken, { fixtureId, seq, statKeys }) {
    const keys = statKeys.join(',');
    const url = `${apiBase}/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKeys=${keys}`;
    const res = await fetch(url, { headers: headers(jwt, apiToken) });
    if (!res.ok) throw new Error(`scores/stat-validation ${res.status}`);
    return res.json();
  }

  /** Agenda de partidas (fixtures). */
  async function schedule(jwt, apiToken, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${apiBase}/scores/schedule${qs ? `?${qs}` : ''}`, {
      headers: headers(jwt, apiToken),
    });
    if (!res.ok) throw new Error(`scores/schedule ${res.status}`);
    return res.json();
  }

  return { config: cfg, apiBase, guestToken, scoresSnapshot, statValidation, schedule };
}

/**
 * TODO: confirmar o mapa numérico de statKeys na devnet.
 * Placeholder com base no exemplo do doc (statKeys=1,2,3001,3002).
 */
export const STAT_KEYS = {
  // ⚠️ valores a confirmar contra /api/scores/stat-validation na devnet
  goalsHome: 1,
  goalsAway: 2,
  yellowCards: 3001,
  corners: 3002,
};
