import Dexie, { type Table } from 'dexie';
import type { BoardRecord, MediaBlobRecord } from '../types/canvas';

export class MusaicDatabase extends Dexie {
  boards!: Table<BoardRecord, string>;
  mediaBlobs!: Table<MediaBlobRecord, string>;

  constructor() {
    super('MusaicCanvasDB');
    this.version(1).stores({
      boards: 'id, updatedAt',
      mediaBlobs: 'id, mimeType, createdAt',
    });
  }
}

export const db = new MusaicDatabase();
