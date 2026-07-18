# Roadmap — 4Line On-Chain · build dos bilhetes-meme

_Atualizado em 2026-07-17. **Decisão: Opção 2** — os bilhetes-meme viram o MVP
jogável (não só visão de vídeo). Este doc é o plano de execução da próxima
sessão._

---

## ▶️ FRASE PRA INICIAR A PRÓXIMA SESSÃO (cole isto)

> Retomar o **4Line On-Chain** (pasta `C:\Coach`). Decisão fechada: **Opção 2** —
> implementar os **bilhetes-meme** como MVP jogável. Ler
> `docs/05-roadmap-proximas-sessoes.md` e começar pela **Fase A**. O app Next.js
> está em `web/`, já deployado (4line-onchain.vercel.app) e com o token TxLINE em
> `web/.env.local` (devnet, funcionando). Reusar o motor `web/lib/scoring.mjs` e
> os endpoints já prontos (`/api/fixtures`, `/api/scores/[id]`). NÃO quebrar o que
> está no ar. Deadline do hackathon: 18/07 23:59.

---

## Contexto (onde estamos)

**O que é:** bolão da Copa provably-fair na Solana. O usuário **monta o próprio
bilhete** escolhendo variáveis-meme ("Chuva de gols", "Messi decide?", "Chá de
cartão argentino") — cada zoeira por cima, um mercado real do TxLINE por baixo.
Pontos por acerto, sem dinheiro real (fora do regime de iGaming). Trilha Consumer
& Fan Experiences.

**Já está pronto e NO AR (não quebrar):**
- App Next.js em `web/`, deployado em https://4line-onchain.vercel.app
- Oráculo TxLINE ativo (token em `web/.env.local`; ver [[gotchas-txline-api]])
- Motor de pontuação testado `web/lib/scoring.mjs` (trava 1X2 + over/under)
- Rotas `/api/fixtures` e `/api/scores/[fixtureId]` (token só no servidor)
- 8 fixtures do mata-mata com stats reais (`web/lib/copa.ts`)
- Repo público: github.com/andreykuster87/palpite-onchain

**O fluxo alvo (2 telas)** — mockups já aprovados nesta sessão:
1. **Montar** — builder: variáveis opt-in por setor (Craques / Time / Zoeira) e
   dificuldade, com total de pontos ao vivo.
2. **Confirmar** — bilhete selado com os palpites, % da galera, commit e carimbo.

---

## Dados TxLINE confirmados (base do catálogo)

**Por time** (statKeys 1–8, jogo inteiro + prefixos de período 1000=1ºT, 3000=2ºT):
gols, amarelos, vermelhos, escanteios.

**Por jogador** (`PlayerStats`, confirmado ao vivo — CORREÇÃO de doc anterior que
dizia "jogador não cabe": **cabe sim**): `goals`, `yellowCards`, `redCards`,
`penaltyAttempts`, `penaltyGoals`. Escalação com nome real via `Lineups`.

**Endpoints:** `/fixtures/snapshot?competitionId=72` · `/scores/snapshot/{id}` ·
`/scores/historical/{id}` (play-by-play completo, base do "replay ao vivo").

**A confirmar:** chutes a gol (time e jogador); provabilidade on-chain por
jogador via `validateStatV2` (não bloqueia o jogo de pontos — resolvemos lendo o
oráculo).

**Catálogo possível:** ~24 variáveis de Time + ~15-20 de Craques (curado) + Zoeira
= ~40 por jogo. Gargalo é curadoria, não dado.

---

## Pontuação v2 (motor)

| Camada | Exemplos | Acerto | Erro |
|---|---|:---:|:---:|
| Fácil (over/under ~50/50) | total de gols, cartões, escanteios | +5 | −3 |
| Média | ambas marcam, cartões por time, craque marca, craque leva cartão | +8 | −3 |
| Difícil (raro) | placar exato, artilheiro do jogo, converte pênalti | +15 | −5 |
| Zoeira | "vai ter choro?" | não pontua |

- **Trava 1X2** mantida: errou o resultado, bilhete zera.
- Assimetria +5/−3 → equilíbrio em ~37,5% de acerto (recompensa habilidade).
- Ponto em aberto: penalidade do placar exato (−5) a calibrar com playtest.

---

## O QUE CONSTRUIR — em fases (por risco/prazo)

### 🔴 Fase A — Bilhete-meme jogável (MVP crítico, só mercados de TIME)
_Entrega a experiência de bilhete-meme reusando o que já existe. Sem jogador
ainda, pra não depender de escalação nem de mudanças no adapter._

1. **Catálogo de variáveis** por fixture — nova estrutura (ex.: `web/lib/catalog.ts`):
   cada mercado = `{ id, setor, memeNome, emoji, camada, resolve: {tipo, stat,
   cmp, linha, lado}, pontos }`. Escrever os mercados-meme de TIME para os jogos
   cobertos, mapeando cada um a um stat que já temos em `MatchStats`.
2. **Motor v2** — `scoreTicket(ticket, stats)` com as camadas acima (estender ou
   compor com `scoreCartela`). Manter testes.
3. **Tela Montar (builder)** — componente novo; grupos por setor, seleção opt-in,
   MAIS/MENOS por item, tally de pontos ao vivo. (Base visual: mockup
   `montar_bilhete`.)
4. **Tela Confirmar (bilhete selado)** — selações + commit local + carimbo.
   (Base visual: mockup `bilhete_selado`.)
5. **Ligar ao apito/replay** já existente pra resolver e pontuar.
6. Rodar testes + deploy. **Checkpoint: app com bilhete-meme jogável no ar.**

### 🟠 Fase B — Craques (variáveis por jogador)
1. Estender o **adapter** (`web/lib/txline-adapter.mjs`) pra extrair `PlayerStats`
   + `Lineups` (playerId → nome + stats por jogador).
2. Rota/So exposição dos jogadores por fixture (pra popular os selects "escolha o
   craque").
3. Catálogo de mercados de CRAQUE (marca / 2+ / amarelo / vermelho / pênalti /
   artilheiro do jogo / primeiro a marcar).
4. `scoreTicket` resolve mercados de jogador lendo `PlayerStats`.
5. Builder ganha a seção **👑 Craques** (mockup `montar_bilhete_v2_craques`).

### 🟢 Fase C — Consenso, destaque, odds (se sobrar tempo)
- **% da galera** por item (opinião em massa = odd) + bônus por ir contra a maioria.
- **Jogo-destaque** ×2 na rodada.
- **Odds-weighted** derivado do feed StablePrice (`/odds/snapshot`) — resolve o
  "farmar" variável fácil; substitui as linhas hoje inventadas em `copa.ts`.

---

## ⚠️ Reality check de prazo (honesto)

Deadline **18/07 23:59**. A submissão tem 3 obrigatórios: link ✅, repo ✅ e
**vídeo demo** (sem ele, desclassifica na triagem). Sequência acordada:
**plataforma primeiro, vídeo por último.**

- **Fase A é o alvo realista** pro deadline — entrega a experiência de bilhete-meme.
- **Fase B/C são stretch** — só se A ficar estável com folga.
- **Reservar ~40-60 min no fim pro vídeo** (Loom, gravação de tela ≤5min). Não é
  negociável: app pronto sem vídeo = fora.

Regra de ouro: se A não fechar a tempo, **grava-se o vídeo com o que estiver
estável** (nem que seja o app atual + mockups como visão). Vídeo entregue > feature
não submetida.

---

## Pós-hackathon (fases futuras)
- **Wallet Phantom** — identidade + `signMessage` (commit-reveal real, sem dinheiro).
- **Supabase** — ligas compartilhadas reais, leaderboard ao vivo, convite.
- **Live/in-play via `/scores/stream`** — atualização ao vivo durante a partida.
- **Camada social curada** (cards compartilháveis, reações-meme) — sem scraping.
- **On-chain settlement** (`validateStatV2`) → trilha Prediction Markets.
- **Dinheiro real** — revisão jurídica de iGaming + KYC + mainnet.
