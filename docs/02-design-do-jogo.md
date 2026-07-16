# Palpite On-Chain — documento de design

_Codinome de trabalho: **Palpite On-Chain** (nome definitivo a definir)_

Um jogo de palpites esportivos estilo Cartola, **on-chain na Solana**, com
liquidação verificável via oráculo TxLINE. Em vez de escalar jogadores, o
usuário prevê **variáveis da partida** (resultado, placar, cartões, escanteios).
A graça: a pontuação é _provably-fair_ — ninguém adultera o placar, porque o
smart contract lê o dado provado criptograficamente.

---

## 1. Mecânica central

Para cada partida (ou rodada de partidas), o usuário preenche uma **cartela**:

1. **Resultado (1X2)** — mandante / empate / visitante. Funciona como **trava**.
2. **Variáveis secundárias** (opcionais, cada uma vale pontos):
   - Placar exato (único palpite exato — é o de maior peso)
   - Total de gols — **mais/menos** de uma linha (ex.: 2.5)
   - Total de cartões — **mais/menos** de uma linha (ex.: 5.5)
   - Total de escanteios — **mais/menos** de uma linha (ex.: 9.5)
   - _(extensível: chutes no gol, pênaltis, etc.)_

> **Por que mais/menos e não número exato?** Cravar o total exato é loteria —
> mata a sensação de habilidade e frustra. Mais/menos contra uma linha é a
> leitura de jogo clássica ("esse clássico vai ter cartão pra caramba"), diverte
> mais e mapeia direto nos predicados de limiar do `validateStatV2` (ex.:
> `total_escanteios > 9`), simplificando a liquidação on-chain. A linha é
> travada na cartela no momento da aposta (entra no commit) e usa sempre
> meia-linha (x.5) para nunca haver empate técnico.

### Regra da trava (o coração do jogo)
- Se o **palpite de resultado estiver errado**, a cartela é **invalidada** e
  pontua **zero** — não importa quantas variáveis secundárias acertou.
- Se o **resultado estiver certo**, a cartela é válida e entra na fase de soma.

### Fase de soma (só com a trava validada)
- Cada variável secundária **acertada**: `+peso` da variável.
- Cada variável secundária **errada**: `−penalidade` da variável.
- Pontuação final = soma líquida (com piso opcional em zero).

> Isso premia **habilidade**: o núcleo é ler o jogo (resultado); as variáveis
> são o desempate. Quanto mais o jogo depende de conhecimento e menos de sorte,
> mais forte o argumento de "jogo de habilidade / fantasy" versus "aposta".

## 2. Sistema de pontuação (parâmetros)

Configurável por liga. Valores iniciais sugeridos (calibrar com playtest):

| Variável            | Formato               | Acerto | Erro (penalidade) |
|---------------------|-----------------------|:------:|:-----------------:|
| Resultado (trava)   | 1X2 exato             |  gate  |  invalida cartela |
| Placar exato        | exato                 |  +25   |        −10        |
| Total de gols       | mais/menos da linha   |  +10   |        −5         |
| Total de cartões    | mais/menos da linha   |  +8    |        −4         |
| Total de escanteios | mais/menos da linha   |  +8    |        −4         |

Decisões travadas com o Andrey:
- **Empate na trava?** Trava = 1/X/2 (com empate) — _assumido como sim_.
- **Piso em zero?** Pontuação pode ficar negativa? — _assumido: piso em 0_.
- **Formato das variáveis** (2026-07-16): mais/menos (over/under) contra linha
  da partida, não número exato — mais divertido e menos loteria. Linhas em
  meia-unidade (x.5); no futuro, derivadas do feed de odds do TxLINE.
- **Desempate** de ranking (mesma pontuação): menor erro agregado → data/hora da
  submissão.

A implementação de referência desses parâmetros está em
`web/lib/scoring.mjs` (motor puro e testado).

## 3. Formatos de liga

- **Liga pública** com buy-in fixo → pool de prêmios rateado ao(s) topo(s).
- **Liga privada** (amigos) com código de convite.
- **Rodada única** (uma partida) ou **temporada** (soma de rodadas).
- Distribuição de prêmio: _winner-takes-all_, top 3, ou top 10% (config).
- Taxa da casa (rake) opcional — parâmetro do contrato.

## 4. Arquitetura técnica

```
┌──────────────┐      escalação/cartela      ┌───────────────────┐
│  Front-end   │ ─────────────────────────▶ │   Supabase         │
│  Next.js     │      leitura de dados       │  (cartelas, ligas, │
│  (Vercel)    │ ◀───────────────────────── │   cache de scores) │
│  + Wallet    │                             └─────────┬─────────┘
│    Adapter   │                                       │ Edge Function
└──────┬───────┘                                       │ (cálculo de pontos)
       │ buy-in / claim                                │
       ▼                                               ▼
┌──────────────────────┐   liquidação    ┌──────────────────────────┐
│  Smart contract       │ ◀────────────── │  Oráculo TxLINE          │
│  Solana (Anchor)      │  validateStatV2 │  (feed + provas Merkle)  │
│  escrow + prêmios     │                 └──────────────────────────┘
└──────────────────────┘
```

**Divisão de responsabilidades**

- **Smart contract (Anchor)**: cria liga, guarda buy-ins em escrow, registra o
  compromisso da cartela (hash), liquida usando o resultado validado pelo
  TxLINE e distribui prêmios. É a fonte da verdade do dinheiro.
- **TxLINE (oráculo)**: fornece resultado/estatísticas e as provas Merkle;
  `validateStatV2` confirma cada variável on-chain.
- **Supabase**: cartelas, ligas, perfis, e **cache** dos scores; Edge Function
  calcula a pontuação de cada cartela por rodada (usando `scoring.mjs`) para o
  ranking em tempo real (o valor autoritativo do prêmio ainda vem do contrato).
- **Front Next.js (Vercel)**: montar cartela, carteira (wallet adapter),
  ranking, e claim de prêmio.

**Anti-trapaça / integridade**
- A cartela é "selada" antes do jogo: on-chain guardamos o **hash** da cartela
  (commit); o conteúdo vai pro Supabase. No fim, revela-se e confere-se o hash
  (commit–reveal) — impede editar palpite depois do apito.
- Pontuação exibida vem do cache, mas o **prêmio** só é liberado contra dado
  validado pelo oráculo.

## 5. Modelo econômico (rascunho)

- **MVP / devnet**: sem dinheiro real — tokens de teste, tier grátis de Copa.
- **Fase token**: buy-in em SOL/USDC ou token próprio; rake da casa como receita.
- **Custos**: assinatura TxLINE (ou tier grátis no início), taxas Solana,
  infra Supabase/Vercel.

## 6. Nota regulatória (importante)

Fantasy/jogo de habilidade **pago com prêmio** pode, dependendo da estrutura,
ser interpretado como aposta/loteria no Brasil. Antes de qualquer versão com
**dinheiro real**, validar o desenho (buy-in, prêmio, elemento de habilidade)
com **advogado de iGaming**. O design orientado a habilidade (trava de
resultado + variáveis) ajuda o enquadramento, mas não é garantia. Não é
aconselhamento jurídico.

## 7. Roadmap sugerido

1. **Fase 0 — Núcleo (feito/atual)**: motor de pontuação testado + integração
   TxLINE (auth, snapshots, validação) em devnet.
2. **Fase 1 — Protótipo jogável**: front de montar cartela + Supabase + cálculo
   de ranking, ainda sem contrato (pontuação off-chain para provar diversão).
3. **Fase 2 — On-chain**: contrato Anchor de liga/escrow + liquidação via
   `validateStatV2` em devnet.
4. **Fase 3 — Piloto**: tier grátis Copa/Amistosos, ligas privadas, playtest de
   pontuação.
5. **Fase 4 — Dinheiro real**: revisão jurídica, KYC se necessário, mainnet.
