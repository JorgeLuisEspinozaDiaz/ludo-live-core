import { ValueTransformer } from 'typeorm';

/** Persiste montos como bigint (céntimos) y los expone como number seguro en JS. */
export const centsTransformer: ValueTransformer = {
  to(value?: number | string | null): string | null {
    if (value === null || value === undefined) return null;
    return String(Math.trunc(Number(value)));
  },
  from(value?: string | number | null): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
  },
};

export function visualStatusFromBalance(balanceCents: number) {
  if (balanceCents < 0) return 'NEGATIVE' as const;
  if (balanceCents > 0) return 'POSITIVE' as const;
  return 'ZERO' as const;
}
