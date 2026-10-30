import { describe, expect, it } from 'vitest';
import { mapNameLines, validWorldName, worldNameLength, WORLD_NAME_MAX_LENGTH } from '../src/entities/world/names';

describe('player world names', () => {
  it('counts Unicode code points consistently with PHP and rejects the next character', () => {
    expect(WORLD_NAME_MAX_LENGTH).toBe(24);
    for (const letter of ['Я', 'a', '🌲']) {
      expect(validWorldName(`  ${letter.repeat(24)}  `)).toBe(true);
      expect(validWorldName(letter.repeat(25))).toBe(false);
      expect(worldNameLength(letter.repeat(24))).toBe(24);
    }
    expect(validWorldName('   ')).toBe(false);
  });
  it('uses two complete lines for current names and safely shortens old names', () => {
    expect(mapNameLines('Очаг')).toEqual(['Очаг']);
    expect(mapNameLines('Ремесленная мастерская')).toEqual(['Ремесленная', 'мастерская']);
    expect(mapNameLines('Я'.repeat(24))).toEqual(['Я'.repeat(12), 'Я'.repeat(12)]);
    expect(mapNameLines('🌲'.repeat(25))).toEqual(['🌲'.repeat(12), '🌲'.repeat(11) + '…']);
  });
});
