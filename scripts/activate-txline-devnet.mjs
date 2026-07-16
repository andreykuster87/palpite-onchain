// @ts-check
/**
 * Ativação do tier grátis TxLINE na DEVNET (Copa do Mundo / Amistosos).
 *
 * Fluxo (docs: /documentation/worldcup + exemplos txodds/tx-on-chain):
 *   1. Carrega (ou cria) uma keypair devnet em .keys/devnet-wallet.json.
 *   2. Garante SOL via airdrop (devnet é grátis).
 *   3. Garante a ATA (Token-2022) do mint TXL do usuário.
 *   4. Chama `subscribe(serviceLevel=1, weeks=4)` on-chain — tier grátis,
 *      sem custo de TXL, só fee de transação.
 *   5. Assina `${txSig}::${jwt}` com a wallet e ativa em POST /api/token/activate.
 *   6. Salva o X-Api-Token em .keys/txline-devnet-token.json (gitignored).
 *
 * Uso:  node scripts/activate-txline-devnet.mjs
 * Idempotente: se já houver token salvo, apenas o valida com uma chamada.
 */
import * as anchor from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import nacl from 'tweetnacl';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTxlineClient } from '../web/lib/txline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const KEYS_DIR = path.join(ROOT, '.keys');
const WALLET_PATH = path.join(KEYS_DIR, 'devnet-wallet.json');
const TOKEN_PATH = path.join(KEYS_DIR, 'txline-devnet-token.json');
const IDL_PATH = path.join(__dirname, 'idl', 'txoracle.devnet.json');

const SERVICE_LEVEL = 1; // tier grátis (Copa/Amistosos) na devnet
const WEEKS = 4; // duração mínima (múltiplos de 4)
const LEAGUES = []; // bundle padrão

const tx = createTxlineClient('devnet');

function loadOrCreateWallet() {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  if (fs.existsSync(WALLET_PATH)) {
    const secret = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8')));
    const kp = Keypair.fromSecretKey(secret);
    console.log('› Wallet existente:', kp.publicKey.toBase58());
    return kp;
  }
  const kp = Keypair.generate();
  fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(kp.secretKey)));
  console.log('› Wallet criada:', kp.publicKey.toBase58());
  return kp;
}

async function ensureSol(connection, pubkey) {
  const bal = await connection.getBalance(pubkey);
  console.log(`› Saldo: ${(bal / 1e9).toFixed(4)} SOL`);
  if (bal >= 0.05 * 1e9) return;
  console.log('› Pedindo airdrop de 1 SOL na devnet...');
  try {
    const sig = await connection.requestAirdrop(pubkey, 1e9);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('  airdrop ok');
  } catch (e) {
    throw new Error(
      `Airdrop falhou (${e.message}). Use https://faucet.solana.com para financiar ${pubkey.toBase58()} e rode de novo.`
    );
  }
}

async function smokeTest(jwt, apiToken) {
  const sched = await tx.schedule(jwt, apiToken, {});
  const n = Array.isArray(sched) ? sched.length : sched?.fixtures?.length ?? '?';
  console.log(`✓ schedule respondeu — fixtures: ${n}`);
  return sched;
}

async function main() {
  console.log('› Rede devnet:', tx.config.apiOrigin);
  const jwt = await tx.guestToken();
  console.log('› JWT de convidado ok');

  // Se já temos token ativado, só valida.
  if (fs.existsSync(TOKEN_PATH)) {
    const saved = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    console.log('› Token salvo encontrado; validando...');
    try {
      await smokeTest(jwt, saved.apiToken);
      console.log('✓ Token válido. Nada a fazer.');
      return;
    } catch (e) {
      console.log(`  token salvo falhou (${e.message}); reativando...`);
    }
  }

  const wallet = loadOrCreateWallet();
  const connection = new Connection(tx.config.rpcUrl, 'confirmed');
  await ensureSol(connection, wallet.publicKey);

  // Anchor: provider + programa (IDL novo já carrega o address).
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: 'confirmed' }
  );
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));
  const program = new anchor.Program(idl, provider);
  console.log('› Programa:', program.programId.toBase58());

  const tokenMint = new PublicKey(tx.config.txlTokenMint);
  const ata = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID);

  // 1) ATA Token-2022 (necessária mesmo no tier grátis).
  if (!(await connection.getAccountInfo(ata))) {
    console.log('› Criando token account (Token-2022)...');
    const t = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey, ata, wallet.publicKey, tokenMint,
        TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    await sendAndConfirmTransaction(connection, t, [wallet], { commitment: 'confirmed' });
    console.log('  ata ok:', ata.toBase58());
  }

  // 2) subscribe on-chain (tier grátis: nível 1, 4 semanas).
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')], program.programId
  );
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_treasury_v2')], program.programId
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(tokenMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);

  console.log(`› subscribe(level=${SERVICE_LEVEL}, weeks=${WEEKS}) on-chain...`);
  const subTx = await program.methods
    .subscribe(SERVICE_LEVEL, WEEKS)
    .accounts({
      user: wallet.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint,
      userTokenAccount: ata,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const latest = await connection.getLatestBlockhash('confirmed');
  subTx.recentBlockhash = latest.blockhash;
  subTx.feePayer = wallet.publicKey;
  subTx.sign(wallet);
  const txSig = await connection.sendRawTransaction(subTx.serialize());
  await connection.confirmTransaction(
    { signature: txSig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    'confirmed'
  );
  console.log('  tx confirmada:', txSig);

  // 3) Ativação: assinar `${txSig}:${leagues}:${jwt}` e trocar por X-Api-Token.
  const message = new TextEncoder().encode(`${txSig}:${LEAGUES.join(',')}:${jwt}`);
  const walletSignature = Buffer.from(nacl.sign.detached(message, wallet.secretKey)).toString('base64');

  console.log('› Ativando API token...');
  const res = await fetch(`${tx.apiBase}/token/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ txSig, walletSignature, leagues: LEAGUES }),
  });
  if (!res.ok) {
    throw new Error(`token/activate ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const apiToken = data.token ?? data;
  fs.writeFileSync(
    TOKEN_PATH,
    JSON.stringify({ apiToken, wallet: wallet.publicKey.toBase58(), txSig, activatedAt: new Date().toISOString() }, null, 2)
  );
  console.log('✓ X-Api-Token ativado e salvo em .keys/txline-devnet-token.json');

  await smokeTest(jwt, apiToken);
}

main().catch((e) => {
  console.error('Falha na ativação:', e);
  process.exit(1);
});
