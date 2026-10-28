import { expect, it } from 'vitest';
import { pixelToWorld, worldToPixel } from '../src/entities/world/coordinates';

it('maps Cartesian cells to screen pixels and back, including negative coordinates', () => {
  const viewport = { minX: -3, maxY: 4 };
  expect(worldToPixel({ x: -1, y: 2 }, viewport, 72)).toEqual({ x: 144, y: 144 });
  expect(pixelToWorld({ x: 145, y: 143 }, viewport, 72)).toEqual({ x: -1, y: 3 });
  expect(pixelToWorld(worldToPixel({ x: 0, y: -2 }, viewport, 72), viewport, 72)).toEqual({ x: 0, y: -2 });
});
