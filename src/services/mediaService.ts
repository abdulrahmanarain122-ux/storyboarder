import { db } from '../db/database';
import type { MediaBlobRecord } from '../types/canvas';

class MediaService {
  private objectUrlCache: Map<string, string> = new Map();

  /**
   * Save a binary Blob / File into IndexedDB and return its blobId and active Object URL.
   */
  async saveMediaBlob(
    fileOrBlob: Blob,
    name: string,
    mimeType?: string
  ): Promise<{ blobId: string; objectUrl: string }> {
    const id = `blob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const detectedMime = mimeType || fileOrBlob.type || 'application/octet-stream';

    const record: MediaBlobRecord = {
      id,
      blob: fileOrBlob,
      mimeType: detectedMime,
      name,
      size: fileOrBlob.size,
      createdAt: Date.now(),
    };

    await db.mediaBlobs.put(record);

    const objectUrl = URL.createObjectURL(fileOrBlob);
    this.objectUrlCache.set(id, objectUrl);

    return { blobId: id, objectUrl };
  }

  /**
   * Retrieve the active Object URL for a given blobId.
   * Reuses cached URL if available, otherwise generates and tracks a new one.
   */
  async getObjectUrl(blobId: string): Promise<string | null> {
    if (this.objectUrlCache.has(blobId)) {
      return this.objectUrlCache.get(blobId)!;
    }

    const record = await db.mediaBlobs.get(blobId);
    if (!record) return null;

    const objectUrl = URL.createObjectURL(record.blob);
    this.objectUrlCache.set(blobId, objectUrl);
    return objectUrl;
  }

  /**
   * Revoke an active Object URL to prevent memory leaks.
   */
  revokeObjectUrl(blobId: string): void {
    const url = this.objectUrlCache.get(blobId);
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrlCache.delete(blobId);
    }
  }

  /**
   * Revoke all managed Object URLs.
   */
  revokeAllObjectUrls(): void {
    for (const url of this.objectUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrlCache.clear();
  }

  /**
   * Delete a media blob from IndexedDB and release its object URL.
   */
  async deleteMediaBlob(blobId: string): Promise<void> {
    this.revokeObjectUrl(blobId);
    await db.mediaBlobs.delete(blobId);
  }

  /**
   * Probe image natural dimensions using temporary object URL.
   */
  async getImageDimensions(fileOrBlob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const tempUrl = URL.createObjectURL(fileOrBlob);
      const img = new Image();

      img.onload = () => {
        const dimensions = {
          width: img.naturalWidth || 400,
          height: img.naturalHeight || 300,
        };
        URL.revokeObjectURL(tempUrl);
        resolve(dimensions);
      };

      img.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve({ width: 400, height: 300 });
      };

      img.src = tempUrl;
    });
  }

  /**
   * Probe video dimensions and duration.
   */
  async getVideoMetadata(
    fileOrBlob: Blob
  ): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve) => {
      const tempUrl = URL.createObjectURL(fileOrBlob);
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const metadata = {
          width: video.videoWidth || 480,
          height: video.videoHeight || 320,
          duration: Math.round(video.duration) || 0,
        };
        URL.revokeObjectURL(tempUrl);
        resolve(metadata);
      };

      video.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve({ width: 480, height: 320, duration: 0 });
      };

      video.src = tempUrl;
    });
  }

  /**
   * Probe audio duration.
   */
  async getAudioMetadata(fileOrBlob: Blob): Promise<{ duration: number }> {
    return new Promise((resolve) => {
      const tempUrl = URL.createObjectURL(fileOrBlob);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        const duration = Math.round(audio.duration) || 0;
        URL.revokeObjectURL(tempUrl);
        resolve({ duration });
      };

      audio.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve({ duration: 0 });
      };

      audio.src = tempUrl;
    });
  }

  /**
   * Format bytes to readable string (e.g. 2.4 MB).
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Format seconds to standard mm:ss string.
   */
  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Parse mm:ss or hh:mm:ss string to seconds.
   */
  parseDuration(formatted: string): number {
    if (!formatted) return 0;
    const parts = formatted.split(':').map((p) => parseFloat(p));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    const num = parseFloat(formatted);
    return isNaN(num) ? 0 : num;
  }
}

export const mediaService = new MediaService();
