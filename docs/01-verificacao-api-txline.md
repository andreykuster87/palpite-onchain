# Verificação da API TxLINE — resultados

_Data: 2026-07-16 · Rede de referência: devnet/mainnet TxLINE (TxODDS)_

## Pergunta que precisávamos responder

O jogo pontua por **eventos de partida** — resultado (1X2), placar, cartões e
escanteios. A dúvida era: o TxLINE entrega essas estatísticas em nível de
partida e elas são **liquidáveis on-chain** de forma verificável? Resposta:
**sim para as duas coisas.**

## 1. Estatísticas disponíveis (feed de futebol)

Fonte: `documentation/scores/soccer-feed`. O feed expõe, **por participante**
(time 1 e time 2), os seguintes totais — exatamente as variáveis da nossa
cartela:

| Variável do jogo        | Campo no feed TxLINE                         | Status |
|-------------------------|----------------------------------------------|--------|
| Resultado (1X2)         | derivado de `Total Goals` (P1 vs P2)         | ✅ |
| Placar exato            | `Participant 1/2 Total Goals`                | ✅ |
| Total de gols           | soma dos `Total Goals`                        | ✅ |
| Cartões amarelos        | `Participant 1/2 Total Yellow Cards`         | ✅ |
| Cartões vermelhos       | `Participant 1/2 Total Red Cards`            | ✅ |
| Escanteios              | `Participant 1/2 Total Corners`              | ✅ |

Dados adicionais disponíveis (para variantes futuras da cartela): chutes
(`OnTarget`, `OffTarget`, `Woodwork`, `Blocked`), faltas/impedimentos,
decisões de VAR, e pênaltis (`Scored`, `Missed`, `Retake`).

## 2. Verificação on-chain (`validateStatV2`)

Fonte: `documentation/examples/onchain-validation`. A validação usa **provas de
Merkle** contra raízes armazenadas on-chain (PDA `daily_scores_roots`). Pontos-chave:

- "Qualquer estatística acessível pela API de scores" pode ser validada.
- Suporta **predicados de stat único** (limiar + operador de comparação) — ex.:
  "escanteios do time A ≥ 5".
- Suporta **operações binárias entre dois stats** (ex.: subtração) — ex.:
  `gols_casa − gols_fora > 0` ⇒ vitória do mandante. **É exatamente a trava do
  resultado que o jogo precisa.**
- É uma _view_ (`.view()`), leitura/simulação — retorna booleano de
  sucesso/falha. A regra `IncompleteStatCoverage` exige que toda entrada em
  `payload.stats` seja coberta pela estratégia.

### Fluxo de validação
1. `GET /api/scores/stat-validation?fixtureId=...&seq=...&statKeys=1,2,3001,3002`
2. Converter hashes de prova para arrays de 32 bytes.
3. Derivar a PDA `daily_scores_roots` pelo dia de epoch.
4. Chamar `validateStatV2(payload, strategy)` como view.
5. Interpretar o booleano.

## 3. Mapa de endpoints relevantes

- Odds: `documentation/odds/overview`, `.../odds-coverage` (StablePrice)
- Scores: `documentation/scores/overview`, `.../schedule`, `.../soccer-feed`
- Programas Solana: `documentation/programs/{addresses,mainnet,devnet}`
- Exemplos: `.../examples/{fetching-snapshots,streaming-data,onchain-validation,devnet-examples}`
- OpenAPI: `https://txline.txodds.com/docs/docs.yaml`
- Índice completo: `https://txline-docs.txodds.com/llms.txt`

## 4. Autenticação e acesso

- **JWT de convidado**: `POST {host}/auth/guest/start` → `Authorization: Bearer <jwt>`
- **API token**: `POST /api/token/activate` após assinatura on-chain →
  header `X-Api-Token`
- **Tier grátis** (Copa/Amistosos): service levels **1** ou **12**, sem compra de
  TxL — só taxas de transação Solana (devnet tem airdrop grátis). Ideal para
  prototipar.

## 5. Pendências (não bloqueiam o design)

- **Mapa numérico exato dos `statKeys`** (ex.: qual número = gols, cartões,
  escanteios). O exemplo devnet usa `statKeys=1,2,3001,3002`, mas o doc não
  enumera o significado de cada número. Pegar do repositório de exemplos
  devnet ou consultando `/api/scores/stat-validation` na devnet.
- **Latência do dado final** (quando um placar/estatística é considerado
  "final" e imutável para liquidar prêmio). Confirmar na página de streaming.

## Conclusão

Viável. Todas as variáveis da cartela (resultado, placar, cartões, escanteios)
existem no feed e são verificáveis on-chain com o exato tipo de predicado que a
mecânica do jogo exige (trava de resultado + soma de acertos). Seguimos para o
design.
