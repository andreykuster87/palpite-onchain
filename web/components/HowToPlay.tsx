"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Guia "Como jogar" — passo a passo da aposta. Aparece na fase de montar e é
 * dispensável (o page guarda o flag). Ajuda quem chega novo (demo).
 *
 * Interativo por CLIQUE/TOQUE (funciona igual no desktop e no mobile): tocar num
 * passo rola até o alvo daquela ação e mostra um ANEL + SETA apontando pro lugar
 * certo. (Hover não é usado: rolar a página movia o próprio guia de baixo do
 * cursor e disparava uma tempestade de mouseenter/leave — travava feio.) Os
 * alvos são marcados com `data-guide="jogo|resultado|palpites|selar|bilhetes"`.
 */
const STEPS = [
  {
    n: "1",
    key: "jogo",
    icon: "🗓️",
    title: "Escolha o jogo",
    desc: "No seletor de partidas ali em cima.",
  },
  {
    n: "2",
    key: "resultado",
    icon: "🎯",
    title: "Crave o resultado",
    desc: "A trava (1X2). Errou aqui, o bilhete zera.",
  },
  {
    n: "3",
    key: "palpites",
    icon: "🎲",
    title: "Monte os palpites",
    desc: "Variáveis-meme por setor: 📊 Estatísticas · 👑 Craques · 🤡 Zoeira.",
  },
  {
    n: "4",
    key: "selar",
    icon: "🔒",
    title: "Sele o palpite",
    desc: "Selado, a bola rola e cada palpite confirma ao vivo até o resultado.",
  },
  {
    n: "5",
    key: "bilhetes",
    icon: "🏆",
    title: "Concorra nos bolões",
    desc: "Em “Meus bilhetes”, abra o bilhete e escolha o(s) bolão(ões). O mesmo bilhete pode disputar vários!",
  },
];

export function HowToPlay({ onDismiss }: { onDismiss: () => void }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ao ativar um passo: rola o alvo pra tela e acompanha o scroll (sem rAF).
  useEffect(() => {
    if (!activeKey) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-guide="${activeKey}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    // Coloca o TOPO do alvo ~96px abaixo do topo (espaço pra seta). Instantâneo:
    // o scroll suave era interrompido e ficava a meio caminho.
    window.scrollTo({
      top: Math.max(0, window.scrollY + el.getBoundingClientRect().top - 96),
    });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // Some sozinho depois de um tempo (bom pro toque no mobile).
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setActiveKey(null), 4500);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [activeKey]);

  useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    []
  );

  const toggle = (key: string) =>
    setActiveKey((cur) => (cur === key ? null : key));

  return (
    <div className="reveal relative border border-gold-400/30 bg-gold-400/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-sm uppercase tracking-[0.2em] text-gold-400">
          Como jogar · passo a passo
        </span>
        <button
          onClick={onDismiss}
          aria-label="Fechar guia"
          className="font-mono text-[10px] uppercase tracking-widest text-chalk/40 transition hover:text-chalk"
        >
          entendi ✕
        </button>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n}>
            <button
              type="button"
              onClick={() => toggle(s.key)}
              className={`flex w-full gap-2.5 border p-3 text-left transition ${
                activeKey === s.key
                  ? "border-gold-400 bg-gold-400/10"
                  : "border-chalk/10 bg-night-950/40 hover:border-gold-400/50"
              }`}
            >
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
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2.5 font-mono text-[10px] uppercase tracking-widest text-chalk/30">
        👆 clique ou toque num passo pra ver onde fica
      </p>

      {/* Overlay: anel + seta apontando pro alvo (portal, acompanha o scroll). */}
      {activeKey &&
        rect &&
        createPortal(
          <>
            <div
              className="guide-ring pointer-events-none fixed z-[60]"
              style={{
                left: rect.left - 4,
                top: rect.top - 4,
                width: rect.width + 8,
                height: rect.height + 8,
              }}
            />
            <div
              className="guide-arrow pointer-events-none fixed z-[60] text-3xl"
              style={{ left: rect.left + rect.width / 2, top: rect.top - 44 }}
            >
              👇
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
