import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db, type BookmarkNode } from '../db/database';
import { flattenChromeBookmarks } from '../utils/chromeSync';

export const useBookmarkStore = defineStore('bookmark', () => {
  const nodes = ref<BookmarkNode[]>([]);
  const isLoaded = ref(false);

  // 从 Dexie 加载全部节点
  const loadNodes = async () => {
    nodes.value = await db.nodes.orderBy('orderIndex').toArray();
    isLoaded.value = true;
  };

  // 完全覆盖：清空旧数据，写入新数据
  const saveParsedNodes = async (newNodes: BookmarkNode[]) => {
    await db.transaction('rw', db.nodes, async () => {
      await db.nodes.clear();
      await db.nodes.bulkAdd(newNodes);
    });
    await loadNodes();
  };

  /**
   * 增量合并：保留现有数据，只添加新的书签/文件夹
   * 去重规则：
   *  - 文件夹：按 parentId + title 匹配（同一位置同名文件夹视为相同）
   *  - 书签：按 URL 全局去重（同 URL 的书签不重复添加）
   *
   * 合并后保留已有节点的 customTags、icon 等用户数据
   */
  const mergeNodes = async (newNodes: BookmarkNode[]) => {
    const existingNodes = await db.nodes.toArray();

    // 构建已有书签的 URL 集合（用于快速查重）
    const existingUrls = new Set(
      existingNodes
        .filter(n => n.type === 'bookmark' && n.url)
        .map(n => n.url!)
    );

    // 构建已有文件夹的 key 集合：parentId + title
    // 同时建立 key -> id 的映射，用于重映射子节点的 parentId
    const existingFolderMap = new Map<string, string>();
    for (const n of existingNodes) {
      if (n.type === 'folder') {
        const key = `${n.parentId ?? 'ROOT'}::${n.title}`;
        existingFolderMap.set(key, n.id);
      }
    }

    // 当前最大 orderIndex
    let maxOrderIndex = existingNodes.reduce(
      (max, n) => Math.max(max, n.orderIndex),
      -1
    );

    // 新旧 ID 映射表（新文件夹 ID → 合并后实际 ID）
    const idRemap = new Map<string, string>();

    const toAdd: BookmarkNode[] = [];

    // 第一轮：处理文件夹，建立 ID 映射
    for (const node of newNodes) {
      if (node.type !== 'folder') continue;

      // 解析出实际的 parentId（可能已被 remap）
      const actualParentId = node.parentId
        ? (idRemap.get(node.parentId) ?? node.parentId)
        : null;

      const folderKey = `${actualParentId ?? 'ROOT'}::${node.title}`;

      if (existingFolderMap.has(folderKey)) {
        // 已存在同路径同名文件夹，映射 ID
        idRemap.set(node.id, existingFolderMap.get(folderKey)!);
      } else {
        // 新文件夹，需要添加
        const newNode: BookmarkNode = {
          ...node,
          parentId: actualParentId,
          orderIndex: ++maxOrderIndex,
        };
        toAdd.push(newNode);
        existingFolderMap.set(folderKey, node.id);
        // 新文件夹 ID 不变，不需要 remap
      }
    }

    // 第二轮：处理书签
    for (const node of newNodes) {
      if (node.type !== 'bookmark') continue;

      // URL 去重
      if (node.url && existingUrls.has(node.url)) continue;

      const actualParentId = node.parentId
        ? (idRemap.get(node.parentId) ?? node.parentId)
        : null;

      const newNode: BookmarkNode = {
        ...node,
        parentId: actualParentId,
        orderIndex: ++maxOrderIndex,
      };
      toAdd.push(newNode);

      if (node.url) existingUrls.add(node.url);
    }

    if (toAdd.length > 0) {
      await db.nodes.bulkAdd(toAdd);
    }

    await loadNodes();
    return { added: toAdd.length, skipped: newNodes.length - toAdd.length };
  };

  // 更新自定义标签
  const updateTags = async (id: string, newTags: string[]) => {
    await db.nodes.update(id, { customTags: newTags });
    const node = nodes.value.find(n => n.id === id);
    if (node) {
      node.customTags = newTags;
    }
  };

  // 更新单个书签的 icon
  const updateIcon = async (id: string, iconDataUrl: string) => {
    await db.nodes.update(id, { icon: iconDataUrl });
    const node = nodes.value.find(n => n.id === id);
    if (node) {
      node.icon = iconDataUrl;
    }
  };

  const updateUrl = async (id: string, url: string) => {
    await db.nodes.update(id, { url });
    const node = nodes.value.find(n => n.id === id);
    if (node) {
      node.url = url;
    }
  };

  const updateTitleAndUrl = async (id: string, title: string, url: string) => {
    await db.nodes.update(id, { title, url });
    const node = nodes.value.find(n => n.id === id);
    if (node) {
      node.title = title;
      node.url = url;
    }
  };

  // 获取缺少 icon 的书签列表
  const bookmarksWithoutIcon = computed(() => {
    return nodes.value.filter(n => n.type === 'bookmark' && !n.icon);
  });

  // 获取没有自定义标签的书签列表
  const bookmarksWithoutTags = computed(() => {
    return nodes.value.filter(n => n.type === 'bookmark' && (!n.customTags || n.customTags.length === 0));
  });

  // 获取标题为 URL 的书签列表（待提取标题）
  const bookmarksWithUrlAsTitle = computed(() => {
    return nodes.value.filter(n => {
      if (n.type !== 'bookmark' || !n.title || !n.url) return false;
      
      const titleStr = n.title.trim();
      const urlStr = n.url.trim();
      
      // 1. 标题完全等于 url 或解码后的 url
      let decodedUrl = urlStr;
      try { decodedUrl = decodeURI(urlStr); } catch (e) {}
      
      if (titleStr === urlStr || titleStr === decodedUrl) return true;
      
      // 2. 标题是以 http/https 开头且没有空格，被当作网址
      if (/^https?:\/\/[^\s]+$/i.test(titleStr)) return true;

      return false;
    });
  });

  // 获取 URL 被编码过的书签列表
  const bookmarksWithEncodedUrl = computed(() => {
    return nodes.value.filter(n => {
      if (n.type !== 'bookmark' || !n.url) return false;
      try {
        const decoded = decodeURI(n.url);
        return decoded !== n.url;
      } catch {
        return false;
      }
    });
  });

  // 构建树形结构
  const getTree = (parentId: string | null = null): any[] => {
    return nodes.value
      .filter(n => n.parentId === parentId)
      .map(n => ({
        ...n,
        children: n.type === 'folder' ? getTree(n.id) : []
      }));
  };

  // 清空所有数据
  const clearAll = async () => {
    await db.nodes.clear();
    nodes.value = [];
  };

  // 获取某个节点的所有父级文件夹名称
  const getParentFolderNames = (nodeId: string): string[] => {
    const result: string[] = [];
    let currentNode = nodes.value.find(n => n.id === nodeId);
    
    while (currentNode && currentNode.parentId) {
      const parent = nodes.value.find(n => n.id === currentNode!.parentId);
      if (parent && parent.type === 'folder') {
        result.push(parent.title);
        currentNode = parent;
      } else {
        break;
      }
    }
    return result;
  };

  // 获取经过黑名单过滤的文件夹标签
  const getFolderTags = (nodeId: string, blacklist: string[]): string[] => {
    const parentNames = getParentFolderNames(nodeId);
    return parentNames.filter(name => !blacklist.includes(name));
  };

  // Sync single node from real-time creation event
  const syncSingleNode = async (cNode: any) => {
    const type: 'folder' | 'bookmark' = cNode.url ? 'bookmark' : 'folder';
    const newNode: BookmarkNode = {
      id: `chrome-${cNode.id}`,
      parentId: cNode.parentId && cNode.parentId !== '0' ? `chrome-${cNode.parentId}` : null,
      type,
      title: cNode.title || '',
      url: cNode.url,
      addDate: cNode.dateAdded ? Math.floor(cNode.dateAdded / 1000) : undefined,
      customTags: [],
      orderIndex: cNode.index ?? 0
    };
    
    // Check duplication to protect user custom tags
    const exists = await db.nodes.get(newNode.id);
    if (!exists) {
      await db.nodes.add(newNode);
      await loadNodes();
    }
  };

  // Remove single node and recursive children
  const deleteSingleNode = async (nodeId: string) => {
    await db.transaction('rw', db.nodes, async () => {
      const children = await db.nodes.where({ parentId: nodeId }).toArray();
      for (const child of children) {
        await deleteSingleNode(child.id);
      }
      await db.nodes.delete(nodeId);
    });
    await loadNodes();
  };

  // Move node hierarchically
  const moveNode = async (nodeId: string, rawParentId: string, index: number) => {
    const parentId = rawParentId === '0' || !rawParentId ? null : `chrome-${rawParentId}`;
    await db.nodes.update(nodeId, { parentId, orderIndex: index });
    await loadNodes();
  };

  // Update specific node details
  const updateNodeTitleAndUrl = async (nodeId: string, title: string, url?: string) => {
    const updateData: Partial<BookmarkNode> = { title };
    if (url) updateData.url = url;
    await db.nodes.update(nodeId, updateData);
    await loadNodes();
  };

  // Synchronize all Chrome bookmarks to IndexedDB (One-click Incremental Sync)
  const syncChromeBookmarks = async () => {
    if (typeof chrome === 'undefined' || !chrome.bookmarks) {
      throw new Error('Not running in a Chrome Extension environment');
    }
    
    return new Promise<{ added: number; updated: number; deleted: number }>((resolve, reject) => {
      chrome.bookmarks.getTree(async (results) => {
        try {
          const flatNodes = flattenChromeBookmarks(results as any[]);
          
          const existingNodes = await db.nodes.toArray();
          const existingMap = new Map<string, BookmarkNode>();
          existingNodes.forEach(node => {
            if (node.id.startsWith('chrome-')) {
              existingMap.set(node.id, node);
            }
          });

          let addedCount = 0;
          let updatedCount = 0;
          const currentIds = new Set(flatNodes.map(n => n.id));
          const idsToDelete: string[] = [];

          existingMap.forEach((node, id) => {
            if (!currentIds.has(id)) {
              idsToDelete.push(id);
            }
          });

          await db.transaction('rw', db.nodes, async () => {
            // 1. Perform upserts for current Chrome nodes
            for (const node of flatNodes) {
              if (existingMap.has(node.id)) {
                // Update modified folders/bookmarks, preserving custom tags and icon
                await db.nodes.update(node.id, {
                  parentId: node.parentId,
                  title: node.title,
                  url: node.url,
                  orderIndex: node.orderIndex,
                  lastModified: Math.floor(Date.now() / 1000)
                });
                updatedCount++;
              } else {
                // Add new bookmark / folder
                await db.nodes.add(node);
                addedCount++;
              }
            }

            // 2. Remove Chrome bookmarks deleted in the browser
            if (idsToDelete.length > 0) {
              await db.nodes.bulkDelete(idsToDelete);
            }
          });

          await loadNodes();
          resolve({ added: addedCount, updated: updatedCount, deleted: idsToDelete.length });
        } catch (err) {
          reject(err);
        }
      });
    });
  };

  return {
    nodes,
    isLoaded,
    loadNodes,
    saveParsedNodes,
    mergeNodes,
    updateTags,
    updateIcon,
    updateUrl,
    updateTitleAndUrl,
    bookmarksWithoutIcon,
    bookmarksWithoutTags,
    bookmarksWithEncodedUrl,
    bookmarksWithUrlAsTitle,
    getTree,
    clearAll,
    getParentFolderNames,
    getFolderTags,
    syncSingleNode,
    deleteSingleNode,
    moveNode,
    updateNodeTitleAndUrl,
    syncChromeBookmarks
  };
});

