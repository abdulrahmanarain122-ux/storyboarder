import type { Point } from '../types/canvas';

export interface CardLayoutItem {
  width: number;
  height: number;
}

export interface PositionedItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate non-overlapping world positions for a batch of cards centered around an origin point.
 */
export function computeAutoArrangePositions(
  items: CardLayoutItem[],
  originWorld: Point,
  gap: number = 24
): PositionedItem[] {
  const count = items.length;
  if (count === 0) return [];

  // Single card: center directly on origin
  if (count === 1) {
    const item = items[0];
    return [
      {
        x: Math.round(originWorld.x - item.width / 2),
        y: Math.round(originWorld.y - item.height / 2),
        width: item.width,
        height: item.height,
      },
    ];
  }

  // Multi-card layout: calculate optimal column count
  // 2 -> 2 cols, 3 -> 3 cols, 4 -> 2 cols, 5/6 -> 3 cols, 7+ -> 4 cols
  let cols = 2;
  if (count === 3) cols = 3;
  else if (count >= 5 && count <= 8) cols = 3;
  else if (count > 8) cols = 4;

  const rows = Math.ceil(count / cols);

  // Group items by row and compute column widths and row heights
  const colWidths = new Array(cols).fill(0);
  const rowHeights = new Array(rows).fill(0);

  items.forEach((item, index) => {
    const c = index % cols;
    const r = Math.floor(index / cols);
    colWidths[c] = Math.max(colWidths[c], item.width);
    rowHeights[r] = Math.max(rowHeights[r], item.height);
  });

  // Calculate total cluster dimensions
  const totalWidth =
    colWidths.reduce((sum, w) => sum + w, 0) + (cols - 1) * gap;
  const totalHeight =
    rowHeights.reduce((sum, h) => sum + h, 0) + (rows - 1) * gap;

  // Top-left starting coordinate to center cluster on originWorld
  const startX = originWorld.x - totalWidth / 2;
  const startY = originWorld.y - totalHeight / 2;

  // Calculate prefix sums for coordinate placement
  const colXOffsets = [0];
  for (let c = 0; c < cols - 1; c++) {
    colXOffsets.push(colXOffsets[c] + colWidths[c] + gap);
  }

  const rowYOffsets = [0];
  for (let r = 0; r < rows - 1; r++) {
    rowYOffsets.push(rowYOffsets[r] + rowHeights[r] + gap);
  }

  return items.map((item, index) => {
    const c = index % cols;
    const r = Math.floor(index / cols);

    // Center item within its cell
    const cellX = startX + colXOffsets[c];
    const cellY = startY + rowYOffsets[r];
    const offsetX = (colWidths[c] - item.width) / 2;
    const offsetY = (rowHeights[r] - item.height) / 2;

    return {
      x: Math.round(cellX + offsetX),
      y: Math.round(cellY + offsetY),
      width: item.width,
      height: item.height,
    };
  });
}
