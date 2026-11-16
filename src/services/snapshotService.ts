import { toPng } from 'html-to-image';

export interface SnapshotOptions {
  frameId?: string;
  filename?: string;
  pixelRatio?: number;
}

/**
 * Captures a high-resolution PNG snapshot of the canvas viewport or a selected Frame,
 * cleanly omitting floating UI overlays, transform handles, and HUD controls.
 */
export async function captureCanvasSnapshot(options: SnapshotOptions = {}): Promise<void> {
  const { frameId, pixelRatio = 2 } = options;

  let targetElement: HTMLElement | null = null;

  if (frameId) {
    targetElement = document.getElementById(`canvas-frame-${frameId}`);
  }

  if (!targetElement) {
    const worldContainer = document.getElementById('world-canvas-container');
    targetElement = (worldContainer?.parentElement as HTMLElement) ||
                    worldContainer ||
                    (document.querySelector('main') as HTMLElement);
  }

  if (!targetElement) {
    throw new Error('Canvas container element not found for snapshot capture.');
  }

  // Temporarily toggle snapshot class to ensure all UI overlays are cleanly hidden
  document.body.classList.add('is-taking-snapshot');

  try {
    // Wait a tick for styles to settle
    await new Promise((r) => setTimeout(r, 80));

    const dataUrl = await toPng(targetElement, {
      pixelRatio,
      backgroundColor: '#090b10',
      cacheBust: false,
      skipFonts: true,
      fontEmbedCSS: '',
      imagePlaceholder:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      filter: (node) => {
        if (node instanceof HTMLElement) {
          const tag = node.tagName?.toLowerCase();
          if (tag === 'iframe' || tag === 'video') {
            return false;
          }
          if (tag === 'img' && (!node.getAttribute('src') || node.getAttribute('src') === '')) {
            return false;
          }
          if (
            node.classList.contains('snapshot-hide') ||
            node.classList.contains('no-snapshot') ||
            node.id === 'rubber-band-marquee' ||
            node.classList.contains('cursor-crosshair') ||
            node.getAttribute('role') === 'dialog'
          ) {
            return false;
          }
        }
        return true;
      },
    });

    const sanitizedName = (options.filename || (frameId ? `frame-${frameId}` : 'storyboarder-board'))
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-|-$/g, '') || 'canvas-snapshot';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const downloadName = `${sanitizedName}-${timestamp}.png`;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    document.body.classList.remove('is-taking-snapshot');
  }
}
