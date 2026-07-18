"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Guia rápido "Como jogar" — 4 passos da aposta. Aparece na fase de montar o
 * bilhete e é dispensável (o page guarda o flag). Ajuda quem chega novo (demo).
 *
 * Interativo: passar o mouse (desktop) ou tocar (mobile) num passo rola até o
 * alvo daquela ação e mostra um ANEL + SETA apontando pro lugar certo. Os alvos
 * são marcados com `data-guide="jogo|resultado|palpites|selar"` no page/builder.
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
    title: "Sele e acompanhe",
    desc: "A bola rola e cada palpite confirma ao vivo até o resultado final.",
  },
];

export function HowToPlay({ onDismiss }: { onDismiss: () => void }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enquanto um passo está ativo, segue o alvo (mesmo durante o scroll suave).
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
    // Coloca o TOPO do alvo ~96px abaixo do topo da tela — deixa espaço pra
    // seta acima (alvos altos ficariam com o topo fora da tela no 'center').
    // Scroll instantâneo: o suave era interrompido pelos re-renders do rAF.
    const target = window.scrollY + el.getBoundingClientRect().top - 96;
    window.scrollTo({ top: Math.max(0, target) });
    const tick = () => {
      setRect(el.getBoundingClientRect());
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeKey]);

  useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    []
  );

  // hover (desktop) mostra enquanto está em cima; clique/tap (mobile) trava por ~3s.
  const show = (key: string, lock: boolean) => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setActiveKey(key);
    if (lock) clearTimer.current = setTimeout(() => setActiveKey(null), 3000);
  };

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
          <li key={s.n}>
            <button
              type="button"
              onMouseEnter={() => show(s.key, false)}
              onMouseLeave={() => setActiveKey((k) => (k === s.key ? null : k))}
              onClick={() => show(s.key, true)}
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
        👆 passe o mouse ou toque num passo pra ver onde fica
      </p>

      {/* Overlay: anel + seta apontando pro alvo (portal, segue o elemento). */}
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
