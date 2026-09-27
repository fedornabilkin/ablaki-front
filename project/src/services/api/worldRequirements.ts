import { record } from './world';

export interface RequirementReason { code: string; message: string }
export interface RequirementStatus { allowed: boolean; reasons: RequirementReason[] }

/** The backend evaluates the rule; the client validates and displays its result. */
export function parseRequirementStatus(value: unknown): RequirementStatus {
  if (value === undefined) return { allowed: true, reasons: [] }; // Earlier offers/API versions had no extra requirements.
  const data = record(value);
  if (typeof data.allowed !== 'boolean' || !Array.isArray(data.reasons) || data.reasons.length > 32) throw new Error('invalid-world-requirements');
  const reasons = data.reasons.map((value: unknown): RequirementReason => {
    const reason = record(value);
    if (typeof reason.code !== 'string' || !/^[A-Z_]{1,64}$/.test(reason.code)
      || typeof reason.message !== 'string' || !reason.message.trim() || reason.message.length > 20000) throw new Error('invalid-world-requirements');
    return { code: reason.code, message: reason.message };
  });
  if (data.allowed === Boolean(reasons.length)) throw new Error('invalid-world-requirements');
  return { allowed: data.allowed, reasons };
}
