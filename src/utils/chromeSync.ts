import type { BookmarkNode } from '../db/database';

export interface ChromeBookmarkNode {
  id: string;
  parentId?: string;
  index?: number;
  title: string;
  url?: string;
  dateAdded?: number;
  children?: ChromeBookmarkNode[];
}

/**
 * Recursively flattens nested Chrome Bookmark nodes into our flat BookmarkNode database schema.
 * Maps 'id' to 'chrome-id' and 'parentId' to 'chrome-parentId' to prevent collisions with other local data.
 */
export function flattenChromeBookmarks(
  chromeNodes: ChromeBookmarkNode[],
  parentId: string | null = null,
  orderIndexOffset = 0
): BookmarkNode[] {
  const result: BookmarkNode[] = [];

  chromeNodes.forEach((cNode, index) => {
    // Root level Chrome node with id "0" or no parentId is not a real bookmark/folder we display.
    // We skip it and directly process its children.
    if (cNode.id === '0') {
      if (cNode.children) {
        result.push(...flattenChromeBookmarks(cNode.children, null, 0));
      }
      return;
    }

    const type: 'folder' | 'bookmark' = cNode.url ? 'bookmark' : 'folder';
    
    const node: BookmarkNode = {
      id: `chrome-${cNode.id}`,
      parentId: parentId ? `chrome-${parentId}` : null,
      type,
      title: cNode.title || '',
      url: cNode.url,
      addDate: cNode.dateAdded ? Math.floor(cNode.dateAdded / 1000) : undefined,
      customTags: [], // Standard tags initialized as empty
      orderIndex: orderIndexOffset + (cNode.index ?? index)
    };

    result.push(node);

    if (cNode.children && cNode.children.length > 0) {
      result.push(...flattenChromeBookmarks(cNode.children, cNode.id, 0));
    }
  });

  return result;
}
