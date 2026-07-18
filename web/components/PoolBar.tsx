"use client";

import { useState, useEffect } from "react";
import { type Pool, BUY_IN_OPTIONS, moneyLabel } from "@/lib/pools";
import type { Identity } from "@/lib/identity";
import { Ranking, type RankRow } from "@/components/Ranking";

interface PoolBarProps {
  pools: Pool[];
  activePoolId: string;
  identity: Identity;
  /** Participantes simulados do bolão ativo (roster estável por código). */
  members: string[];
  /** Ranking do bolão ativo (mesmas linhas do sidebar) — usado no painel. */
  standings: RankRow[];
  /** Ranking simulado (antes do apito)? Mostra o selo "ao vivo" no painel. */
  live: boolean;
  copiedPoolId: string | null;
  onSelect: (poolId: string) => void;
  onCreate: (name: string, buyIn: number) => void;
  onJoinCode: (code: string) => void;
  onLeave: (poolId: string) => void;
  onSetNickname: (name: string) => void;
  onCopyInvite: (poolId: string) => void;
}

/** Prêmio total (buy-in × participantes) e divisão 🥇50/🥈30/🥉20 (simulado). */
function prizeBreakdown(buyIn: number, participants: number) {
  const pot = buyIn * participants;
  return {
    pot,
    first: Math.floor(pot * 0.5),
    second: Math.floor(pot * 0.3),
    third: Math.floor(pot * 0.2),
  };
}

const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;

type Panel = "none" | "menu" | "create" | "join" | "nick" | "members";

export function PoolBar({
  pools,
  activePoolId,
  identity,
  members,
  standings,
  live,
  copiedPoolId,
  onSelect,
  onCreate,
  onJoinCode,
  onLeave,
  onSetNickname,
  onCopyInvite,
}: PoolBarProps) {
  const [panel, setPanel] = useState<Panel>("none");
  const [nameInput, setNameInput] = useState("");
  const [buyInInput, setBuyInInput] = useState<number>(0);
  const [codeInput, setCodeInput] = useState("");
  const [nickInput, setNickInput] = useState(identity.nickname);
  // Painel do bolão (nome clicado): premiação + ranking + participantes.
  const [showPanel, setShowPanel] = useState(false);

  const active = pools.find((p) => p.id === activePoolId) ?? pools[0];
  const hasNick = identity.nickname.trim().length > 0;

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? "none" : p));

  // Painel do bolão: fecha com Esc + trava o scroll do fundo.
  useEffect(() => {
    if (!showPanel) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setShowPanel(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showPanel]);

  const participants = members.length + 1; // simulados + você
  const prize = prizeBreakdown(active.buyIn, participants);

  function submitCreate() {
    const nm = nameInput.trim();
    if (!nm) return;
    onCreate(nm, buyInInput);
    setNameInput("");
    setBuyInInput(0);
    setPanel("none");
  }

  function submitJoin() {
    const cd = codeInput.trim();
    if (!cd) return;
    onJoinCode(cd);
    setCodeInput("");
    setPanel("none");
  }

  function submitNick() {
    const nk = nickInput.trim();
    if (!nk) return;
    onSetNickname(nk);
    setPanel("none");
  }

  return (
    <div
      className="reveal mb-6 border border-chalk/12 bg-night-900/70"
      style={{ animationDelay: "0.04s" }}
    >
      {/* Linha principal */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-grass-400">
          bolão
        </span>

        {/* Bolão ativo: nome abre o painel; ▾ abre o menu de troca */}
        <div className="flex items-stretch border border-chalk/15 bg-night-800">
          <button
            onClick={() => setShowPanel(true)}
            title="Abrir painel do bolão"
            className="flex items-center gap-2 px-3 py-1.5 text-left transition hover:bg-night-700"
          >
            <span className="text-sm">{active.isPlatform ? "🌎" : "🎟️"}</span>
            <span className="font-display text-sm uppercase tracking-wider text-chalk">
              {active.name}
            </span>
            {!active.isPlatform && (
              <span className="font-mono text-[10px] tracking-widest text-gold-400">
                #{active.code}
              </span>
            )}
          </button>
          <button
            onClick={() => toggle("menu")}
            title="Trocar de bolão"
            className="border-l border-chalk/15 px-2 text-[10px] text-chalk/50 transition hover:bg-night-700 hover:text-chalk"
          >
            ▾
          </button>
        </div>

        <div className="flex-1" />

        {/* Apelido */}
        <button
          onClick={() => {
            setNickInput(identity.nickname);
            toggle("nick");
          }}
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-chalk/50 transition hover:text-chalk"
          title="Seu apelido nos bolões"
        >
          <span className="text-chalk/35">você:</span>
          <span className={hasNick ? "text-gold-400" : "text-danger"}>
            {hasNick ? identity.nickname : "definir apelido"}
          </span>
          <span className="text-chalk/30">✎</span>
        </button>

        {/* Ações */}
        <button
          onClick={() => toggle("create")}
          className="border border-gold-400/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-gold-400 transition hover:border-gold-400 hover:bg-gold-400/10"
        >
          ＋ Criar
        </button>
        <button
          onClick={() => toggle("join")}
          className="border border-chalk/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-chalk-dim transition hover:border-chalk/45 hover:text-chalk"
        >
          Entrar por código
        </button>
      </div>

      {/* Linha de info do bolão ativo: participantes + (privado) convite/sair */}
      {panel === "none" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-chalk/12 px-4 py-2.5">
          <button
            onClick={() => toggle("members")}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-chalk/50 transition hover:text-chalk"
          >
            <span>👥</span>
            <span className="text-gold-400">{members.length + 1}</span>
            participantes
            <span className="text-chalk/30">▾</span>
          </button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/25">
            · inscrição{" "}
            <span className={active.buyIn > 0 ? "text-gold-400" : "text-grass-400"}>
              {moneyLabel(active.buyIn)}
            </span>
          </span>
          {!active.isPlatform && (
            <>
              <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/25">
                · código <span className="text-gold-400">#{active.code}</span>
              </span>
              <div className="flex-1" />
              <button
                onClick={() => onCopyInvite(active.id)}
                className="border border-gold-400/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-gold-400 transition hover:border-gold-400 hover:bg-gold-400/10"
              >
                {copiedPoolId === active.id ? "✓ link copiado" : "🔗 Convidar"}
              </button>
              <button
                onClick={() => onLeave(active.id)}
                className="font-mono text-[10px] uppercase tracking-widest text-chalk/35 transition hover:text-danger"
              >
                Sair
              </button>
            </>
          )}
          {active.isPlatform && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/25">
              · público · todo mundo entra
            </span>
          )}
        </div>
      )}

      {/* Participantes */}
      {panel === "members" && (
        <div className="border-t border-dashed border-chalk/12 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/40">
              participantes · {active.name}
            </span>
            {!active.isPlatform && (
              <button
                onClick={() => onCopyInvite(active.id)}
                className="border border-gold-400/60 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-gold-400 transition hover:border-gold-400 hover:bg-gold-400/10"
              >
                {copiedPoolId === active.id ? "✓ copiado" : "🔗 Convidar"}
              </button>
            )}
          </div>
          <ul className="flex flex-wrap gap-1.5">
            <li className="flex items-center gap-1.5 border border-gold-400/60 bg-gold-400/[0.08] px-2.5 py-1">
              <span className="text-xs">🧑</span>
              <span className="font-mono text-[11px] text-chalk">
                {hasNick ? identity.nickname : "você"}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-gold-400">
                você
              </span>
            </li>
            {members.map((name) => (
              <li
                key={name}
                className="flex items-center gap-1.5 border border-chalk/12 px-2.5 py-1"
              >
                <span className="text-xs">🎭</span>
                <span className="font-mono text-[11px] text-chalk-dim">{name}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 font-mono text-[10px] leading-relaxed text-chalk/30">
            {active.isPlatform
              ? "Participantes simulados (local). Ranking real da galera entra com o backend."
              : "Simulados por enquanto (local). Amigos que abrem seu link entram no bolão no aparelho deles — aparecerem aqui exige o backend."}
          </p>
        </div>
      )}

      {/* ---------- Painéis ---------- */}

      {/* Lista de bolões */}
      {panel === "menu" && (
        <div className="border-t border-dashed border-chalk/12 px-4 py-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-chalk/40">
            meus bolões
          </div>
          <ul className="space-y-1">
            {pools.map((p) => {
              const isActive = p.id === active.id;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onSelect(p.id);
                      setPanel("none");
                    }}
                    className={`flex w-full items-center gap-2 border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-gold-400/70 bg-gold-400/[0.06]"
                        : "border-chalk/10 hover:border-chalk/30"
                    }`}
                  >
                    <span className="text-sm">{p.isPlatform ? "🌎" : "🎟️"}</span>
                    <span className="flex-1 font-display text-sm uppercase tracking-wider text-chalk">
                      {p.name}
                    </span>
                    {!p.isPlatform && (
                      <span className="font-mono text-[10px] tracking-widest text-gold-400">
                        #{p.code}
                      </span>
                    )}
                    {isActive && (
                      <span className="font-mono text-[9px] uppercase tracking-widest text-gold-400">
                        ativo
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Criar bolão */}
      {panel === "create" && (
        <PanelForm
          title="Criar bolão"
          hint={
            hasNick
              ? "Dê um nome. Você recebe um código e um link pra convidar a galera."
              : "Escolha seu apelido e o nome do bolão."
          }
        >
          {!hasNick && (
            <input
              autoFocus
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              placeholder="Seu apelido"
              maxLength={24}
              className="w-full border border-chalk/20 bg-night-950 px-3 py-2 font-mono text-sm text-chalk outline-none placeholder:text-chalk/30 focus:border-gold-400/60"
            />
          )}
          <input
            autoFocus={hasNick}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!hasNick && nickInput.trim()) onSetNickname(nickInput.trim());
                submitCreate();
              }
            }}
            placeholder="Nome do bolão (ex.: Firma FC)"
            maxLength={40}
            className="w-full border border-chalk/20 bg-night-950 px-3 py-2 font-mono text-sm text-chalk outline-none placeholder:text-chalk/30 focus:border-gold-400/60"
          />
          {/* Valor da inscrição (buy-in) */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-chalk/40">
              inscrição:
            </span>
            {BUY_IN_OPTIONS.map((v) => (
              <button
                key={v}
                onClick={() => setBuyInInput(v)}
                className={`border px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest transition ${
                  buyInInput === v
                    ? "border-gold-400 bg-gold-400/10 text-gold-400"
                    : "border-chalk/20 text-chalk-dim hover:border-chalk/45 hover:text-chalk"
                }`}
              >
                {moneyLabel(v)}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!hasNick && nickInput.trim()) onSetNickname(nickInput.trim());
                submitCreate();
              }}
              disabled={!nameInput.trim() || (!hasNick && !nickInput.trim())}
              className="border border-gold-400 bg-gold-400 px-5 py-2 font-display text-sm uppercase tracking-widest text-night-950 transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Criar bolão
            </button>
          </div>
        </PanelForm>
      )}

      {/* Entrar por código */}
      {panel === "join" && (
        <PanelForm
          title="Entrar por código"
          hint={
            hasNick
              ? "Digite o código que te passaram (ex.: ABC123)."
              : "Escolha seu apelido e digite o código do bolão."
          }
        >
          {!hasNick && (
            <input
              autoFocus
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              placeholder="Seu apelido"
              maxLength={24}
              className="w-full border border-chalk/20 bg-night-950 px-3 py-2 font-mono text-sm text-chalk outline-none placeholder:text-chalk/30 focus:border-gold-400/60"
            />
          )}
          <div className="flex gap-2">
            <input
              autoFocus={hasNick}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (!hasNick && nickInput.trim()) onSetNickname(nickInput.trim());
                  submitJoin();
                }
              }}
              placeholder="CÓDIGO"
              maxLength={12}
              className="flex-1 border border-chalk/20 bg-night-950 px-3 py-2 font-mono text-sm uppercase tracking-[0.2em] text-chalk outline-none placeholder:tracking-widest placeholder:text-chalk/30 focus:border-gold-400/60"
            />
            <button
              onClick={() => {
                if (!hasNick && nickInput.trim()) onSetNickname(nickInput.trim());
                submitJoin();
              }}
              disabled={!codeInput.trim() || (!hasNick && !nickInput.trim())}
              className="border border-gold-400 bg-gold-400 px-4 py-2 font-display text-sm uppercase tracking-widest text-night-950 transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Entrar
            </button>
          </div>
        </PanelForm>
      )}

      {/* Apelido */}
      {panel === "nick" && (
        <PanelForm title="Seu apelido" hint="É como você aparece nos rankings.">
          <div className="flex gap-2">
            <input
              autoFocus
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNick()}
              placeholder="Ex.: Zé do Palpite"
              maxLength={24}
              className="flex-1 border border-chalk/20 bg-night-950 px-3 py-2 font-mono text-sm text-chalk outline-none placeholder:text-chalk/30 focus:border-gold-400/60"
            />
            <button
              onClick={submitNick}
              disabled={!nickInput.trim()}
              className="border border-gold-400 bg-gold-400 px-4 py-2 font-display text-sm uppercase tracking-widest text-night-950 transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </PanelForm>
      )}

      {/* ---------- Painel do bolão (nome clicado) ---------- */}
      {showPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/85 p-4 backdrop-blur-sm"
          onClick={() => setShowPanel(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            className="relative flex max-h-[88vh] w-full max-w-lg flex-col border-2 border-gold-400 bg-night-900 shadow-[8px_8px_0_rgba(0,0,0,0.6)]"
          >
            {/* Fechar */}
            <button
              onClick={() => setShowPanel(false)}
              aria-label="Fechar"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center border border-night-950/30 bg-night-950/20 font-mono text-sm text-night-950 transition hover:bg-night-950/40"
            >
              ✕
            </button>

            {/* Cabeçalho */}
            <div className="bg-gold-400 px-6 pb-4 pt-5 text-night-950">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-night-950/70">
                <span>{active.isPlatform ? "🌎 bolão público" : "🎟️ bolão"}</span>
                {!active.isPlatform && <span>· #{active.code}</span>}
              </div>
              <div className="mt-1 font-display text-3xl uppercase leading-none tracking-wide">
                {active.name}
              </div>
              <div className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-night-950/60">
                inscrição {moneyLabel(active.buyIn)} · {participants} participantes
              </div>
            </div>

            {/* Picote */}
            <div className="relative flex items-center">
              <span className="-ml-2.5 h-5 w-5 rounded-full bg-night-950" />
              <span className="flex-1 border-t-2 border-dashed border-chalk/20" />
              <span className="-mr-2.5 h-5 w-5 rounded-full bg-night-950" />
            </div>

            {/* Corpo rolável */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
              {/* Premiação */}
              <div>
                <div className="mb-2 font-display text-sm uppercase tracking-[0.16em] text-chalk">
                  🏆 Premiação
                </div>
                {active.buyIn > 0 ? (
                  <div className="border border-gold-400/30 bg-gold-400/[0.05] p-3.5">
                    <div className="flex items-end justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-chalk-dim">
                        prêmio total
                      </span>
                      <span className="font-display text-3xl leading-none tabular-nums text-gold-400 [text-shadow:0_0_22px_rgba(255,196,0,0.4)]">
                        {brl(prize.pot)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      {[
                        { m: "🥇", v: prize.first, l: "1º" },
                        { m: "🥈", v: prize.second, l: "2º" },
                        { m: "🥉", v: prize.third, l: "3º" },
                      ].map((p) => (
                        <div key={p.l} className="border border-chalk/12 py-2">
                          <div className="text-lg leading-none">{p.m}</div>
                          <div className="mt-1 font-mono text-sm font-bold tabular-nums text-chalk">
                            {brl(p.v)}
                          </div>
                          <div className="font-mono text-[9px] uppercase tracking-widest text-chalk/40">
                            {p.l} lugar
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2.5 font-mono text-[9px] leading-relaxed text-chalk/30">
                      {brl(active.buyIn)} × {participants} participantes. Valores
                      simulados — sem pagamento real por enquanto.
                    </p>
                  </div>
                ) : (
                  <div className="border border-dashed border-grass-400/40 bg-grass-400/[0.04] p-3.5 font-mono text-[11px] leading-relaxed text-grass-400">
                    Bolão grátis — vale pela glória e pela zoeira. 🏆 Sem premiação
                    em dinheiro.
                  </div>
                )}
              </div>

              {/* Ranking */}
              <div>
                <Ranking rows={standings} title="Ranking" live={live} />
              </div>

              {/* Participantes */}
              <div>
                <div className="mb-2 font-display text-sm uppercase tracking-[0.16em] text-chalk">
                  👥 Participantes · {participants}
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  <li className="flex items-center gap-1.5 border border-gold-400/60 bg-gold-400/[0.08] px-2.5 py-1">
                    <span className="text-xs">🧑</span>
                    <span className="font-mono text-[11px] text-chalk">
                      {hasNick ? identity.nickname : "você"}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-gold-400">
                      você
                    </span>
                  </li>
                  {members.map((name) => (
                    <li
                      key={name}
                      className="flex items-center gap-1.5 border border-chalk/12 px-2.5 py-1"
                    >
                      <span className="text-xs">🎭</span>
                      <span className="font-mono text-[11px] text-chalk-dim">
                        {name}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-mono text-[9px] leading-relaxed text-chalk/30">
                  Participantes simulados (local). Amigos reais entram com o backend.
                </p>
              </div>
            </div>

            {/* Rodapé */}
            <div className="flex gap-2 border-t-2 border-dashed border-chalk/15 bg-night-900 px-6 py-4">
              {!active.isPlatform && (
                <button
                  onClick={() => onCopyInvite(active.id)}
                  className="flex-1 border border-gold-400 bg-gold-400 py-2.5 font-display text-sm uppercase tracking-[0.16em] text-night-950 transition hover:bg-gold-300"
                >
                  {copiedPoolId === active.id ? "✓ link copiado" : "🔗 Convidar"}
                </button>
              )}
              <button
                onClick={() => setShowPanel(false)}
                className="border border-chalk/20 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-chalk-dim transition hover:border-chalk/45 hover:text-chalk"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelForm({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5 border-t border-dashed border-chalk/12 px-4 py-3.5">
      <div className="font-display text-sm uppercase tracking-[0.2em] text-chalk">
        {title}
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-chalk/40">{hint}</p>
      {children}
    </div>
  );
}
