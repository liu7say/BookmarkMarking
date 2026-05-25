# Bookmark Manager Local Data Schema (Dexie.js / IndexedDB)

This document is the absolute source of truth for the local database schema, JSON tree data structure, and query strategies.

---

## 1. IndexedDB Schema Details

We use **Dexie.js** to manage browser client storage. Under the hood, this creates a database named `BookmarkManagerDB`.

### Database Definition
*   **Database Name**: `BookmarkManagerDB`
*   **Version**: `1`
*   **Table Schema**:
    ```typescript
    db.version(1).stores({
      nodes: '&id, parentId, type, *customTags, orderIndex'
    });
    ```

### BookmarkNode Interface Definition
```typescript
export type NodeType = 'folder' | 'bookmark';

export interface BookmarkNode {
  id: string;             // Unique identifier (UUID v4)
  parentId: string | null;// ID of parent node. null indicates root level.
  type: NodeType;         // 'folder' or 'bookmark'
  title: string;          // Name of folder or title of bookmark
  url?: string;           // ONLY present when type is 'bookmark'
  icon?: string;          // Base64 string or favicon URL. ONLY present when type is 'bookmark'
  addDate?: number;       // Unix timestamp of creation
  lastModified?: number;  // Unix timestamp of last update
  customTags: string[];   // Array of custom user-defined strings
  orderIndex: number;     // Index used for sorting children within the same parent
}
```

---

## 2. IndexedDB Schema Rationale & Indexing

*   **`id` (Primary Key, `&id`)**: Unique identifier ensuring direct node manipulation.
*   **`parentId` (Index, `parentId`)**: Crucial for fast hierarchical lookup. When building trees or rendering children, query by parent: `db.nodes.where({ parentId: currentId }).toArray()`.
*   **`*customTags` (Multi-entry Index, `*customTags`)**: The asterisk `*` creates a multi-entry index on the tags array. This allows ultra-efficient tagging queries. 
    *   *Correct Query Example*: `db.nodes.where('customTags').equals('work').toArray()` gets all bookmarks tagged "work".
*   **`orderIndex` (Index, `orderIndex`)**: Used to keep consistent ordering when rendering folders.

---

## 3. Standard UI / Tree Representation

Although stored in a flat table for relational integrity and fast indexing, the UI often renders bookmarks as a hierarchical tree.

### Flattened to Tree Conversion Guideline
To transform the flat database list into a tree for the UI:
1.  Load all nodes from the database: `const allNodes = await db.nodes.toArray();`
2.  Index nodes by their `id` into a map for $O(1)$ lookups.
3.  Loop through nodes: append them to their parent's `children` array or add to root if `parentId === null`.
4.  Sort children arrays by `orderIndex`.

Example helper:
```typescript
interface BookmarkTreeNode extends BookmarkNode {
  children?: BookmarkTreeNode[];
}

export function buildTree(flatNodes: BookmarkNode[]): BookmarkTreeNode[] {
  const nodeMap = new Map<string, BookmarkTreeNode>();
  const rootNodes: BookmarkTreeNode[] = [];

  // Initialize nodes in map
  flatNodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: node.type === 'folder' ? [] : undefined });
  });

  // Build structure
  flatNodes.forEach(node => {
    const mapped = nodeMap.get(node.id)!;
    if (node.parentId === null) {
      rootNodes.push(mapped);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent && parent.children) {
        parent.children.push(mapped);
      } else {
        // Fallback: parent missing or is not a folder (edge case cleanup)
        rootNodes.push(mapped);
      }
    }
  });

  // Sort by orderIndex
  const sortFunc = (a: BookmarkTreeNode, b: BookmarkTreeNode) => a.orderIndex - b.orderIndex;
  rootNodes.sort(sortFunc);
  nodeMap.forEach(node => {
    if (node.children) {
      node.children.sort(sortFunc);
    }
  });

  return rootNodes;
}
```
