// Hash de exibição para o "commit" local da cartela (FNV-1a expandido).
// NÃO é criptográfico — é o rótulo visual do bilhete no protótipo. No jogo
// real, o commit on-chain usa o hash SHA-256 registrado pelo contrato.
export function commitHash(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let out = "";
  let x = h;
  for (let i = 0; i < 4; i++) {
    x = Math.imul(x ^ (x >>> 13), 0x5bd1e995) >>> 0;
    out += x.toString(16).padStart(8, "0");
  }
  return out;
}
