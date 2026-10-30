/** Keep the player naming contract in sync with backend domain/WorldName::MAX_LENGTH. */
export const WORLD_NAME_MAX_LENGTH = 24;
export const worldNameLength = (value: string): number => Array.from(value).length;
export const validWorldName = (value: string): boolean => {
  const length = worldNameLength(value.trim());
  return length > 0 && length <= WORLD_NAME_MAX_LENGTH;
};

/** Two compact SVG lines; old names remain available in the title and inspector. */
export function mapNameLines(value: string): string[] {
  const letters = Array.from(value.trim());
  if (letters.length <= 12) return [letters.join('')];
  const first = letters.slice(0, 12).join('');
  const breakAt = first.lastIndexOf(' ');
  const split = breakAt > 0 && letters.length - breakAt - 1 <= 12 ? breakAt : 12;
  const tail = letters.slice(split).join('').trim();
  return [letters.slice(0, split).join('').trim(), worldNameLength(tail) > 12 ? Array.from(tail).slice(0, 11).join('') + '…' : tail];
}
