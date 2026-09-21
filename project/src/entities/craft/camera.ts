export interface MapCamera { x: number; y: number; scale: number }
export interface MapPoint { x: number; y: number }
export function zoomCamera(camera: MapCamera, point: MapPoint, factor: number): MapCamera {
  const scale = Math.max(.3, Math.min(2, camera.scale * factor));
  const ratio = scale / camera.scale;
  return {x: point.x - (point.x - camera.x) * ratio, y: point.y - (point.y - camera.y) * ratio, scale};
}
export function gestureCamera(camera: MapCamera, before: MapPoint[], after: MapPoint[]): MapCamera {
  const center = (points: MapPoint[]) => ({x: points.reduce((v, p) => v + p.x, 0) / points.length, y: points.reduce((v, p) => v + p.y, 0) / points.length});
  if (!before.length || before.length !== after.length) return camera;
  const a = center(before), b = center(after);
  const distance = (points: MapPoint[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  const next = before.length === 2 && distance(before) > 0 ? zoomCamera(camera, a, distance(after) / distance(before)) : camera;
  return {...next, x: next.x + b.x - a.x, y: next.y + b.y - a.y};
}
