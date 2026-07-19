# Bot do Telegram — plano (próxima sessão)

_Criado em 2026-07-19. O 4Line On-Chain hoje é 100% LOCAL (sem backend). Um bot
do Telegram EXIGE servidor (token secreto + vínculo usuário↔chat_id + envio
agendado) — é o gatilho natural pro primeiro backend._

## É possível? Sim

- **Bot API do Telegram é grátis.** Token via @BotFather.
- **Msgs de motivação** = Vercel Cron (agenda) → fácil.
- **Placar da aposta**: no "selar" e no "resultado final" = fácil (dispara no
  evento). **Ao vivo em tempo real** = precisa do stream do oráculo
  (`/scores/stream`) + worker; começar mandando no selar + no fim.

## Arquitetura recomendada (usa o que já temos)

- **Webhook**: rota Next `/api/telegram/webhook` (POST) na Vercel — recebe
  comandos (`/start`, `/link`, `/parar`). Registrar com `setWebhook`.
- **Envio**: helper server `sendTelegram(chatId, text)` (Bot API `sendMessage`);
  token só no servidor (env `TELEGRAM_BOT_TOKEN`).
- **Store**: Supabase (novo, ~$10/mês, ou reusar NorthWindy) OU Vercel KV/Postgres
  — tabela `telegram_links` (userId ↔ chatId, consentimento, opt-out) e, se for o
  caso, snapshots de aposta pro placar.
- **Agenda**: Vercel Cron pras mensagens de motivação (ex.: 1×/dia).
- Env vars na Vercel (manual do Andrey): `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_WEBHOOK_SECRET`, creds do store.

## Pré-requisitos (manual do Andrey, antes de codar)

1. Criar o bot no **@BotFather** → guardar o `TELEGRAM_BOT_TOKEN`.
2. Escolher o store (Supabase novo vs Vercel KV vs reusar NorthWindy).
3. Adicionar as env vars na Vercel + redeploy.

## Tarefas (próxima sessão)

1. **Store + env**: subir o store (tabela `telegram_links`) + env vars na Vercel.
2. **Webhook** `/api/telegram/webhook`: valida secret, trata `/start`, `/link
   <código>`, `/parar`; registra o webhook apontando pra
   `4line-onchain.vercel.app/api/telegram/webhook`.
3. **Vínculo (linking)** no app: botão "Conectar Telegram" gera deep-link
   `t.me/<bot>?start=<userId>`; o `/start` grava chatId↔userId; app mostra
   "✓ conectado".
4. **Helper `sendTelegram`** (token só no servidor) + teste de envio.
5. **Placar da aposta**: ao selar e no resultado final, mandar msg com placar +
   pontos + posição no ranking. (In-play real = stream do oráculo + worker,
   depois.)
6. **Motivação (cron)**: Vercel Cron diário → msg motivacional pros vinculados,
   com templates; respeita `/parar`.
7. **Consentimento/LGPD**: opt-in explícito, `/parar` (unsubscribe), nunca vazar
   token, rate-limit básico.
8. **Testar ponta a ponta**: vincular → receber placar → receber motivação →
   descadastrar.

## Frase pra iniciar a sessão do bot (cole isto)

> Retomar o **4Line On-Chain** (`C:\Coach`, repo `andreykuster87/4line`, no ar em
> `4line-onchain.vercel.app`, push em master = deploy Vercel). Hoje é **100%
> LOCAL** (sem backend). **Objetivo desta sessão: bot do Telegram** — mandar o
> **placar da aposta** (no selar e no resultado final) e **mensagens de
> motivação** (cron). Isso EXIGE o **primeiro backend**: webhook Next
> `/api/telegram/webhook` + `sendTelegram` (token só no servidor) + store do
> vínculo usuário↔chat_id (Supabase novo OU Vercel KV) + **Vercel Cron** pra
> motivação. **Pré-requisito manual do Andrey:** criar o bot no @BotFather
> (`TELEGRAM_BOT_TOKEN`) + env vars na Vercel. Fluxo de vínculo: botão "Conectar
> Telegram" no app → deep-link `t.me/<bot>?start=<userId>` → `/start` grava o
> chatId. In-play em tempo real depende do stream do oráculo (`/scores/stream`) +
> worker — começar mandando no selar + no fim. Ler `docs/06-telegram-bot.md`.
> Identidade local em `web/lib/identity.ts` (userId anônimo já existe). **NÃO
> quebrar o que está no ar.**

## Observações

- Custo: Bot API grátis; Vercel Cron (Hobby tem limite; Pro libera mais);
  Supabase ~$10/mês (ou Vercel KV / reusar NorthWindy).
- O `userId` anônimo do app (`palpite:identity:v1`) já serve de chave do vínculo.
- Este backend é o MESMO que habilita os **bolões reais** (ranking cross-user,
  aplicar as regras que hoje são só exibidas) — dá pra fazer o bot primeiro
  (store mínimo) e evoluir pro backend completo depois.
