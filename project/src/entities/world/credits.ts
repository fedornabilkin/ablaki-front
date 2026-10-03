/** Decimal strings only: amounts must never round-trip through a JS Number. */
export function creditAmount(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,14})\.\d{4}$/.test(value)) throw new Error('invalid-credit-amount');
  const units = value.replace('.', '').replace(/^0+/, '') || '0';
  if (units.length > 19 || (units.length === 19 && units > '9000000000000000000')) throw new Error('invalid-credit-amount');
  return value;
}
export function investmentAmount(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,14})(\.\d{1,4})?$/.test(value)) throw new Error('invalid-investment-amount');
  const [whole, fraction = ''] = value.split('.');
  const amount = creditAmount(`${whole}.${fraction.padEnd(4, '0')}`);
  if (amount === '0.0000') throw new Error('invalid-investment-amount');
  return amount;
}

/** Display only; wire values and ledger arithmetic keep their original precision. */
export function formatCredits(value: unknown): string {
  const text = String(value ?? '');
  if (!/^-?\d+(\.\d+)?$/.test(text)) return '—';
  const negative = text.startsWith('-'), [whole, fraction = ''] = text.replace(/^-/, '').split('.');
  const tenths = BigInt(whole) * 10n + BigInt(fraction[0] ?? '0') + (Number(fraction[1] ?? '0') >= 5 ? 1n : 0n);
  return `${negative && tenths ? '-' : ''}${tenths / 10n}${tenths % 10n ? `.${tenths % 10n}` : ''}`;
}
