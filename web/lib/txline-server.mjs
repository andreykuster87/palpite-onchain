// @ts-check
/**
 * Lado servidor da integração TxLINE (usado pelas API routes do Next).
 * O X-Api-Token vive só aqui (env TXLINE_API_TOKEN) — nunca vai ao browser.
 * O guest JWT é cacheado em módulo e renovado em 401 (regra do quickstart).
 */
import { createTxlineClient } from './txline.mjs';

const NETWORK = /** @type {'devnet'|'mainnet'} */ (
  process.env.TXLINE_NETWORK === 'mainnet' ? 'mainnet' : 'devnet'
);
export const txline = createTxlineClient(NETWORK);

export const API_TOKEN = process.env.TXLINE_API_TOKEN || '';

/** @type {{ jwt: string, at: number }} */
let jwtCache = { jwt: '', at: 0 };

async function jwt() {
  // Renova preventivamente a cada 10 min.
  if (!jwtCache.jwt || Date.now() - jwtCache.at > 10 * 60 * 1000) {
    jwtCache = { jwt: await txline.guestToken(), at: Date.now() };
  }
  return jwtCache.jwt;
}

/**
 * Chama um método do cliente com retry de JWT em 401.
 * @template T
 * @param {(jwt: string, apiToken: string|undefined) => Promise<T>} fn
 */
export async function withAuth(fn) {
  try {
    return await fn(await jwt(), API_TOKEN || undefined);
  } catch (e) {
    if (String(e).includes('401')) {
      jwtCache = { jwt: '', at: 0 };
      return fn(await jwt(), API_TOKEN || undefined);
    }
    throw e;
  }
}
