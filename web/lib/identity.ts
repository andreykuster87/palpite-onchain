// Identidade local anônima (apelido + userId).
//
// Nesta fase o app é 100% local (sem backend): a identidade vive no
// localStorage. O `userId` é um id anônimo estável (nunca sai do dispositivo)
// e o `nickname` é como a pessoa aparece nos bolões. Quando o Supabase entrar,
// esta camada é o ponto único a trocar; quando a Phantom entrar, o `userId`
// passa a ser a chave pública assinada (`signMessage`).

const KEY = "palpite:identity:v1";

export interface Identity {
  userId: string;
  nickname: string;
}

/** Id anônimo curto e estável (não é sensível; só distingue participantes). */
function newUserId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return "u_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    }
  } catch {
    /* ambiente sem crypto — cai no fallback */
  }
  return "u_" + Math.floor(Math.random() * 1e16).toString(36);
}

/**
 * Lê a identidade do localStorage, criando um `userId` anônimo na primeira vez.
 * O `nickname` começa vazio até a pessoa escolher um. Client-only.
 */
export function getIdentity(): Identity {
  if (typeof window === "undefined") return { userId: "", nickname: "" };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Identity>;
      if (parsed && typeof parsed.userId === "string" && parsed.userId) {
        return { userId: parsed.userId, nickname: parsed.nickname ?? "" };
      }
    }
  } catch {
    /* storage indisponível — gera efêmero */
  }
  const fresh: Identity = { userId: newUserId(), nickname: "" };
  saveIdentity(fresh);
  return fresh;
}

function saveIdentity(id: Identity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(id));
  } catch {
    /* ignora */
  }
}

/** Define/atualiza o apelido, preservando o `userId`. Devolve a identidade nova. */
export function setNickname(nickname: string): Identity {
  const id = getIdentity();
  const next = { ...id, nickname: nickname.trim().slice(0, 24) };
  saveIdentity(next);
  return next;
}
