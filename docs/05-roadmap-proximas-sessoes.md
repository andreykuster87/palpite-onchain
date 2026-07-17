# Roadmap — próximas sessões (4Line On-Chain)

_Decisões fechadas com o Andrey em 2026-07-17. Este doc é o plano de execução;
implementar na próxima sessão. Nada aqui foi codado ainda._

---

## 0. Antes de tudo: fechar a submissão do hackathon

O deadline é **2026-07-18 23:59**. As melhorias abaixo são v2 — só entram se
sobrar tempo antes disso. Prioridade absoluta continua sendo:

- [ ] Gravar vídeo demo ≤5min (roteiro em `docs/04-roteiro-video.md`)
- [ ] Submeter nos 2 links (trilha global Consumer + Superteam Brasil)

App já no ar: https://4line-onchain.vercel.app · repo público · oráculo ativo.

---

## 1. Acesso: Wallet Phantom (identidade + commit assinado)

**Decisão:** o jogador entra conectando a Phantom. Sem dinheiro, sem escrow,
sem transação — apenas identidade + assinatura de mensagem.

**Escopo:**
- Botão "Conectar Phantom" (Solana wallet-adapter). Avaliar wallet-adapter
  genérico (Solflare/Backpack) vs só Phantom.
- Ao **selar a cartela**, chamar `signMessage()` com o conteúdo da cartela →
  a assinatura é o **commit-reveal de verdade** (prova que aquela wallet fez
  aquela cartela antes do apito). Grátis, não gasta SOL.
- Ranking passa a usar o endereço da wallet como identidade (em vez de "Você").
- Exibir a assinatura/wallet no bilhete como selo de prova.

**Decisões em aberto:**
- Wallet obrigatória ou opcional (atrito do judge testar vs coesão)?
- Compatibilidade wallet-adapter × Next 15.5 / React 19 — checar peer-deps.

**Fora deste nível:** liga compartilhada real entre pessoas (isso precisa de
backend — ver Fase futura Supabase). Armazenamento segue local por enquanto.

---

## 2. Pontuação em camadas de dificuldade (redesign do motor)

**Princípio (Andrey):** recompensa proporcional à improbabilidade — quanto mais
difícil acertar, mais vale. Variáveis são **opt-in**: o jogador escolhe quais
palpitar.

**Assimetria base +5 / −3:** ponto de equilíbrio em ~37,5% de acerto — chute no
escuro perde no longo prazo, palpite informado ganha. Reforça "jogo de
habilidade".

**Tabela de pontuação v2 (calibrar com playtest):**

| Camada | Exemplos | Acerto | Erro |
|---|---|:---:|:---:|
| Fácil (over/under ~50/50) | total de gols, cartões, escanteios | +5 | −3 |
| Média (mais específico) | total exato, ambas marcam + resultado, gols por tempo | +8 | −3 |
| Difícil (raro) | **placar exato** | **+15** | **−5** |

- **Trava 1X2** permanece: errou o resultado, cartela zera (gate).
- **Penalidade do placar exato (−5)** maior de propósito: encarece o "chute
  barato" e faz o jogador pensar. Calibrar.
- Tudo isso é troca de valores em `DEFAULT_CONFIG` — `scoreCartela` já suporta
  peso/penalidade por variável. Adicionar o conceito de "camada" e o
  multiplicador (abaixo).

---

## 3. Cardápio de variáveis expandido

Ir de ~5 para 15+ variáveis, todas liquidáveis on-chain.

**Confirmado no feed (statKeys 1–8 vistos no payload real):**
- Resultado 1X2, placar exato, total de gols, total de cartões, total de
  escanteios, cartão vermelho sim/não.

**Por tempo — o grande desbloqueio (prefixos 1000=1ºT, 3000=2ºT confirmados):**
- Qualquer variável acima por período: "+1.5 gols no 1º tempo", "mais
  escanteios no 2º tempo", "cartão até o intervalo".

**Derivados dos gols (sem dado novo):**
- Ambas marcam (BTTS), clean sheet, vitória por 2+ de diferença.

**Documentado, A CONFIRMAR o statKey na devnet:**
- Chutes no gol, total de chutes, faltas, impedimentos, pênaltis
  (marcado/perdido), decisões de VAR.

**NÃO disponível (feed é por time, não por jogador) — não implementar:**
- Melhor em campo, artilheiro do jogo, assistências. Quebraria o provably-fair.

**UX:** não sobrecarregar a cartela. 3–4 variáveis em destaque + "modo avançado"
para o resto. Jogador escolhe o que palpitar.

---

## 4. Jogo-destaque com multiplicador

- Marcar uma partida da rodada como "destaque" (o clássico) → pontos **×2**
  naquela cartela (multiplica a camada toda).
- Não precisa de dado novo — é regra de jogo. Adiciona tensão estratégica:
  arrisca mais no jogo que você domina.
- Implementar como flag na fixture + fator no `scoreCartela`.

---

## 5. Fase 2 de pontuação: odds-weighted (verificável)

A evolução do princípio "improvável vale mais", automática e provada:

- O TxLINE tem feed de **odds** (StablePrice). Derivar a pontuação da odd real:
  palpite improvável (odd alta) = mais pontos, **provado pelo oráculo**.
- Resolve de vez o risco de "farmar" variáveis fáceis (ex.: "+0.5 gols" acerta
  ~95% das vezes) — a pontuação vira função da probabilidade real do mercado.
- Mitigação intermediária até lá: **curar as linhas** para serem ~50/50.

---

## 6. Fases futuras (pós-hackathon)

- **Supabase:** ligas compartilhadas reais (várias pessoas, um leaderboard ao
  vivo, código de convite). É o que falta pro "bolão entre amigos" completo.
- **On-chain settlement (trilha Prediction Markets):** contrato Anchor de
  escrow + `validateStatV2` liquidando prêmios contra prova de Merkle. Esboço
  já existe em `contracts/programs/liga/src/lib.rs`.
- **Dinheiro real:** revisão jurídica de iGaming + KYC + mainnet.

---

## Comportamento já pronto (nada a fazer)

- **Final ESP × ARG (19/07):** o app consulta o oráculo a cada apito; hoje cai
  em simulação rotulada, mas assim que o TxLINE publicar o resultado real, o
  site mostra o placar de verdade automaticamente. Ótimo argumento pro vídeo.
