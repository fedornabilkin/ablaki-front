import { creditUnits } from './credits';

/** Optimistic display only. A command always uses a fresh server quote. */
export function projectCraftTerms<T extends {
  price: string; experience: number;
  materials: { quantity: number; have: number; available: boolean }[];
  equipment: { wear: number }[]; output: { quantity: number };
}>(terms: T, acceptedBatches: number, batches: number): T {
  if (!Number.isSafeInteger(batches) || batches < 1 || batches > 100 || acceptedBatches < 1) return terms;
  const scale = (value: number) => value / acceptedBatches * batches;
  const price = creditUnits(terms.price) * BigInt(batches) / BigInt(acceptedBatches);
  return { ...terms, price: `${price / 10000n}.${String(price % 10000n).padStart(4, '0')}`,
    experience: scale(terms.experience),
    materials: terms.materials.map(m => ({ ...m, quantity: scale(m.quantity), available: m.have >= scale(m.quantity) })),
    equipment: terms.equipment.map(e => ({ ...e, wear: scale(e.wear) })),
    output: { ...terms.output, quantity: scale(terms.output.quantity) } };
}
