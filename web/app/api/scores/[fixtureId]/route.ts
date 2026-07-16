// GET /api/scores/:fixtureId — stats finais da partida via oráculo TxLINE.
// Responde { source: "txline", stats } ou 503 { source: "unavailable" }
// (sem token ativado / fixture sem dados) — o cliente cai no modo demo.
import { NextResponse } from "next/server";
import { txline, withAuth, API_TOKEN } from "@/lib/txline-server.mjs";
import { snapshotToMatchStats } from "@/lib/txline-adapter.mjs";

export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params;
  if (!/^\d+$/.test(fixtureId)) {
    return NextResponse.json({ error: "fixtureId inválido" }, { status: 400 });
  }
  if (!API_TOKEN) {
    return NextResponse.json(
      { source: "unavailable", reason: "TXLINE_API_TOKEN não configurado" },
      { status: 503 }
    );
  }
  try {
    const snapshot = await withAuth((jwt: string, token?: string) =>
      txline.scoresSnapshot(jwt, token, fixtureId)
    );
    const stats = snapshotToMatchStats(snapshot);
    if (!stats) {
      // Logamos a forma para refinar o adaptador na primeira chamada real.
      console.warn(
        "[txline] snapshot sem stats reconhecíveis:",
        JSON.stringify(snapshot).slice(0, 600)
      );
      return NextResponse.json(
        { source: "unavailable", reason: "payload sem stats de jogo inteiro" },
        { status: 503 }
      );
    }
    return NextResponse.json({ source: "txline", fixtureId, stats });
  } catch (e) {
    return NextResponse.json(
      { source: "unavailable", reason: String(e) },
      { status: 503 }
    );
  }
}
