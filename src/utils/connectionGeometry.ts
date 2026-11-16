import type { CanvasCard, AnchorPosition, Point } from '../types/canvas';

/**
 * Computes exact world coordinate and outward normal vector for a card anchor,
 * taking card dimensions, center position, and rotation into account.
 */
export function getCardAnchorWorldPoint(
  card: CanvasCard,
  anchor: AnchorPosition
): { point: Point; normal: Point } {
  const cx = card.x + card.width / 2;
  const cy = card.y + card.height / 2;

  let relX = 0;
  let relY = 0;
  let normX = 0;
  let normY = 0;

  switch (anchor) {
    case 'top':
      relX = 0;
      relY = -card.height / 2;
      normX = 0;
      normY = -1;
      break;
    case 'right':
      relX = card.width / 2;
      relY = 0;
      normX = 1;
      normY = 0;
      break;
    case 'bottom':
      relX = 0;
      relY = card.height / 2;
      normX = 0;
      normY = 1;
      break;
    case 'left':
      relX = -card.width / 2;
      relY = 0;
      normX = -1;
      normY = 0;
      break;
  }

  const rad = ((card.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotX = relX * cos - relY * sin;
  const rotY = relX * sin + relY * cos;

  const rotNormX = normX * cos - normY * sin;
  const rotNormY = normX * sin + normY * cos;

  return {
    point: {
      x: cx + rotX,
      y: cy + rotY,
    },
    normal: {
      x: rotNormX,
      y: rotNormY,
    },
  };
}

export interface BezierCurveData {
  path: string;
  p1: Point;
  c1: Point;
  c2: Point;
  p2: Point;
  midpoint: Point;
}

/**
 * Computes cubic bezier curve string and control points / midpoint.
 * Tangents naturally extend along anchor normal vectors.
 */
export function computeBezierCurveData(
  p1: Point,
  n1: Point,
  p2: Point,
  n2?: Point
): BezierCurveData {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);

  // Dynamic tangent strength based on distance between anchors
  const curvature = Math.min(Math.max(dist * 0.45, 45), 220);

  const cx1 = p1.x + n1.x * curvature;
  const cy1 = p1.y + n1.y * curvature;

  let cx2: number;
  let cy2: number;

  if (n2) {
    cx2 = p2.x + n2.x * curvature;
    cy2 = p2.y + n2.y * curvature;
  } else {
    // Drafting towards pointer without a fixed target normal
    cx2 = p2.x - n1.x * (curvature * 0.5);
    cy2 = p2.y - n1.y * (curvature * 0.5);
  }

  const path = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;

  const midX = 0.125 * p1.x + 0.375 * cx1 + 0.375 * cx2 + 0.125 * p2.x;
  const midY = 0.125 * p1.y + 0.375 * cy1 + 0.375 * cy2 + 0.125 * p2.y;

  return {
    path,
    p1,
    c1: { x: cx1, y: cy1 },
    c2: { x: cx2, y: cy2 },
    p2,
    midpoint: { x: midX, y: midY },
  };
}

/**
 * Computes smooth cubic bezier curve string: M x1 y1 C cx1 cy1, cx2 cy2, x2 y2
 * Tangents naturally extend along anchor normal vectors.
 */
export function computeBezierCurve(
  p1: Point,
  n1: Point,
  p2: Point,
  n2?: Point
): string {
  return computeBezierCurveData(p1, n1, p2, n2).path;
}

/**
 * Searches for the nearest anchor port within threshold distance (magnetic snapping).
 */
export function findNearestAnchor(
  pointWorld: Point,
  cards: Record<string, CanvasCard>,
  excludeCardId?: string,
  threshold: number = 38
): { cardId: string; anchor: AnchorPosition; point: Point } | null {
  let closest: { cardId: string; anchor: AnchorPosition; point: Point } | null = null;
  let minDist = threshold;

  const anchors: AnchorPosition[] = ['top', 'right', 'bottom', 'left'];

  for (const card of Object.values(cards)) {
    if (card.id === excludeCardId) continue;

    for (const anchor of anchors) {
      const { point } = getCardAnchorWorldPoint(card, anchor);
      const dist = Math.hypot(point.x - pointWorld.x, point.y - pointWorld.y);
      if (dist < minDist) {
        minDist = dist;
        closest = {
          cardId: card.id,
          anchor,
          point,
        };
      }
    }
  }

  return closest;
}
