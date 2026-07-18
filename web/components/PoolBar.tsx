"use client";

import { useState } from "react";
import { type Pool, BUY_IN_OPTIONS, moneyLabel } from "@/lib/pools";
import type { Identity } from "@/lib/identity";

interface PoolBarProps {
  pools: Pool[];
  activePoolId: string;
  identity: Identity;
  /** Participantes simulados do bolão ativo (roster estável por código). */
  members: string[];
  copiedPoolId: string | null;
  onSelect: (poolId: string) => void;
  onCreate: (name: string, buyIn: number) => void;
  onJoinCode: (code: string) => void;
  onLeave: (poolId: string) => void;
  onSetNickname: (name: string) => void;
  onCopyInvite: (poolId: string) => void;
}

type Panel = "none" | "menu" | "create" | "join" | "nick" | "members";

export function PoolBar({
  pools,
  activePoolId,
  identity,
  members,
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

  const active = pools.find((p) => p.id === activePoolId) ?? pools[0];
  const hasNick = identity.nickname.trim().length > 0;

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? "none" : p));

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

        {/* Seletor do bolão ativo */}
        <button
          onClick={() => toggle("menu")}
          className="flex items-center gap-2 border border-chalk/15 bg-night-800 px-3 py-1.5 text-left transition hover:border-chalk/35"
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
          <span className="text-[10px] text-chalk/40">▾</span>
        </button>

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
