import { occupiesCell, type MapPoint } from './coordinates';
import type { WorldMapData } from './types';
export function selectedFreeCell(selection: MapPoint[], map: WorldMapData | null): MapPoint | null {
  if (selection.length !== 1 || !map) return null;
  const point = selection[0];
  return map.cells.some(cell => cell.x === point.x && cell.y === point.y && cell.state === 'open')
    && !map.items.some(node => occupiesCell(node, point))
    && !map.equipment_cells?.some(cell => cell.x === point.x && cell.y === point.y) ? point : null;
}
