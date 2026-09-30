export interface MapPoint { x: number; y: number }
export interface MapViewport { minX: number; maxY: number }

// World coordinates are Cartesian: X grows right, Y grows up.
export function worldToPixel(point: MapPoint, viewport: MapViewport, size: number): MapPoint {
  return { x: (point.x - viewport.minX) * size, y: (viewport.maxY - point.y) * size };
}

export function pixelToWorld(point: MapPoint, viewport: MapViewport, size: number): MapPoint {
  return { x: viewport.minX + Math.floor(point.x / size), y: viewport.maxY - Math.floor(point.y / size) };
}
