import Dexie, { type Table } from 'dexie';

export type NodeType = 'folder' | 'bookmark';

export interface BookmarkNode {
  id: string; // Unique identifier (UUID v4)
  parentId: string | null; // null means it's at the root level
  type: NodeType;
  title: string;
  url?: string; // Only for bookmarks
  icon?: string; // Base64 or URL, only for bookmarks
  addDate?: number; // Timestamp
  lastModified?: number; // Timestamp
  customTags: string[]; // User-defined tags
  orderIndex: number; // For sorting within the same parent
}

export class BookmarkDatabase extends Dexie {
  nodes!: Table<BookmarkNode, string>;

  constructor() {
    super('BookmarkManagerDB');
    
    // Define the database schema
    // '&id' means it's a primary key
    // 'parentId' is indexed for fast lookups of children
    // '*customTags' creates a multi-entry index for array values
    this.version(1).stores({
      nodes: '&id, parentId, type, *customTags, orderIndex'
    });
  }
}

export const db = new BookmarkDatabase();
