// Inscrições de bilhetes em bolões — LOCAL por enquanto (sem backend).
//
// Um bilhete selado (em ./page storage `palpite:tickets:v4`) é um "template".
// Para CONCORRER, ele é INSCRITO num bolão específico (escolhido no modal da
// prateleira), pagando o buy-in daquele bolão. O mesmo bilhete pode ser
// inscrito em vários bolões (uma inscrição por par bolão+fixture).
//
// PAGAMENTO É SIMULADO: não há gateway/dinheiro real. `paid` marca a inscrição
// como confirmada no fluxo placeholder; `buyIn` guarda o valor "cobrado" só
// para exibir. Quando entrar o pagamento real (e o Supabase), esta camada vira
// as chamadas de servidor — a UI não muda.

import type { Ticket } from "./scoring";

export interface PoolEntry {
  poolId: string;
  fixtureId: string;
  /** Snapshot do bilhete no momento da inscrição. */
  ticket: Ticket;
  buyIn: number;
  /** Pagamento simulado confirmado (placeholder — sem dinheiro real). */
  paid: boolean;
  enteredAt: number;
}

const KEY = "palpite:entries:v1";

function keyOf(poolId: string, fixtureId: string): string {
  return `${poolId}::${fixtureId}`;
}

export function listEntries(): PoolEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (e): e is PoolEntry =>
        e &&
        typeof e.poolId === "string" &&
        typeof e.fixtureId === "string" &&
        e.ticket &&
        typeof e.ticket === "object"
    );
  } catch {
    return [];
  }
}

function write(entries: PoolEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* ignora */
  }
}

/**
 * Inscreve (ou atualiza) um bilhete num bolão. Idempotente por bolão+fixture:
 * reinscrever atualiza o snapshot do bilhete. Devolve a lista nova.
 */
export function enterPool(
  poolId: string,
  fixtureId: string,
  ticket: Ticket,
  buyIn: number,
  now: number
): PoolEntry[] {
  const entries = listEntries();
  const k = keyOf(poolId, fixtureId);
  const entry: PoolEntry = {
    poolId,
    fixtureId,
    ticket,
    buyIn: buyIn > 0 ? Math.round(buyIn) : 0,
    paid: true, // placeholder: pagamento simulado confirmado
    enteredAt: now,
  };
  const next = [entry, ...entries.filter((e) => keyOf(e.poolId, e.fixtureId) !== k)];
  write(next);
  return next;
}

/** Remove uma inscrição específica. */
export function removeEntry(poolId: string, fixtureId: string): PoolEntry[] {
  const k = keyOf(poolId, fixtureId);
  const next = listEntries().filter((e) => keyOf(e.poolId, e.fixtureId) !== k);
  write(next);
  return next;
}

/** Remove todas as inscrições de um bolão (ao sair dele). */
export function removeEntriesForPool(poolId: string): PoolEntry[] {
  const next = listEntries().filter((e) => e.poolId !== poolId);
  write(next);
  return next;
}

/** Já existe inscrição desse bilhete (fixture) neste bolão? */
export function hasEntry(
  entries: PoolEntry[],
  poolId: string,
  fixtureId: string
): boolean {
  return entries.some((e) => e.poolId === poolId && e.fixtureId === fixtureId);
}

/** IDs dos bolões em que uma fixture está inscrita. */
export function poolIdsForFixture(
  entries: PoolEntry[],
  fixtureId: string
): string[] {
  return entries.filter((e) => e.fixtureId === fixtureId).map((e) => e.poolId);
}
