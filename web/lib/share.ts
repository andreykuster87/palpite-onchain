// Bilhetes compartilháveis (MVP sem backend).
//
// O palpite inteiro cabe numa URL: só precisamos do fixtureId + do Ticket
// ({ result, picks }). O catálogo de mercados é reconstruído de forma
// determinística por fixture (catalogFor), então NÃO viaja no link — só a
// escolha do apostador. Nada sensível é codificado.
//
// Formato compacto do payload (base64url no hash: `#b=<code>`):
//   { v: 1, f: fixtureId, r: result, p: [[marketId, 1|0], ...] }  (1 = SIM)

import type { Outcome, Ticket, TicketPick } from "./scoring";

export interface SharedTicket {
  fixtureId: string;
  ticket: Ticket;
}

/** Prefixo do hash que carrega um bilhete compartilhado. */
export const SHARE_HASH_PREFIX = "b=";

const OUTCOMES: readonly Outcome[] = ["HOME", "DRAW", "AWAY"];

/** UTF-8 → base64url (sem padding), seguro para caracteres acentuados. */
function toBase64Url(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url → UTF-8. */
function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return decodeURIComponent(escape(atob(b64 + pad)));
}

/** Codifica fixture + bilhete num code base64url para o hash da URL. */
export function encodeTicket(fixtureId: string, ticket: Ticket): string {
  const payload = {
    v: 1,
    f: fixtureId,
    r: ticket.result,
    p: ticket.picks.map((pk) => [pk.marketId, pk.side === "SIM" ? 1 : 0]),
  };
  return toBase64Url(JSON.stringify(payload));
}

/** Decodifica um code do hash de volta em fixtureId + Ticket saneado. */
export function decodeTicket(code: string): SharedTicket | null {
  try {
    const raw = JSON.parse(fromBase64Url(code)) as {
      f?: unknown;
      r?: unknown;
      p?: unknown;
    };
    if (!raw || typeof raw.f !== "string" || !raw.f) return null;

    const result: Outcome = OUTCOMES.includes(raw.r as Outcome)
      ? (raw.r as Outcome)
      : "HOME";

    const picks: TicketPick[] = Array.isArray(raw.p)
      ? raw.p
          .filter(
            (x): x is [string, number] =>
              Array.isArray(x) && typeof x[0] === "string"
          )
          .map((x) => ({
            marketId: x[0],
            side: x[1] ? "SIM" : "NAO",
          }))
      : [];

    return { fixtureId: raw.f, ticket: { result, picks } };
  } catch {
    return null;
  }
}

/** Monta o link completo compartilhável (origin + path atual + hash). */
export function buildShareUrl(fixtureId: string, ticket: Ticket): string {
  const code = encodeTicket(fixtureId, ticket);
  const base =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "";
  return `${base}#${SHARE_HASH_PREFIX}${code}`;
}

/** Lê o bilhete compartilhado no hash da URL atual, se houver. */
export function readShareFromHash(): SharedTicket | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;
  return decodeTicket(hash.slice(SHARE_HASH_PREFIX.length));
}
