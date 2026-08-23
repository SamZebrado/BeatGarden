export interface SeededRng {
  next(): number;
  state(): number;
}

/** Mulberry32: small, deterministic and adequate for gameplay scheduling. */
export function createRng(seed: number, restoredState?: number): SeededRng {
  let value = (restoredState ?? seed) >>> 0;
  return {
    next(): number {
      value = (value + 0x6d2b79f5) >>> 0;
      let n = value;
      n = Math.imul(n ^ (n >>> 15), n | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    },
    state: () => value,
  };
}
