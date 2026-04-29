import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db, type BookmarkNode } from '../db/database';

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

  // 获取缺少 icon 的书签列表
  const bookmarksWithoutIcon = computed(() => {
    return nodes.value.filter(n => n.type === 'bookmark' && !n.icon);
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

  return {
    nodes,
    isLoaded,
    loadNodes,
    saveParsedNodes,
    mergeNodes,
    updateTags,
    updateIcon,
    bookmarksWithoutIcon,
    getTree
  };
});

