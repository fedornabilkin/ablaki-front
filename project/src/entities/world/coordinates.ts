export interface MapPoint { x: number; y: number }
export interface MapViewport { minX: number; maxY: number }

// World coordinates are Cartesian: X grows right, Y grows up.
export function worldToPixel(point: MapPoint, viewport: MapViewport, size: number): MapPoint {
  return { x: (point.x - viewport.minX) * size, y: (viewport.maxY - point.y) * size };
}

export function pixelToWorld(point: MapPoint, viewport: MapViewport, size: number): MapPoint {
  return { x: viewport.minX + Math.floor(point.x / size), y: viewport.maxY - Math.floor(point.y / size) };
}

// Test the centre of a grid cell against an optional Cartesian footprint polygon.
export function occupiesCell(node: { coordinates: MapPoint; footprint?: MapPoint[] | null }, cell: MapPoint): boolean {
  if (node.coordinates.x === cell.x && node.coordinates.y === cell.y) return true;
  const polygon = node.footprint;
  if (!polygon || polygon.length < 3) return false;
  const x = cell.x + .5, y = cell.y + .5;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
