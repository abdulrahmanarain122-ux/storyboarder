import JSZip from 'jszip';
import { db } from '../db/database';
import { mediaService } from './mediaService';
import type { CanvasCard, CanvasFrame, Connection, MediaBlobRecord, Viewport } from '../types/canvas';

export interface ExportedBoardData {
  version: 1;
  title: string;
  viewport: Viewport;
  cards: Record<string, CanvasCard>;
  connections: Connection[];
  frames: Record<string, CanvasFrame>;
  mediaManifest: Record<
    string,
    {
      name: string;
      mimeType: string;
      size: number;
      path: string;
    }
  >;
  exportedAt: number;
}

export interface ImportResult {
  title: string;
  viewport: Viewport;
  cards: Record<string, CanvasCard>;
  connections: Connection[];
  frames: Record<string, CanvasFrame>;
}

/**
 * Serializes the complete canvas state (cards, connections, frames, viewport) into
 * board.json, bundles any binary blobs from IndexedDB into /media, and triggers
 * a browser download of <project-name>.board (ZIP archive).
 */
export async function exportProject(
  boardTitle: string,
  viewport: Viewport,
  cards: Record<string, CanvasCard>,
  connections: Connection[],
  frames: Record<string, CanvasFrame>
): Promise<void> {
  const zip = new JSZip();
  const mediaFolder = zip.folder('media');
  const mediaManifest: ExportedBoardData['mediaManifest'] = {};

  // Fetch all unique binary blobs referenced by cards
  const cardList = Object.values(cards);
  for (const card of cardList) {
    if (card.blobId && !mediaManifest[card.blobId]) {
      try {
        const record = await db.mediaBlobs.get(card.blobId);
        if (record && record.blob) {
          const fileName = `${card.blobId}`;
          mediaFolder?.file(fileName, record.blob);
          mediaManifest[card.blobId] = {
            name: record.name || fileName,
            mimeType: record.mimeType,
            size: record.size,
            path: `media/${fileName}`,
          };
        }
      } catch (err) {
        console.warn(`Failed to package blob ${card.blobId} into export zip`, err);
      }
    }
  }

  // Create clean export payload (strip temporary live object URLs to prevent stale memory references)
  const cleanCards: Record<string, CanvasCard> = {};
  for (const [id, card] of Object.entries(cards)) {
    cleanCards[id] = {
      ...card,
      url: card.blobId ? '' : card.url, // If blobId exists, url will be re-hydrated on import
    };
  }

  const exportPayload: ExportedBoardData = {
    version: 1,
    title: boardTitle || 'Spatial Moodboard',
    viewport,
    cards: cleanCards,
    connections,
    frames,
    mediaManifest,
    exportedAt: Date.now(),
  };

  zip.file('board.json', JSON.stringify(exportPayload, null, 2));

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const sanitizedTitle = (boardTitle || 'storyboarder-board')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'storyboarder-board';

  const downloadUrl = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `${sanitizedTitle}.board`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

/**
 * Reads a .board / .zip project package, extracts board.json and media blobs,
 * saves media blobs back into IndexedDB, re-hydrates live object URLs, and returns
 * the restored board state.
 */
export async function importProject(file: File | Blob): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(file);

  const boardJsonFile = zip.file('board.json');
  if (!boardJsonFile) {
    throw new Error('Invalid project file: "board.json" not found inside package.');
  }

  const boardJsonContent = await boardJsonFile.async('string');
  const boardData: ExportedBoardData = JSON.parse(boardJsonContent);

  if (!boardData || !boardData.cards) {
    throw new Error('Invalid project file structure: missing cards mapping.');
  }

  const mediaManifest = boardData.mediaManifest || {};
  const importedCards: Record<string, CanvasCard> = { ...boardData.cards };

  // Extract all packaged media files from /media folder or manifest and store in IndexedDB
  const mediaFolder = zip.folder('media');
  if (mediaFolder) {
    const mediaEntries: JSZip.JSZipObject[] = [];
    mediaFolder.forEach((_relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        mediaEntries.push(zipEntry);
      }
    });

    for (const zipEntry of mediaEntries) {
      const fileName = zipEntry.name.replace(/^media\//, '');
      const blobId = fileName;
      const meta = mediaManifest[blobId];
      const rawBlob = await zipEntry.async('blob');
      const mimeType = meta?.mimeType || 'application/octet-stream';
      const typedBlob = new Blob([rawBlob], { type: mimeType });

      const record: MediaBlobRecord = {
        id: blobId,
        blob: typedBlob,
        mimeType,
        name: meta?.name || fileName,
        size: typedBlob.size,
        createdAt: Date.now(),
      };

      await db.mediaBlobs.put(record);
    }
  }

  // Hydrate live object URLs for all cards referencing blobIds
  for (const card of Object.values(importedCards)) {
    if (card.blobId) {
      const liveUrl = await mediaService.getObjectUrl(card.blobId);
      if (liveUrl) {
        card.url = liveUrl;
      }
    }
  }

  return {
    title: boardData.title || 'Imported Board',
    viewport: boardData.viewport || { x: 0, y: 0, zoom: 1 },
    cards: importedCards,
    connections: boardData.connections || [],
    frames: boardData.frames || {},
  };
}

