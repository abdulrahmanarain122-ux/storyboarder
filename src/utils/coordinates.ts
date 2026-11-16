import type { CanvasCard, CanvasFrame, Point, ResizeHandle, Viewport } from '../types/canvas';
import { MIN_CARD_HEIGHT, MIN_CARD_WIDTH, ROTATION_SNAP_DEGREES } from '../constants/canvas';

/**
 * Convert screen coordinates (pixels relative to canvas container) to world coordinates.
 */
export function screenToWorld(screenPoint: Point, viewport: Viewport): Point {
  return {
    x: (screenPoint.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - viewport.y) / viewport.zoom,
  };
}

/**
 * Convert world coordinates to screen coordinates.
 */
export function worldToScreen(worldPoint: Point, viewport: Viewport): Point {
  return {
    x: worldPoint.x * viewport.zoom + viewport.x,
    y: worldPoint.y * viewport.zoom + viewport.y,
  };
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Rotate a point around a center by an angle in degrees.
 */
export function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Calculate rotation angle from card center to pointer, with optional 15-degree snap.
 */
export function computeRotationAngle(
  centerScreen: Point,
  pointerScreen: Point,
  snap: boolean = false
): number {
  const dx = pointerScreen.x - centerScreen.x;
  const dy = pointerScreen.y - centerScreen.y;
  
  // atan2(dy, dx) returns angle from +X axis clockwise.
  // The rotation handle is placed at the top (-90 degrees from +X axis).
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  
  // Normalize to [0, 360)
  angleDeg = (angleDeg % 360 + 360) % 360;

  if (snap) {
    angleDeg = Math.round(angleDeg / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES;
    angleDeg = (angleDeg % 360 + 360) % 360;
  }

  return Math.round(angleDeg);
}

/**
 * Compute new card bounds when resizing, accounting for rotation around center.
 * Anchors the opposite edge/corner in world space.
 */
export function computeCardResize(
  initialCard: CanvasCard,
  handle: ResizeHandle,
  startPointerWorld: Point,
  currentPointerWorld: Point,
  preserveAspect: boolean = false
): { x: number; y: number; width: number; height: number } {
  const isMedia = initialCard.type === 'video' || initialCard.type === 'image';
  const shouldPreserveAspect = preserveAspect || isMedia;

  const topHeaderH = 37;
  const bookmarksH = (initialCard.type === 'video' && initialCard.bookmarks && initialCard.bookmarks.length > 0) ? 25 : 0;
  const headerOffset = isMedia ? (topHeaderH + bookmarksH) : 0;

  const nw = initialCard.metadata?.naturalWidth;
  const nh = initialCard.metadata?.naturalHeight;
  const mediaRatio = (isMedia && nw && nh && nw > 0 && nh > 0)
    ? nw / nh
    : initialCard.width / Math.max(1, initialCard.height - headerOffset);

  const rad = (initialCard.rotation * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);

  // Delta in world coordinates
  const deltaWorldX = currentPointerWorld.x - startPointerWorld.x;
  const deltaWorldY = currentPointerWorld.y - startPointerWorld.y;

  // Unrotate delta into card local coordinate frame
  const localDx = deltaWorldX * cos - deltaWorldY * sin;
  const localDy = deltaWorldX * sin + deltaWorldY * cos;

  let newWidth = initialCard.width;
  let newHeight = initialCard.height;
  let centerLocalDx = 0;
  let centerLocalDy = 0;

  // Handle specific direction transformations
  switch (handle) {
    case 'e':
      newWidth = Math.max(MIN_CARD_WIDTH, initialCard.width + localDx);
      if (isMedia) {
        newHeight = Math.max(MIN_CARD_HEIGHT, Math.round(newWidth / mediaRatio) + headerOffset);
        centerLocalDy = (newHeight - initialCard.height) / 2;
      }
      centerLocalDx = (newWidth - initialCard.width) / 2;
      break;

    case 'w':
      newWidth = Math.max(MIN_CARD_WIDTH, initialCard.width - localDx);
      if (isMedia) {
        newHeight = Math.max(MIN_CARD_HEIGHT, Math.round(newWidth / mediaRatio) + headerOffset);
        centerLocalDy = (newHeight - initialCard.height) / 2;
      }
      centerLocalDx = -(newWidth - initialCard.width) / 2;
      break;

    case 's':
      if (isMedia) {
        const targetContentH = Math.max(MIN_CARD_HEIGHT - headerOffset, (initialCard.height - headerOffset) + localDy);
        newWidth = Math.max(MIN_CARD_WIDTH, Math.round(targetContentH * mediaRatio));
        newHeight = targetContentH + headerOffset;
        centerLocalDx = (newWidth - initialCard.width) / 2;
        centerLocalDy = (newHeight - initialCard.height) / 2;
      } else {
        newHeight = Math.max(MIN_CARD_HEIGHT, initialCard.height + localDy);
        centerLocalDy = (newHeight - initialCard.height) / 2;
      }
      break;

    case 'n':
      if (isMedia) {
        const targetContentH = Math.max(MIN_CARD_HEIGHT - headerOffset, (initialCard.height - headerOffset) - localDy);
        newWidth = Math.max(MIN_CARD_WIDTH, Math.round(targetContentH * mediaRatio));
        newHeight = targetContentH + headerOffset;
        centerLocalDx = -(newWidth - initialCard.width) / 2;
        centerLocalDy = -(newHeight - initialCard.height) / 2;
      } else {
        newHeight = Math.max(MIN_CARD_HEIGHT, initialCard.height - localDy);
        centerLocalDy = -(newHeight - initialCard.height) / 2;
      }
      break;

    case 'se': {
      newWidth = Math.max(MIN_CARD_WIDTH, initialCard.width + localDx);
      newHeight = Math.max(MIN_CARD_HEIGHT, initialCard.height + localDy);
      if (isMedia) {
        const scale = Math.max(
          newWidth / initialCard.width,
          (newHeight - headerOffset) / Math.max(1, initialCard.height - headerOffset)
        );
        newWidth = Math.max(MIN_CARD_WIDTH, Math.round(initialCard.width * scale));
        newHeight = Math.round(newWidth / mediaRatio) + headerOffset;
      } else if (shouldPreserveAspect) {
        const scale = Math.max(newWidth / initialCard.width, newHeight / initialCard.height);
        newWidth = initialCard.width * scale;
        newHeight = initialCard.height * scale;
      }
      centerLocalDx = (newWidth - initialCard.width) / 2;
      centerLocalDy = (newHeight - initialCard.height) / 2;
      break;
    }

    case 'sw': {
      newWidth = Math.max(MIN_CARD_WIDTH, initialCard.width - localDx);
      newHeight = Math.max(MIN_CARD_HEIGHT, initialCard.height + localDy);
      if (isMedia) {
        const scale = Math.max(
          newWidth / initialCard.width,
          (newHeight - headerOffset) / Math.max(1, initialCard.height - headerOffset)
        );
        newWidth = Math.max(MIN_CARD_WIDTH, Math.round(initialCard.width * scale));
        newHeight = Math.round(newWidth / mediaRatio) + headerOffset;
      } else if (shouldPreserveAspect) {
        const scale = Math.max(newWidth / initialCard.width, newHeight / initialCard.height);
        newWidth = initialCard.width * scale;
        newHeight = initialCard.height * scale;
      }
      centerLocalDx = -(newWidth - initialCard.width) / 2;
      centerLocalDy = (newHeight - initialCard.height) / 2;
      break;
    }

    case 'ne': {
      newWidth = Math.max(MIN_CARD_WIDTH, initialCard.width + localDx);
      newHeight = Math.max(MIN_CARD_HEIGHT, initialCard.height - localDy);
      if (isMedia) {
        const scale = Math.max(
          newWidth / initialCard.width,
          (newHeight - headerOffset) / Math.max(1, initialCard.height - headerOffset)
        );
        newWidth = Math.max(MIN_CARD_WIDTH, Math.round(initialCard.width * scale));
        newHeight = Math.round(newWidth / mediaRatio) + headerOffset;
      } else if (shouldPreserveAspect) {
        const scale = Math.max(newWidth / initialCard.width, newHeight / initialCard.height);
        newWidth = initialCard.width * scale;
        newHeight = initialCard.height * scale;
      }
      centerLocalDx = (newWidth - initialCard.width) / 2;
      centerLocalDy = -(newHeight - initialCard.height) / 2;
      break;
    }

    case 'nw': {
      newWidth = Math.max(MIN_CARD_WIDTH, initialCard.width - localDx);
      newHeight = Math.max(MIN_CARD_HEIGHT, initialCard.height - localDy);
      if (isMedia) {
        const scale = Math.max(
          newWidth / initialCard.width,
          (newHeight - headerOffset) / Math.max(1, initialCard.height - headerOffset)
        );
        newWidth = Math.max(MIN_CARD_WIDTH, Math.round(initialCard.width * scale));
        newHeight = Math.round(newWidth / mediaRatio) + headerOffset;
      } else if (shouldPreserveAspect) {
        const scale = Math.max(newWidth / initialCard.width, newHeight / initialCard.height);
        newWidth = initialCard.width * scale;
        newHeight = initialCard.height * scale;
      }
      centerLocalDx = -(newWidth - initialCard.width) / 2;
      centerLocalDy = -(newHeight - initialCard.height) / 2;
      break;
    }
  }

  // Rotate local center displacement back to world space
  const radWorld = (initialCard.rotation * Math.PI) / 180;
  const cosWorld = Math.cos(radWorld);
  const sinWorld = Math.sin(radWorld);

  const worldCenterDx = centerLocalDx * cosWorld - centerLocalDy * sinWorld;
  const worldCenterDy = centerLocalDx * sinWorld + centerLocalDy * cosWorld;

  const initialCenterX = initialCard.x + initialCard.width / 2;
  const initialCenterY = initialCard.y + initialCard.height / 2;

  const newCenterX = initialCenterX + worldCenterDx;
  const newCenterY = initialCenterY + worldCenterDy;

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
    x: Math.round(newCenterX - newWidth / 2),
    y: Math.round(newCenterY - newHeight / 2),
  };
}

/**
 * Compute new frame bounds when resizing without rotation.
 */
export function computeFrameResize(
  initialFrame: CanvasFrame,
  handle: ResizeHandle,
  startPointerWorld: Point,
  currentPointerWorld: Point,
  minWidth = 200,
  minHeight = 150
): { x: number; y: number; width: number; height: number } {
  const dx = currentPointerWorld.x - startPointerWorld.x;
  const dy = currentPointerWorld.y - startPointerWorld.y;

  let x = initialFrame.x;
  let y = initialFrame.y;
  let width = initialFrame.width;
  let height = initialFrame.height;

  if (handle.includes('e')) {
    width = Math.max(minWidth, initialFrame.width + dx);
  }
  if (handle.includes('s')) {
    height = Math.max(minHeight, initialFrame.height + dy);
  }
  if (handle.includes('w')) {
    const rawWidth = initialFrame.width - dx;
    if (rawWidth >= minWidth) {
      width = rawWidth;
      x = initialFrame.x + dx;
    } else {
      width = minWidth;
      x = initialFrame.x + (initialFrame.width - minWidth);
    }
  }
  if (handle.includes('n')) {
    const rawHeight = initialFrame.height - dy;
    if (rawHeight >= minHeight) {
      height = rawHeight;
      y = initialFrame.y + dy;
    } else {
      height = minHeight;
      y = initialFrame.y + (initialFrame.height - minHeight);
    }
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

