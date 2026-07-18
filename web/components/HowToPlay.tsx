"use client";

/**
 * Guia rápido "Como jogar" — 4 passos da aposta. Aparece na fase de montar o
 * bilhete e é dispensável (o page guarda o flag). Ajuda quem chega novo (demo).
 */
const STEPS = [
  {
    n: "1",
    icon: "🗓️",
    title: "Escolha o jogo",
    desc: "No seletor de partidas ali em cima.",
  },
  {
    n: "2",
    icon: "🎯",
    title: "Crave o resultado",
    desc: "A trava (1X2). Errou aqui, o bilhete zera.",
  },
  {
    n: "3",
    icon: "🎲",
    title: "Monte os palpites",
    desc: "Variáveis-meme por setor: 📊 Estatísticas · 👑 Craques · 🤡 Zoeira.",
  },
  {
    n: "4",
    icon: "🔒",
    title: "Sele e acompanhe",
    desc: "A bola rola e cada palpite confirma ao vivo até o resultado final.",
  },
];

export function HowToPlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="reveal relative border border-gold-400/30 bg-gold-400/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-sm uppercase tracking-[0.2em] text-gold-400">
          Como jogar · em 4 passos
        </span>
        <button
          onClick={onDismiss}
          aria-label="Fechar guia"
          className="font-mono text-[10px] uppercase tracking-widest text-chalk/40 transition hover:text-chalk"
        >
          entendi ✕
        </button>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-2.5 border border-chalk/10 bg-night-950/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-gold-400/50 font-mono text-xs font-bold text-gold-400">
              {s.n}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">{s.icon}</span>
                <span className="font-display text-[13px] uppercase tracking-wide text-chalk">
                  {s.title}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-chalk/45">
                {s.desc}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
