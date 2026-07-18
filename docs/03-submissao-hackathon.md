# Submissão — TxLINE World Cup Hackathon

_Trilha global: **Consumer and Fan Experiences** · Trilha local: Superteam Brasil_
_Time: Andrey Kuster (solo) · Deadline: 2026-07-18 23:59_

## Ideia central

**4Line On-Chain** — o bolão da Copa reinventado com dados verificáveis.
O torcedor preenche uma cartela por jogo: **quem vence (1X2)** — a "trava",
errou zerou — mais variáveis **mais/menos** (gols, cartões, escanteios) contra
linhas da partida. Acertos somam, erros subtraem, e o ranking da liga decide
quem leva a taça. A graça técnica: o resultado que liquida a rodada vem do
**oráculo TxLINE** com provas de Merkle — ninguém, nem a casa, adultera o
placar.

### Por que isso é um produto de torcedor

- Cartela em 30 segundos, no celular, antes do apito.
- A trava do 1X2 recompensa **leitura de jogo**, não sorte — e mata a cartela
  de quem chuta tudo.
- Mais/menos é a linguagem natural do bar: "esse clássico tem MAIS de 4.5
  cartões fácil".
- Replicável nos 104 jogos da Copa; ligas privadas entre amigos no roadmap.

## Destaques técnicos

1. **Motor de pontuação puro e testado** (`web/lib/scoring.mjs`, 8 testes):
   trava 1X2 + soma/penalidade + desempate determinístico. Reusado pelo front
   e (roadmap) pela Edge Function.
2. **Commit–reveal desde o protótipo**: a cartela selada exibe o hash do
   commit no próprio bilhete (UI de bilhete físico com picote e carimbo).
   No contrato (esboço Anchor em `contracts/`), o hash é registrado on-chain
   antes do jogo.
3. **Formato mais/menos ↔ validateStatV2**: cada palpite mapeia 1:1 em
   predicados de limiar do TxLINE (`total_escanteios > 9.5` etc.), e a trava
   1X2 é a operação binária `gols_casa − gols_fora`. A liquidação on-chain usa
   exatamente o que o produto pede.
4. **Fonte de dados honesta**: badge na UI distingue "● dado do oráculo" de
   "● simulação" (modo replay para jogos encerrados — os judges avaliarão fora
   da janela ao vivo).

## Endpoints TxLINE usados

| Endpoint | Uso no produto |
|---|---|
| `POST /auth/guest/start` | JWT de sessão (renovado em 401) |
| `POST /api/token/activate` | Ativação do tier grátis (assinatura da wallet + txSig do subscribe on-chain) |
| `GET /api/fixtures/snapshot?competitionId=72` | Jogos da Copa 2026 |
| `GET /api/scores/snapshot/{fixtureId}` | Stats finais (gols, cartões, escanteios) — statKeys 1–8 |
| `GET /api/scores/stat-validation?fixtureId&seq&statKeys` | Provas de Merkle para liquidação `validateStatV2` (fase on-chain) |
| Programa devnet `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` | `subscribe(1, 4)` — tier grátis Copa |

## Feedback sobre a API (rascunho — completar antes de submeter)

**Funcionou bem**
- Fluxo guest JWT → subscribe on-chain → activate é bem desenhado; a
  assinatura `txSig::jwt` amarra a sessão à wallet com elegância.
- O mapa de statKeys (base 1–8 + prefixo de período) é simples e expressivo.
- Exemplos devnet do repo `txodds/tx-on-chain` foram essenciais — o
  `subscription_free_tier.ts` documenta na prática o que a doc descreve.

**Onde travou**
- **Airdrop da devnet global seco** durante o hackathon: impossível pagar as
  fees do `subscribe` sem SOL; faucets alternativos exigem repos/mainnet
  balance. Sugestão: o tier grátis poderia dispensar a transação on-chain na
  devnet (ou a TxODDS manter um faucet próprio de devnet SOL para onboarding).
- `GET /api/scores/schedule` retorna 403 mesmo com guest JWT — a página de
  docs homônima é pública; a assimetria confunde. Documentar quais endpoints
  exigem X-Api-Token.
- statKeys numéricos não são enumerados na doc principal (só no PDF do feed
  de futebol) — um JSON canônico exportável ajudaria.
- Instabilidade intermitente de rede (`ECONNRESET`) em `txline.txodds.com`
  durante a tarde de 16/07.

## Links da submissão

- **App ao vivo:** https://4line-onchain.vercel.app (oráculo TxLINE ativo em produção)
- **Repositório:** https://github.com/andreykuster87/4line
- **Vídeo demo:** _(a gravar — roteiro em `docs/04-roteiro-video.md`)_

## Checklist de submissão

- [ ] Vídeo demo ≤ 5 min (roteiro em `docs/04-roteiro-video.md`)
- [x] Repositório público no GitHub
- [x] Link funcional deployado (Vercel) — TxLINE alimentando dados em produção
- [x] Documentação técnica (este arquivo + docs/01 + docs/02)
- [ ] Dupla submissão: trilha global (Consumer) + listing Superteam Brasil
