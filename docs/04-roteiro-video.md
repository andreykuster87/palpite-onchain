# Roteiro do vídeo demo — 4Line On-Chain (≤5 min)

_Trilha: **Consumer & Fan Experiences** (TxODDS · World Cup) + Superteam Brasil.
Enquadrado na ideia sugerida da própria trilha ("Group Sweepstake"): bolão entre
amigos com leaderboard que atualiza **ao vivo pelo dado do TxLINE**, sem planilha._

**Como gravar:** Loom ou OBS (tela + microfone) → subir no YouTube (não listado).
App em `4line-onchain.vercel.app` (aba anônima, pra começar limpo). Alvo ~4:30.
**Narração em INGLÊS** (juízes globais) — versão PT no fim pra o listing Superteam.

---

## Estado de demo (deixar pronto antes de gravar)

- Definir apelido (ex.: "Andrey").
- Já existem os bolões semeados: 🌎 Grupo 4line (R$50) e 🎟️ SuperTeam Brasil (R$100).
- Opcional: criar 1 bolão antes ("Superteam Brasil", grátis) pra variedade.
- Ter 1 jogo ENCERRADO à mão (ex.: FRA×MAR 2–0) — o "Selar" puxa o dado real do
  oráculo e mostra o selo "● dado do oráculo".

---

## Cena a cena (ação + narração EN)

### 1 · Hook (0:00–0:20)
**Tela:** home (4Line On-Chain, "● FEED AO VIVO · oráculo TxLINE").
**EN:** "Every World Cup fan watches with a phone in hand. 4Line On-Chain turns
that into a provably-fair pool — every pick is a meme on top, a real TxLINE oracle
market underneath. Nobody, not even the house, can fake the result."

### 2 · Build the meme-ticket (0:20–1:05)
**Ação:** escolher um jogo → cravar o **resultado (a trava)** → marcar 2–3 palpites
de setores diferentes (📊 "Chuva de gols"; 👑 "Artilheiro cravado"; 🤡 zoeira).
Mostrar o total de pontos subindo.
**EN:** "I build a ticket in seconds. First the 1X2 lock — miss it and the whole
ticket zeroes, so it rewards reading the game, not luck. Then meme markets by
sector: team stats, star players from the oracle's PlayerStats, and fun bonuses.
Harder layers pay more."

### 3 · Seal → pick pools → LIVE → result (1:05–2:05)
**Ação:** "🔒 Selar palpite" → **modal de bolões** (marcar 1–2, mostrar total
somado, pagamento único) → confirmar → **placar ao vivo** (relógio, palpites
confirmando ● no ar → ✓/✗) → **resultado final** ("● dado do oráculo").
**EN:** "When I seal, I choose which pools to enter — in a single payment. Then the
match runs live: each pick resolves in real time until the final whistle. The
result that settles it comes straight from the **TxLINE oracle** — see the 'oracle
data' badge."

### 4 · Pools with rules = the track's "Group Sweepstake" (2:05–3:00)
**Ação:** "＋ Criar" → mostrar as regras: **jogo(s)**, **1 ou vários bilhetes por
pessoa** (com o aviso de eliminação), **modo** (por pontos vs só resultado com
divisão do prêmio), **prazo**, **buy-in**. Criar → clicar no nome → **painel** com
📋 Regras + 🏆 Premiação + Ranking.
**EN:** "This is the heart: pools with friends. On creation I pick the games,
tickets per person, the scoring mode, deadline and buy-in. This is exactly the
track's 'Group Sweepstake' idea — but the **leaderboard updates itself from
TxLINE**. No spreadsheet, no waiting."

### 5 · Ranking, prizes, social (3:00–3:35)
**Ação:** ranking do bolão (nome em destaque, premiação 🥇🥈🥉 ou divisão no modo
resultado, você na lista) + **compartilhar por link/convite**.
**EN:** "The pool ranking sits up top, prizes on show. And you invite friends with
a link — whoever opens it joins the same pool."

### 6 · Provably-fair + technical (3:35–4:10)
**Ação:** bilhete selado com o **commit hash** (código de barras) + badge do oráculo.
**EN:** "Technically: the ticket commits a hash before kickoff; results arrive with
TxLINE proofs, mappable to `validateStatV2` on-chain. Every over/under is a
threshold predicate, the 1X2 lock is home_goals minus away_goals. Genuinely
provably-fair."

### 7 · Roadmap + close (4:10–4:40)
**EN:** "Roadmap: a **Telegram bot** pushing your bet's live score and alerts — the
track's own 'AI Pundit Bot'; a real cross-user backend; and on-chain settlement.
4Line On-Chain is live at **4line-onchain.vercel.app**, open source at
github.com/andreykuster87/4line. Built by a fan, for fans."

---

## Dicas
- App é responsivo — grave em janela estreita (mobile-ish) ou desktop.
- Corte tempos mortos (a partida ao vivo roda ~9s; acelere na edição).
- Mostre SEMPRE o selo "● dado do oráculo" — é o diferencial provably-fair.
- Estourou 5min? Corte a cena 6 (técnico); mantenha link + repo no fim.
- Legendas automáticas do YouTube ajudam os juízes.

---

## Narração PT-BR (pra o listing Superteam Brasil, se preferir)
1. "Todo torcedor da Copa assiste com o celular na mão. O 4Line On-Chain vira isso
   num bolão provably-fair — cada palpite uma zoeira por cima, um mercado real do
   oráculo TxLINE por baixo. Ninguém, nem a casa, adultera o placar."
2. "Monto o bilhete em segundos: a trava do 1X2 (errou, zera) e as variáveis-meme
   por setor — estatísticas, craques (via PlayerStats) e zoeira de bônus."
3. "Ao selar, escolho os bolões num pagamento só; a bola rola e o bilhete confirma
   ao vivo até o apito — resultado do oráculo TxLINE."
4. "Bolões com regras: jogos, bilhetes por pessoa, modo, prazo, buy-in. É o 'Group
   Sweepstake' da trilha, com leaderboard que atualiza sozinho pelo TxLINE."
5. "Ranking e premiação no topo; convite por link."
6. "Provably-fair: commit antes do jogo, provas do TxLINE mapeáveis no
   validateStatV2 on-chain."
7. "Roadmap: bot do Telegram, backend real e liquidação on-chain. No ar em
   4line-onchain.vercel.app. Feito por um torcedor, pra torcedor."
