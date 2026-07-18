// Camada de bolões (ligas) — LOCAL por enquanto (sem backend).
//
// Um bolão é um grupo com ranking próprio. Nesta fase tudo vive no
// localStorage e os adversários do ranking são simulados por `code` (ver
// ticketOpponentsFor em ./mock) — dois dispositivos com o MESMO código veem o
// MESMO campo simulado, então "criar/entrar" já dá a UX completa. Quando o
// Supabase entrar, ESTE módulo é o ponto único a trocar (as funções viram
// chamadas às rotas /api/pools); a UI não muda.
//
// Convite: o link `#p=<base64url>` carrega { id, name, code } — abrir entra no
// MESMO bolão. Entrar por código digitado cria um stub com o mesmo `code`
// (semente do ranking), com nome padrão até um convite trazer o nome real.

import { toBase64Url, fromBase64Url } from "./share";

export interface Pool {
  id: string;
  name: string;
  /** Código de convite curto (A–Z0–9). Também é a semente do ranking. */
  code: string;
  /** Bolão público da plataforma — todo mundo entra, sempre presente. */
  isPlatform: boolean;
  /** Valor da inscrição (buy-in) em R$ inteiros. 0 = grátis. */
  buyIn: number;
  createdAt: number;
}

/** Opções de buy-in oferecidas ao criar um bolão. */
export const BUY_IN_OPTIONS = [0, 50, 100] as const;

/** Rótulo do valor: "Grátis" ou "R$ 50". */
export function moneyLabel(v: number): string {
  return v > 0 ? `R$ ${v}` : "Grátis";
}

const KEY = "palpite:pools:v1";

/** Bolão público único da plataforma. Fixo (não é criado nem removível). */
export const PLATFORM_POOL: Pool = {
  id: "platform",
  name: "Bolão da Plataforma",
  code: "GERAL",
  isPlatform: true,
  buyIn: 0,
  createdAt: 0,
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I

function randomCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    let n = Math.floor(Math.random() * CODE_ALPHABET.length);
    try {
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        n = crypto.getRandomValues(new Uint32Array(1))[0] % CODE_ALPHABET.length;
      }
    } catch {
      /* fallback Math.random */
    }
    out += CODE_ALPHABET[n];
  }
  return out;
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return "p_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    }
  } catch {
    /* fallback */
  }
  return "p_" + Math.floor(Math.random() * 1e16).toString(36);
}

/** Normaliza um código digitado (maiúsculo, só chars do alfabeto). */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .split("")
    .filter((c) => CODE_ALPHABET.includes(c))
    .join("")
    .slice(0, 12);
}

function read(): Pool[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (p): p is Pool =>
          p && typeof p.id === "string" && typeof p.code === "string"
      )
      // Compat: bolões salvos antes do buy-in não tinham o campo.
      .map((p) => ({ ...p, buyIn: typeof p.buyIn === "number" ? p.buyIn : 0 }));
  } catch {
    return [];
  }
}

function write(pools: Pool[]): void {
  try {
    // Não persistimos o bolão da plataforma (é constante em código).
    localStorage.setItem(
      KEY,
      JSON.stringify(pools.filter((p) => !p.isPlatform))
    );
  } catch {
    /* ignora */
  }
}

/**
 * Lista os bolões da pessoa: a Plataforma sempre em primeiro, depois os
 * privados (mais novo primeiro).
 */
export function listPools(): Pool[] {
  const mine = read().sort((a, b) => b.createdAt - a.createdAt);
  return [PLATFORM_POOL, ...mine];
}

export function getPool(id: string): Pool | undefined {
  return listPools().find((p) => p.id === id);
}

/** Cria um bolão novo (gera id + código único entre os locais) e salva. */
export function createPool(name: string, buyIn: number, now: number): Pool {
  const pools = read();
  let code = randomCode();
  const taken = new Set(pools.map((p) => p.code));
  taken.add(PLATFORM_POOL.code);
  while (taken.has(code)) code = randomCode();

  const pool: Pool = {
    id: newId(),
    name: name.trim().slice(0, 40) || "Meu bolão",
    code,
    isPlatform: false,
    buyIn: buyIn > 0 ? Math.round(buyIn) : 0,
    createdAt: now,
  };
  write([pool, ...pools]);
  return pool;
}

/**
 * Entra num bolão. Se já existe um local com o mesmo código, devolve esse
 * (idempotente). Senão adiciona `pool` à lista local.
 */
export function joinPool(pool: Pool, now: number): Pool {
  if (pool.isPlatform) return PLATFORM_POOL;
  const pools = read();
  const existing = pools.find((p) => p.code === pool.code);
  if (existing) return existing;
  const joined: Pool = { ...pool, createdAt: pool.createdAt || now };
  write([joined, ...pools]);
  return joined;
}

/**
 * Entra por código digitado: se já é um bolão local, devolve-o; senão cria um
 * stub local com o mesmo `code` (semente do ranking) e nome padrão.
 */
export function joinByCode(rawCode: string, now: number): Pool | null {
  const code = normalizeCode(rawCode);
  if (!code || code === PLATFORM_POOL.code) return PLATFORM_POOL;
  const existing = read().find((p) => p.code === code);
  if (existing) return existing;
  return joinPool(
    { id: newId(), name: `Bolão ${code}`, code, isPlatform: false, buyIn: 0, createdAt: now },
    now
  );
}

/** Sai de um bolão privado (a plataforma não pode ser removida). */
export function leavePool(id: string): void {
  if (id === PLATFORM_POOL.id) return;
  write(read().filter((p) => p.id !== id));
}

/* ---------- Convite por link (#p=<base64url>) ---------- */

export const POOL_HASH_PREFIX = "p=";

/** Codifica um bolão em code base64url para o link de convite. */
export function encodePool(pool: Pool): string {
  return toBase64Url(
    JSON.stringify({ v: 1, i: pool.id, n: pool.name, c: pool.code, b: pool.buyIn })
  );
}

/** Decodifica um code de convite de volta em Pool (privado). */
export function decodePool(code: string): Pool | null {
  try {
    const raw = JSON.parse(fromBase64Url(code)) as {
      i?: unknown;
      n?: unknown;
      c?: unknown;
      b?: unknown;
    };
    const c = typeof raw.c === "string" ? normalizeCode(raw.c) : "";
    if (!c) return null;
    return {
      id: typeof raw.i === "string" && raw.i ? raw.i : newId(),
      name: typeof raw.n === "string" && raw.n ? raw.n.slice(0, 40) : `Bolão ${c}`,
      code: c,
      isPlatform: false,
      buyIn: typeof raw.b === "number" && raw.b > 0 ? Math.round(raw.b) : 0,
      createdAt: 0,
    };
  } catch {
    return null;
  }
}

/** Link completo de convite (origin + path atual + hash). */
export function buildInviteUrl(pool: Pool): string {
  const code = encodePool(pool);
  const base =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "";
  return `${base}#${POOL_HASH_PREFIX}${code}`;
}

/** Lê um convite de bolão no hash da URL atual, se houver. */
export function readInviteFromHash(): Pool | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith(POOL_HASH_PREFIX)) return null;
  return decodePool(hash.slice(POOL_HASH_PREFIX.length));
}
