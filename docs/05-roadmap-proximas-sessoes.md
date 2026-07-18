# Roadmap — 4Line On-Chain · build dos bilhetes-meme

_Atualizado em 2026-07-18. **Fase A + bilhetes compartilháveis + "Minha
prateleira" CONCLUÍDOS, verificados e NO AR** (`4line-onchain.vercel.app`). Este
doc é o plano da PRÓXIMA sessão: **Bolões (criar/entrar + bolão da plataforma)**
→ Fase B (craques) → vídeo._

---

## ▶️ FRASE PRA INICIAR A PRÓXIMA SESSÃO (cole isto)

> Retomar o **4Line On-Chain** (pasta `C:\Coach`). **NO AR e verificado**
> (`4line-onchain.vercel.app`; push em `master` = auto-deploy Vercel ~30s):
> bilhete-meme jogável (📊 Estatísticas + 🤡 Zoeira-bônus, motor `scoreTicket`
> em `web/lib/scoring.mjs`, catálogo `web/lib/catalog.ts`, telas
> `TicketBuilder`/`SealedTicket`/`TicketScore`, `web/app/page.tsx` orquestra);
> **bilhetes compartilháveis** (link `#b=<base64>` em `web/lib/share.ts`,
> pré-carrega o builder); **"Minha prateleira"** (`web/components/Prateleira.tsx`,
> bilhetes selados guardados + compartilháveis, cards com chips dos palpites).
> **Prioridade desta sessão: BOLÕES** — pessoas podem **criar/entrar num bolão**
> (código/link de convite) e existe o **bolão da plataforma** (público, todo
> mundo entra). Isso **EXIGE backend = Supabase** (a prateleira ficou local por
> decisão anterior; o bolão é o motivo de finalmente subir o Supabase). Decidir
> no começo: criar projeto Supabase novo (só existe o NorthWindy, não
> relacionado) + **2 env vars na Vercel (manual do Andrey)** + identidade por
> apelido local agora (Phantom `signMessage` depois). Ler
> `docs/05-roadmap-proximas-sessoes.md`. Depois: (2) **Fase B** (craques —
> `web/lib/txline-adapter.mjs` p/ PlayerStats + Lineups), (3) **vídeo +
> submissão**. Token em `web/.env.local` (devnet). **NÃO quebrar o que está no ar.**

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

### ✅ Fase A — Bilhete-meme jogável — CONCLUÍDA (18/07)
_Entregue e verificado no browser contra o oráculo ao vivo. Ainda **não
commitado/deployado**._ Feito: motor v2 `scoreTicket`/`marketHappened`/
`ticketErrors` + camadas `LAYER_POINTS` (fácil +5/−3, média +8/−3, difícil
+15/−5, **zoeira-bônus +3/0**) em `scoring.mjs` (+ tipos em `.d.ts`); catálogo
`web/lib/catalog.ts` (setores 📊 Estatísticas + 🤡 Zoeira, nomes dos times
tecidos); componentes `TicketBuilder`/`SealedTicket`/`TicketScore`; `page.tsx`
reescrito (storage `palpite:tickets:v4`); testes `scoring.ticket.test.mjs`
(16/16). Sondado ao vivo: oráculo só entrega statKeys 1–8 (sem chute a gol);
dados por período (1º/2ºT) existem = enriquecimento futuro barato.

_Plano original abaixo (referência do que foi entregue):_

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

### ✅ Fase A.5 — Bilhetes compartilháveis + Minha prateleira — CONCLUÍDA (18/07)
_No ar e verificado end-to-end._ Entregue:
- **Compartilhar** (`web/lib/share.ts`): botão no bilhete selado gera link
  `/#b=<base64>` codificando `fixtureId` + `{result, picks}` e copia pro
  clipboard; abrir o link decodifica, troca pra fixture e **pré-carrega o
  builder** (picks saneados contra o catálogo) + banner "Bilhete de um amigo".
  Só o palpite viaja. **Gotcha:** trocar só o hash não remonta o React → o
  effect `[]` só roda em fresh load (caso real do amigo).
- **Minha prateleira** (`web/components/Prateleira.tsx`): lista os bilhetes
  selados (local, `localStorage palpite:tickets:v4`), cards estilo bilhete com
  **chips dos palpites** (emoji + bolinha do lado), pontos em jogo, botões
  Abrir/🔗 Link. **É LOCAL por decisão do Andrey** — não há descoberta
  cross-device; pro desconhecido, o caminho é o link compartilhável.

### 🔴 Fase A.6 — BOLÕES (ligas) — PRIORIDADE da próxima sessão
_Pedido do Andrey: pessoas podem **criar/entrar num bolão** e existe um **bolão
da plataforma** (público). Este é o passo que EXIGE backend (Supabase) — a
prateleira local não resolve pool entre usuários **diferentes**._

**Duas camadas:**
1. **Bolão da plataforma (global):** pool público único, todo mundo dentro.
   Substitui os adversários fake de hoje (`ticketOpponentsFor` em
   `web/lib/mock.ts`) por um leaderboard **real**: os bilhetes selados de todos
   para aquela fixture, pontuados pelo motor v2 e ranqueados.
2. **Bolões privados:** criar um bolão (nome → gera **código/link de convite**),
   entrar por código/link, ranking só entre os membros.

**Precisa (Supabase — decisão de infra a confirmar no início):**
- Criar **projeto Supabase novo** (só existe NorthWindy na conta, não
  relacionado; NÃO reusar).
- Tabelas: `pools` (id, nome, código, is_platform, created_at), `pool_members`
  (pool_id, user_id, apelido), `tickets` (pool_id, user_id, fixture_id, result,
  picks jsonb, submitted_at). RLS: leitura pública, escrita anônima validada.
- **Rotas server no Next** (`/api/pools`, `/api/pools/[code]/join`,
  `/api/tickets`) — mesmo padrão do token TxLINE (chaves só no servidor,
  `web/lib/txline-server.mjs` como referência).
- **2 env vars na Vercel** (`SUPABASE_URL` + key) — passo **manual do Andrey**
  no painel + redeploy (não dá pra setar env de produção pelo agente).
- **Identidade:** apelido + `userId` anônimo no `localStorage` agora; **Phantom
  `signMessage` depois** (identidade real sem dinheiro).
- Publica no bolão ao selar; o bilhete continua no hash pra convite direto.

**UX:** seletor de bolão no topo (Plataforma / meus bolões / entrar por código);
o ranking lateral passa a mostrar o bolão selecionado; ações "Criar bolão" e
"Entrar por código". Alimenta o **% da galera** e o **jogo-destaque** da Fase C.

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
