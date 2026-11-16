/**
 * Extracts up to `count` distinct dominant hex colors from an image URL
 * using a downsampled offscreen canvas.
 */
export async function extractDominantColors(imageUrl: string, count = 5): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }

        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Quantize RGB into 24-step buckets to group similar shades
        const buckets = new Map<string, { r: number; g: number; b: number; hits: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const qr = Math.round(r / 24) * 24;
          const qg = Math.round(g / 24) * 24;
          const qb = Math.round(b / 24) * 24;
          const key = `${qr},${qg},${qb}`;

          const existing = buckets.get(key);
          if (existing) {
            existing.r += r;
            existing.g += g;
            existing.b += b;
            existing.hits += 1;
          } else {
            buckets.set(key, { r, g, b, hits: 1 });
          }
        }

        const sorted = Array.from(buckets.values())
          .sort((a, b) => b.hits - a.hits)
          .map((bucket) => ({
            r: Math.round(bucket.r / bucket.hits),
            g: Math.round(bucket.g / bucket.hits),
            b: Math.round(bucket.b / bucket.hits),
          }));

        // Pick colors that are perceptually distinct from already-picked ones
        const picked: { r: number; g: number; b: number }[] = [];
        for (const c of sorted) {
          const tooClose = picked.some(
            (p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) < 52
          );
          if (!tooClose) {
            picked.push(c);
            if (picked.length >= count) break;
          }
        }

        const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0').toUpperCase();
        resolve(picked.map((c) => `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`));
      } catch {
        resolve([]);
      }
    };

    img.onerror = () => resolve([]);
    img.src = imageUrl;
  });
}
