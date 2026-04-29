import type { BookmarkNode } from '../db/database';

export function parseBookmarkHTML(htmlString: string): BookmarkNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const nodes: BookmarkNode[] = [];
  
  // The root of bookmarks is usually a <DL> element just inside the body
  const rootDl = doc.querySelector('dl');
  if (!rootDl) return nodes;

  // Helper function to generate UUID
  const generateId = () => crypto.randomUUID();

  let globalOrderIndex = 0;

  // Recursive parser
  const parseDL = (dlElement: Element, parentId: string | null) => {
    // Each <DT> is an item (folder or bookmark)
    const dtElements = Array.from(dlElement.children).filter(el => el.tagName.toLowerCase() === 'dt');
    
    dtElements.forEach((dt) => {
      // Find the primary element: <A> for bookmark, <H3> for folder
      const aNode = dt.querySelector('a');
      const h3Node = dt.querySelector('h3');
      const subDl = dt.querySelector('dl');

      const currentId = generateId();
      let isFolder = false;

      if (h3Node) {
        // It's a folder
        isFolder = true;
        const addDate = parseInt(h3Node.getAttribute('add_date') || '0', 10);
        const lastModified = parseInt(h3Node.getAttribute('last_modified') || '0', 10);
        
        nodes.push({
          id: currentId,
          parentId,
          type: 'folder',
          title: h3Node.textContent || '未命名文件夹',
          addDate,
          lastModified,
          customTags: [],
          orderIndex: globalOrderIndex++
        });

        // Recursively parse children if a <DL> exists
        if (subDl) {
          parseDL(subDl, currentId);
        }
      } else if (aNode) {
        // It's a bookmark
        const addDate = parseInt(aNode.getAttribute('add_date') || '0', 10);
        const icon = aNode.getAttribute('icon') || undefined;
        const url = aNode.getAttribute('href') || '';
        
        nodes.push({
          id: currentId,
          parentId,
          type: 'bookmark',
          title: aNode.textContent || url,
          url,
          icon,
          addDate,
          customTags: [],
          orderIndex: globalOrderIndex++
        });
      }
    });
  };

  parseDL(rootDl, null);
  return nodes;
}
