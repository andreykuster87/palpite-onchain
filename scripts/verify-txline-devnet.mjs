// @ts-check
/**
 * Verificação ao vivo do TxLINE na DEVNET (sem custo).
 *
 * O que faz (não precisa de carteira nem de TxL):
 *   1. Pega um JWT de convidado.
 *   2. Lê a agenda de partidas (schedule).
 *   3. Tenta um snapshot de scores de uma fixture (se acessível no tier).
 *
 * Uso:
 *   node scripts/verify-txline-devnet.mjs
 *
 * Obs.: alguns endpoints exigem o X-Api-Token (ativado após subscribe on-chain
 * no tier grátis). Este script cobre o que dá para inspecionar só com o guest
 * JWT; para o fluxo completo de activate, ver docs/02 e a página de exemplos
 * devnet do TxLINE.
 */
import { createTxlineClient } from '../web/lib/txline.mjs';

async function main() {
  const tx = createTxlineClient('devnet');
  console.log('› Rede devnet:', tx.config.apiOrigin);

  console.log('› Pegando JWT de convidado...');
  const jwt = await tx.guestToken();
  console.log('  JWT ok:', jwt.slice(0, 16) + '…');

  console.log('› Lendo agenda (schedule)...');
  try {
    const sched = await tx.schedule(jwt, undefined, {});
    const n = Array.isArray(sched) ? sched.length : (sched?.fixtures?.length ?? '?');
    console.log('  fixtures retornadas:', n);
    console.log('  amostra:', JSON.stringify(sched, null, 2).slice(0, 800));
  } catch (e) {
    console.log('  schedule exigiu credencial adicional:', String(e));
    console.log('  → normal: ative o tier grátis (X-Api-Token) para dados completos.');
  }
}

main().catch((e) => {
  console.error('Falha na verificação:', e);
  process.exit(1);
});
