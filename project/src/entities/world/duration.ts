export function formatDuration(seconds: number): string {
  let remaining = Math.max(0, Math.ceil(seconds));
  const parts: string[] = [];
  for (const [size, unit] of [[86400, 'д'], [3600, 'ч'], [60, 'мин'], [1, 'с']] as const) {
    const value = Math.floor(remaining / size); remaining %= size;
    if (value) parts.push(`${value} ${unit}`);
  }
  return parts.join(' ') || '0 с';
}
