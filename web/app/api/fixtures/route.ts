// GET /api/fixtures — fixtures da Copa 2026.
// Com token: consulta o snapshot de fixtures do TxLINE (competitionId 72) e
// devolve { source: "txline", raw } junto com a lista curada. Sem token (ou
// erro): { source: "seed" } com a lista curada de COPA_FIXTURES — que já usa
// os fixtureIds reais da cobertura TxLINE.
import { NextResponse } from "next/server";
import { COPA_FIXTURES } from "@/lib/copa";
import { txline, withAuth, API_TOKEN } from "@/lib/txline-server.mjs";

export const revalidate = 0;

const WORLD_CUP_COMPETITION_ID = 72;

export async function GET() {
  if (API_TOKEN) {
    try {
      const raw = await withAuth((jwt: string, token?: string) =>
        txline.fixturesSnapshot(jwt, token, {
          competitionId: WORLD_CUP_COMPETITION_ID,
        })
      );
      return NextResponse.json({
        source: "txline",
        fixtures: COPA_FIXTURES,
        raw,
      });
    } catch (e) {
      console.warn("[txline] fixtures snapshot falhou:", String(e));
    }
  }
  return NextResponse.json({ source: "seed", fixtures: COPA_FIXTURES });
}
