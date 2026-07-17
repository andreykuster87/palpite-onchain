# Roadmap — próximas sessões (4Line On-Chain)

_Decisões fechadas com o Andrey em 2026-07-17. Re-priorizado no mesmo dia contra
os **critérios oficiais de julgamento** da trilha Consumer & Fan Experiences.
Este doc é o plano de execução — nada aqui foi codado ainda._

---

## 0. Prioridade absoluta: fechar a submissão

Deadline **2026-07-18 23:59** (confirmar fuso — listing é Superteam Brasil).

- [ ] Gravar vídeo demo ≤5min (roteiro em `docs/04-roteiro-video.md`)
- [ ] Submeter nos 2 links (trilha global Consumer + Superteam Brasil)

Já pronto: app no ar em https://4line-onchain.vercel.app · repo público ·
oráculo TxLINE ativo em produção.

> **Os judges avaliam pesado pelo vídeo.** Como os jogos terminam perto/depois do
> deadline, pode não haver atividade ao vivo durante a análise — o vídeo é que
> tem que mostrar a experiência, o fluxo do usuário e a funcionalidade central.

---

## Onde estamos vs. os critérios oficiais (auditado em 17/07)

| Critério | Status | Observação |
|---|:---:|---|
| Fan Accessibility & UX | 🟡 | Visual polido, zero atrito (não exige wallet). Mas single-player, sem social, sem motivo pra voltar. |
| **Real-Time Responsiveness** | ❌ | **Maior buraco.** Zero live update no código (sem `setInterval`/`EventSource`/`/stream`). O "apitar" é botão manual. |
| Originality & Value Creation | ✅ | Trava 1X2 + variáveis opt-in é mecânica nova, não repackage de feed. |
| Commercial & Monetization Path | 🟡 | Existe no design doc (rake, buy-in), mas não aparece no app nem na narrativa. |
| Completeness & Execution | ✅ | Ponta a ponta, deployado, testado, oráculo real. |

---

## 1. 🔴 Live / in-play (maior alavanca)

**Por quê:** ataca diretamente o critério que mais perdemos. O critério é
explícito sobre *"update fluidly based on what is actively unfolding on the
pitch"* — hoje somos um app de antes/depois, não de **durante**.

**Janela de ouro:** a decisão de **3º lugar FRA × ENG é 18/07 às 21:00 UTC
(18h de Brasília)** — antes do deadline das 23:59. Dá pra **gravar o vídeo demo
durante um jogo real**, com dado do TxLINE chegando ao vivo na tela. É o
argumento mais forte possível, no artefato que mais pesa.

**Escopo:**
- Consumir o stream do TxLINE (`/scores/stream`, SSE — ver
  `subscription_scores.ts` nos exemplos do `txodds/tx-on-chain`), ou polling do
  `/scores/snapshot/{id}` como fallback simples.
- Placar/estatísticas atualizando sozinhos durante a partida.
- Pontuação da cartela recalculando ao vivo conforme o jogo anda ("você está
  ganhando +13 agora") — o motor `scoreCartela` é puro, roda a cada update.
- Ranking se reordenando ao vivo.
- Estado da partida real (em andamento / encerrado) em vez do botão "apitar"
  manual — manter o apito só como modo replay/demo para jogos já encerrados.

**Pendência conhecida:** `GameState` do snapshot vem "scheduled" mesmo em jogo
encerrado — não confiar nele; usar `Seq`/timestamps ou o stream. Ver
[[gotchas-txline-api]].

---

## 2. 🟠 Linhas vindas do feed de odds (corrige furo real)

**Por quê:** o próprio "About TxLINE" se vende como *"real-time sports data and
**consensus betting odds**"*. Hoje usamos só metade: as linhas over/under
(2.5 / 4.5 / 9.5) são **constantes inventadas** em `web/lib/copa.ts`
(`KNOCKOUT_LINES`), não vêm do oráculo. Um judge da TxODDS provavelmente nota.

**Escopo:**
- Consumir `/odds/snapshot/{fixtureId}` (StablePrice) e derivar as linhas reais
  de cada partida.
- Exibir a linha como dado do oráculo, não como número mágico.
- **Bônus:** destrava a pontuação odds-weighted (item 4, fase 2).

---

## 3. 🟡 Narrativa de monetização (barato, alto retorno)

**Por quê:** é um critério inteiro onde estamos em cima do muro, e custa quase
nada consertar — é comunicação, não código.

**Escopo:**
- Surfacear no vídeo e no `docs/03-submissao-hackathon.md`: ligas com buy-in +
  rake da casa, ligas privadas patrocinadas, white-label para casas/mídia
  esportiva, tier grátis → premium.
- Opcional: um teaser discreto na UI ("liga com prêmio — em breve").

---

## 4. 🟢 Pontuação em camadas + cardápio de variáveis

_(Design fechado com o Andrey — aprofunda "Originality", que já é forte.)_

**Princípio (Andrey):** recompensa proporcional à improbabilidade. Variáveis são
**opt-in** — o jogador escolhe quais palpitar.

**Assimetria +5 / −3:** equilíbrio em ~37,5% de acerto → chute no escuro perde
no longo prazo, palpite informado ganha. Reforça "jogo de habilidade".

| Camada | Exemplos | Acerto | Erro |
|---|---|:---:|:---:|
| Fácil (over/under ~50/50) | total de gols, cartões, escanteios | +5 | −3 |
| Média (mais específico) | total exato, ambas marcam + resultado, gols por tempo | +8 | −3 |
| Difícil (raro) | **placar exato** | **+15** | **−5** |

- **Trava 1X2** permanece: errou o resultado, cartela zera.
- Penalidade do placar exato (−5) maior de propósito: encarece o chute barato.
- É troca de valores em `DEFAULT_CONFIG` + conceito de camada/multiplicador —
  `scoreCartela` já suporta peso/penalidade por variável.

### Cardápio de variáveis (ir de ~5 para 15+)

| Camada | Variáveis | Status |
|---|---|---|
| Confirmado no feed | 1X2, placar exato, total de gols, cartões, escanteios, vermelho sim/não | ✅ statKeys 1–8 vistos no payload real |
| **Por tempo** (grande desbloqueio) | qualquer uma acima por período: "+1.5 gols no 1ºT", "escanteios no 2ºT", "cartão até o intervalo" | ✅ prefixos confirmados (1000=1ºT, 3000=2ºT) |
| Derivados dos gols | ambas marcam (BTTS), clean sheet, vitória por 2+ | ✅ calculável do que já temos |
| A confirmar na devnet | chutes no gol, total de chutes, faltas, impedimentos, pênaltis, VAR | 🟡 doc cita, statKey não visto |
| **NÃO implementar** | melhor em campo, artilheiro, assistências | ❌ feed é por time, não por jogador — quebraria o provably-fair |

**UX:** não sobrecarregar. 3–4 variáveis em destaque + "modo avançado" pro resto.

### Jogo-destaque (multiplicador)

- Marcar uma partida da rodada como "destaque" → pontos **×2**. Não precisa de
  dado novo, é regra de jogo. Adiciona tensão: arrisca mais no jogo que domina.

### Fase 2: odds-weighted (depende do item 2)

- Derivar a pontuação da **odd real** do feed: palpite improvável = mais pontos,
  **provado pelo oráculo**. Automatiza o princípio "improvável vale mais".
- Resolve o risco de **farmar** variáveis fáceis (ex.: "+0.5 gols" acerta ~95%).
- Mitigação até lá: curar as linhas para serem ~50/50.

---

## 5. ⚪ Wallet Phantom (desceu de prioridade)

**Por que desceu:** não aparece em **nenhum** critério de julgamento da trilha
Consumer. E sem wallet o judge testa o app em 2 segundos — o que na verdade
**ajuda** o critério de Fan Accessibility. Continua sendo boa ideia de produto,
mas não é o melhor uso das horas antes do deadline.

**Escopo (quando for):** conectar Phantom (wallet-adapter) = identidade;
`signMessage()` ao selar a cartela = commit-reveal real (grátis, sem transação,
sem gastar SOL); wallet no ranking; assinatura exibida no bilhete como prova.

**Decisões em aberto:** obrigatória vs opcional; compatibilidade wallet-adapter
× Next 15.5 / React 19 (peer-deps).

---

## 6. Fases futuras (pós-hackathon)

- **Supabase:** ligas compartilhadas reais (várias pessoas, leaderboard ao vivo,
  código de convite). É o que falta pro "bolão entre amigos" completo — e ataca
  o "abriria regularmente" do critério de Fan Accessibility.
- **On-chain settlement (trilha Prediction Markets):** contrato Anchor de escrow
  + `validateStatV2` liquidando contra prova de Merkle. Esboço em
  `contracts/programs/liga/src/lib.rs`.
- **Dinheiro real:** revisão jurídica de iGaming + KYC + mainnet.

---

## Comportamento já pronto (nada a fazer)

- **Final ESP × ARG (19/07):** o app consulta o oráculo a cada apito; hoje cai em
  simulação rotulada, mas assim que o TxLINE publicar o resultado real, o site
  mostra o placar de verdade automaticamente — sem tocar em código.
