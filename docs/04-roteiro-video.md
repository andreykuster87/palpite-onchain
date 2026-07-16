# Roteiro do vídeo demo (≤ 5 min)

_Gravar com Loom ou OBS + YouTube (não listado). Tela + voz; rosto opcional._
_Idioma: inglês (judges globais da TxODDS) — legendas automáticas ajudam._

## 0:00–0:30 · O problema (gancho)

> "Every World Cup, millions of fans play prediction pools with friends. And
> every pool has the same two problems: someone has to be trusted to settle
> the results by hand... and pure luck beats actual football knowledge."

- Visual: a própria home do app aberta (impacto visual imediato).

## 0:30–1:15 · A mecânica (por que é jogo de habilidade)

- Mostrar a cartela do jogo (semifinal da Copa).
- Narrar a **trava**: "Call the winner wrong and your card scores zero.
  That's the skill gate."
- Preencher: 1X2 + placar exato + mais/menos de gols, cartões, escanteios.
- "The over/under lines are the language every fan already speaks."

## 1:15–2:00 · Selar e o commit

- Clicar **Selar cartela** → carimbo SELADA + código de barras.
- "The sealed card gets a commitment hash — on-chain this locks your picks
  before kickoff. No editing your bet after the final whistle."

## 2:00–3:15 · O apito e o oráculo (coração TxLINE)

- Clicar **Apitar fim de jogo** → "Consultando oráculo…"
- Explicar honesto: dados via TxLINE (fixtures reais da Copa, IDs na tela);
  badge distingue dado do oráculo vs simulação de replay.
- Mostrar pontuação em recibo (+25 placar, +10 gols...) e o ranking da liga
  com cartelas invalidadas pela trava.
- **Mostrar o terminal**: `node scripts/activate-txline-devnet.mjs` (subscribe
  on-chain devnet + X-Api-Token) e/ou a resposta crua de
  `/api/scores/snapshot/{fixtureId}`.

## 3:15–4:15 · Como o TxLINE alimenta o backend

- Diagrama rápido (docs/02): Next.js → API routes → TxLINE (JWT + X-Api-Token
  no servidor) → statKeys 1–8 → motor de pontuação.
- "Settlement roadmap: every pick maps 1:1 to a validateStatV2 Merkle-proof
  predicate — the escrow contract pays winners against cryptographically
  proven stats, not against an admin's spreadsheet." (mostrar lib.rs 5s)

## 4:15–5:00 · Fechamento

- Replicável nos 104 jogos; ligas privadas; buy-in em escrow na fase 2.
- Stack: Next.js + Solana devnet + TxLINE free tier (Copa).
- "Built solo in 48 hours for this hackathon. Repo, live link and docs below."

## Lembretes de gravação

- [ ] Zoom da UI em 110–125% para legibilidade no vídeo.
- [ ] Limpar localStorage antes (fluxo de primeira vez).
- [ ] Ter uma cartela pré-selada em outro jogo para mostrar ranking rápido.
- [ ] Terminal com fonte grande e tema escuro.
- [ ] Cronometrar: estourar 5 min desclassifica a triagem.
