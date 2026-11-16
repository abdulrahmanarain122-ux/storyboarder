import type { CardType } from '../types/canvas';

export interface ParsedMediaUrl {
  isMediaUrl: boolean;
  type: CardType;
  provider: 'youtube' | 'vimeo' | 'instagram' | 'direct-video' | 'direct-audio' | 'direct-image' | 'web';
  title: string;
  sourceUrl: string;
  embedUrl?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

/**
 * Detect and parse media URLs from pasted strings.
 */
export function parseMediaUrl(text: string): ParsedMediaUrl | null {
  const trimmed = text.trim();

  // Validate basic URL structure
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
  } catch {
    return null;
  }

  // 1. YouTube detection (Videos, Shorts, Embeds)
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?/\s]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      isMediaUrl: true,
      type: 'video',
      provider: 'youtube',
      title: 'YouTube Video',
      sourceUrl: trimmed,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      aspectRatio: '16:9',
    };
  }

  // 2. Vimeo detection
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      isMediaUrl: true,
      type: 'video',
      provider: 'vimeo',
      title: 'Vimeo Video',
      sourceUrl: trimmed,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      aspectRatio: '16:9',
    };
  }

  // 3. Instagram detection (Reels, Video Posts, TV, Shares)
  const igMatch = trimmed.match(
    /(?:instagram\.com|instagr\.am)\/(?:[^/]+\/)*(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i
  );
  if (igMatch && igMatch[1]) {
    const shortcode = igMatch[1];
    const isReel = /\/(reel|reels)\//i.test(trimmed);
    const isTv = /\/tv\//i.test(trimmed);
    const embedType = isReel ? 'reel' : isTv ? 'tv' : 'p';
    return {
      isMediaUrl: true,
      type: 'video',
      provider: 'instagram',
      title: isReel ? 'Instagram Reel' : isTv ? 'Instagram Video' : 'Instagram Post',
      sourceUrl: trimmed,
      embedUrl: `https://www.instagram.com/${embedType}/${shortcode}/embed/`,
      aspectRatio: '9:16',
    };
  }

  // Extract pathname and clean extension
  const pathname = new URL(trimmed).pathname.toLowerCase();

  // 4. Direct Video URLs
  if (/\.(mp4|webm|ogv|mov)$/i.test(pathname)) {
    const fileName = pathname.split('/').pop() || 'Video Link';
    return {
      isMediaUrl: true,
      type: 'video',
      provider: 'direct-video',
      title: fileName,
      sourceUrl: trimmed,
    };
  }

  // 5. Direct Audio URLs
  if (/\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(pathname)) {
    const fileName = pathname.split('/').pop() || 'Audio Track';
    return {
      isMediaUrl: true,
      type: 'audio',
      provider: 'direct-audio',
      title: fileName,
      sourceUrl: trimmed,
    };
  }

  // 6. Direct Image URLs
  if (/\.(jpe?g|png|gif|webp|svg|avif)$/i.test(pathname)) {
    const fileName = pathname.split('/').pop() || 'Web Image';
    return {
      isMediaUrl: true,
      type: 'image',
      provider: 'direct-image',
      title: fileName,
      sourceUrl: trimmed,
    };
  }

  // 7. Generic Web URL
  const hostname = new URL(trimmed).hostname;
  return {
    isMediaUrl: true,
    type: 'embed-url',
    provider: 'web',
    title: hostname.replace('www.', ''),
    sourceUrl: trimmed,
  };
}
