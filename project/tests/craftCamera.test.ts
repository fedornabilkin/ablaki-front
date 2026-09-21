import { describe, expect, it } from 'vitest';
import { gestureCamera, zoomCamera } from '../src/entities/craft/camera';
describe('craft map camera', () => {
  it('keeps the world point under the cursor when zooming, including at scale limits', () => {
    const camera = {x: -200, y: 90, scale: .8}, cursor = {x: 240, y: 130};
    for (const factor of [.01, .6, 1.8, 100]) {
      const next = zoomCamera(camera, cursor, factor);
      expect((cursor.x - next.x) / next.scale).toBeCloseTo((cursor.x - camera.x) / camera.scale);
      expect((cursor.y - next.y) / next.scale).toBeCloseTo((cursor.y - camera.y) / camera.scale);
      expect(next.scale).toBeGreaterThanOrEqual(.3); expect(next.scale).toBeLessThanOrEqual(2);
    }
  });
  it('pans by pointer movement and combines pinch zoom with midpoint movement', () => {
    const camera = {x: 10, y: 20, scale: 1};
    expect(gestureCamera(camera, [{x: 20, y: 30}], [{x: 60, y: 10}])).toEqual({x: 50, y: 0, scale: 1});
    const result = gestureCamera(camera, [{x: 0, y: 0}, {x: 100, y: 0}], [{x: 20, y: 20}, {x: 220, y: 20}]);
    expect(result).toEqual({x: 40, y: 60, scale: 2});
    expect(gestureCamera(camera, [], [])).toEqual(camera);
  });
});
