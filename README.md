# Palpite On-Chain

Jogo de palpites esportivos estilo Cartola, **on-chain na Solana**, com
liquidação verificável via oráculo **TxLINE** (TxODDS). Em vez de escalar
jogadores, o usuário prevê variáveis da partida — **resultado, placar, cartões,
escanteios** — e pontua pelos acertos. A pontuação é _provably-fair_: o dado que
liquida os prêmios é provado criptograficamente na blockchain.

## Mecânica em uma frase

O palpite de **resultado (1X2) é uma trava**: se errar quem venceu, a cartela
zera. Se acertar, cada variável secundária **soma** (acerto) ou **subtrai**
(erro). Ganha quem fizer mais pontos na liga.

## Estrutura do repositório

```
palpite-onchain/
├── docs/
│   ├── 01-verificacao-api-txline.md   # o que o TxLINE entrega (verificado)
│   └── 02-design-do-jogo.md           # regras, pontuação e arquitetura
├── web/                              # app Next.js (Fase 1 — protótipo jogável)
│   ├── app/                          # App Router: layout + página do jogo
│   ├── components/                   # CartelaForm, Scoreboard, Ranking
│   └── lib/
│       ├── scoring.mjs                # motor de pontuação (núcleo, testado)
│       ├── scoring.test.mjs           # testes (node --test) — 8 passando
│       ├── scoring.d.ts               # tipos TS do motor (reuso no front)
│       ├── mock.ts                    # fixtures + adversários mockados
│       └── txline.mjs                 # cliente TxLINE (auth + scores)
├── scripts/
│   └── verify-txline-devnet.mjs       # verificação ao vivo na devnet
└── contracts/
    └── programs/liga/src/lib.rs       # programa Anchor da liga (esboço)
```

## Rodar o que já funciona

```bash
# protótipo jogável (Next.js) — montar cartela, apitar, ver ranking
cd web && npm install && npm run dev   # http://localhost:3000

# testes do motor de pontuação
node --test web/lib/scoring.test.mjs

# verificação ao vivo do TxLINE na devnet (guest JWT + schedule)
node scripts/verify-txline-devnet.mjs
```

O protótipo roda **100% local com dados mockados** (nenhum backend nem
blockchain): escolha uma partida, monte a cartela, sele-a (commit) e "apite o
fim de jogo" para revelar o resultado simulado, ver a pontuação detalhada e o
ranking contra adversários. Motor de pontuação reusado de `web/lib/scoring.mjs`.

## Status (roadmap)

- [x] **Fase 0** — Verificação da API + motor de pontuação testado.
- [~] **Fase 1** — Protótipo jogável: front Next.js (montar cartela + ranking
      off-chain) **feito e rodando**; falta plugar Supabase (persistência real).
- [ ] **Fase 2** — On-chain: contrato de liga/escrow + liquidação `validateStatV2`.
- [ ] **Fase 3** — Piloto no tier grátis (Copa/Amistosos), ligas privadas.
- [ ] **Fase 4** — Dinheiro real (revisão jurídica de iGaming, KYC, mainnet).

## Aviso

Fantasy pago com prêmio pode ser enquadrado como aposta/loteria no Brasil
dependendo da estrutura. Antes de qualquer versão com dinheiro real, validar o
desenho com advogado de iGaming. Isto não é aconselhamento jurídico.
