import { defineStore, storeToRefs } from 'pinia';
import { ref, computed } from 'vue';
import { useBookmarkStore } from './bookmark';
import { useSettingsStore } from './settings';
import { fetchFaviconForBookmark, runWithConcurrency, type FetchResult } from '../utils/faviconFetcher';
import { generateTagsForBookmark, generateTitleForBookmark, type AITaggingResult, type AITitleResult } from '../utils/aiService';

export const useTaskStore = defineStore('task', () => {
  const bookmarkStore = useBookmarkStore();
  const settingsStore = useSettingsStore();
  const { tagConcurrency, titleConcurrency, iconConcurrency } = storeToRefs(settingsStore);

  // ========== Favicon 抓取状态 ==========
  const isFetchingIcon = ref(false);
  const iconProcessedCount = ref(0);
  const iconSuccessCount = ref(0);
  const iconFailCount = ref(0);
  const iconLogs = ref<FetchResult[]>([]);
  const iconTargetCount = ref(0);
  let iconAbortController: AbortController | null = null;

  const iconProgress = computed(() => {
    if (iconTargetCount.value === 0) return 0;
    return Math.round((iconProcessedCount.value / iconTargetCount.value) * 100);
  });

  const startFetchingIcon = async () => {
    if (isFetchingIcon.value) return;

    const targets = bookmarkStore.bookmarksWithoutIcon;
    if (targets.length === 0) return;

    isFetchingIcon.value = true;
    iconProcessedCount.value = 0;
    iconSuccessCount.value = 0;
    iconFailCount.value = 0;
    iconLogs.value = [];
    iconTargetCount.value = targets.length;
    iconAbortController = new AbortController();

    const snapshot = [...targets];
    const tasks = snapshot.map((bookmark) => {
      return () => fetchFaviconForBookmark(bookmark, iconAbortController?.signal);
    });

    await runWithConcurrency(
      tasks,
      iconConcurrency.value,
      async (result: FetchResult) => {
        iconProcessedCount.value++;
        if (result.success && result.icon) {
          await bookmarkStore.updateIcon(result.id, result.icon);
          iconSuccessCount.value++;
        } else {
          iconFailCount.value++;
        }
        iconLogs.value.unshift(result);
      },
      iconAbortController.signal
    );

    isFetchingIcon.value = false;
    iconAbortController = null;
  };

  const cancelFetchingIcon = () => {
    if (iconAbortController) {
      iconAbortController.abort();
    }
    isFetchingIcon.value = false;
  };

  // ========== AI 批量打标状态 ==========
  const isTagging = ref(false); // 批量打标中
  const isSingleTagging = ref(false); // 单点打标中
  
  const isAnyTagging = computed(() => isTagging.value || isSingleTagging.value);

  const isCoreTaskRunning = computed(() => isAnyTagging.value || isDecodingUrl.value || isGeneratingTitle.value);
  const tagProcessedCount = ref(0);
  const tagSuccessCount = ref(0);
  const tagFailCount = ref(0);
  const tagLogs = ref<(AITaggingResult & { id: string, title: string, isExpanded?: boolean })[]>([]);
  const tagTargetCount = ref(0);
  let tagAbortController: AbortController | null = null;

  const tagProgress = computed(() => {
    if (tagTargetCount.value === 0) return 0;
    return Math.round((tagProcessedCount.value / tagTargetCount.value) * 100);
  });

  const startAITagging = async () => {
    if (isCoreTaskRunning.value) {
      alert('当前已有核心任务正在进行，请稍后再试。');
      return;
    }

    const targets = bookmarkStore.bookmarksWithoutTags;
    if (targets.length === 0) return;

    isTagging.value = true;
    tagProcessedCount.value = 0;
    tagSuccessCount.value = 0;
    tagFailCount.value = 0;
    tagLogs.value = [];
    tagTargetCount.value = targets.length;
    tagAbortController = new AbortController();

    const snapshot = [...targets];
    const tasks = snapshot.map((bookmark) => {
      return async () => {
        const result = await generateTagsForBookmark(bookmark.title, bookmark.url || '', tagAbortController?.signal);
        return { ...result, id: bookmark.id, title: bookmark.title };
      };
    });

    await runWithConcurrency(
      tasks,
      tagConcurrency.value,
      async (result) => {
        tagProcessedCount.value++;
        if (result.success && result.tags) {
          const node = bookmarkStore.nodes.find(n => n.id === result.id);
          const currentTags = node?.customTags || [];
          
          // 获取文件夹标签
          const folderTags = bookmarkStore.getFolderTags(result.id, settingsStore.folderTagBlacklist);
          
          // 合并：原标签 + AI 标签 + 文件夹标签
          const mergedTags = Array.from(new Set([...currentTags, ...result.tags, ...folderTags]));
          
          await bookmarkStore.updateTags(result.id, mergedTags);
          tagSuccessCount.value++;
        } else {
          tagFailCount.value++;
        }
        tagLogs.value.unshift(result);
      },
      tagAbortController.signal
    );

    isTagging.value = false;
    tagAbortController = null;
  };

  const cancelAITagging = () => {
    if (tagAbortController) {
      tagAbortController.abort();
    }
    isTagging.value = false;
  };

  // ========== URL 解码状态 ==========
  const isDecodingUrl = ref(false);
  const decodeProcessedCount = ref(0);
  const decodeSuccessCount = ref(0);
  const decodeFailCount = ref(0);
  const decodeLogs = ref<{ id: string, title: string, oldUrl: string, newUrl: string, success: boolean, error?: string, isExpanded?: boolean }[]>([]);
  const decodeTargetCount = ref(0);
  
  const decodeProgress = computed(() => {
    if (decodeTargetCount.value === 0) return 0;
    return Math.round((decodeProcessedCount.value / decodeTargetCount.value) * 100);
  });

  const startDecodingUrl = async () => {
    if (isCoreTaskRunning.value) {
      alert('当前已有核心任务正在进行，请稍后再试。');
      return;
    }

    const targets = bookmarkStore.bookmarksWithEncodedUrl;
    if (targets.length === 0) return;

    isDecodingUrl.value = true;
    decodeProcessedCount.value = 0;
    decodeSuccessCount.value = 0;
    decodeFailCount.value = 0;
    decodeLogs.value = [];
    decodeTargetCount.value = targets.length;

    // 快照
    const snapshot = [...targets];

    for (const bm of snapshot) {
      if (!bm.url) continue;
      decodeProcessedCount.value++;
      try {
        const decodedUrl = decodeURI(bm.url);
        let newTitle = bm.title;
        
        if (bm.title === bm.url) {
          newTitle = decodedUrl;
        } else if (bm.title.includes('%')) {
          try {
            newTitle = decodeURI(bm.title);
          } catch (e) {
            // title 解码失败忽略
          }
        }

        if (decodedUrl !== bm.url || newTitle !== bm.title) {
          await bookmarkStore.updateTitleAndUrl(bm.id, newTitle, decodedUrl);
          decodeSuccessCount.value++;
          decodeLogs.value.unshift({
            id: bm.id,
            title: newTitle, // 使用新的标题展示
            oldUrl: bm.url,
            newUrl: decodedUrl,
            success: true
          });
        }
      } catch (err: any) {
        decodeFailCount.value++;
        decodeLogs.value.unshift({
          id: bm.id,
          title: bm.title,
          oldUrl: bm.url,
          newUrl: '',
          success: false,
          error: err.message || '解码失败'
        });
      }
    }

    isDecodingUrl.value = false;
  };


  // ========== AI 提取标题状态 ==========
  const isGeneratingTitle = ref(false);
  const titleProcessedCount = ref(0);
  const titleSuccessCount = ref(0);
  const titleFailCount = ref(0);
  const titleLogs = ref<(AITitleResult & { id: string, oldTitle: string, isExpanded?: boolean })[]>([]);
  const titleTargetCount = ref(0);
  let titleAbortController: AbortController | null = null;

  const titleProgress = computed(() => {
    if (titleTargetCount.value === 0) return 0;
    return Math.round((titleProcessedCount.value / titleTargetCount.value) * 100);
  });

  const startGeneratingTitle = async () => {
    if (isCoreTaskRunning.value) {
      alert('当前已有核心任务正在进行，请稍后再试。');
      return;
    }

    const targets = bookmarkStore.bookmarksWithUrlAsTitle;
    if (targets.length === 0) return;

    isGeneratingTitle.value = true;
    titleProcessedCount.value = 0;
    titleSuccessCount.value = 0;
    titleFailCount.value = 0;
    titleLogs.value = [];
    titleTargetCount.value = targets.length;
    titleAbortController = new AbortController();

    const snapshot = [...targets];
    const tasks = snapshot.map((bookmark) => {
      return async () => {
        const result = await generateTitleForBookmark(bookmark.url || '', titleAbortController?.signal);
        return { ...result, id: bookmark.id, oldTitle: bookmark.title };
      };
    });

    await runWithConcurrency(
      tasks,
      titleConcurrency.value,
      async (result) => {
        titleProcessedCount.value++;
        if (result.success && result.title) {
          // 只更新 title
          await bookmarkStore.updateTitleAndUrl(result.id, result.title, bookmarkStore.nodes.find(n => n.id === result.id)?.url || '');
          titleSuccessCount.value++;
        } else {
          titleFailCount.value++;
        }
        titleLogs.value.unshift(result);
      },
      titleAbortController.signal
    );

    isGeneratingTitle.value = false;
    titleAbortController = null;
  };

  const cancelGeneratingTitle = () => {
    if (titleAbortController) {
      titleAbortController.abort();
    }
    isGeneratingTitle.value = false;
  };

  return {
    isFetchingIcon,
    iconProcessedCount,
    iconSuccessCount,
    iconFailCount,
    iconLogs,
    iconTargetCount,
    iconConcurrency,
    iconProgress,
    startFetchingIcon,
    cancelFetchingIcon,

    isTagging,
    isSingleTagging,
    isAnyTagging,
    isCoreTaskRunning,
    tagProcessedCount,
    tagSuccessCount,
    tagFailCount,
    tagLogs,
    tagTargetCount,
    tagConcurrency,
    tagProgress,
    startAITagging,
    cancelAITagging,

    isDecodingUrl,
    decodeProcessedCount,
    decodeSuccessCount,
    decodeFailCount,
    decodeLogs,
    decodeTargetCount,
    decodeProgress,
    startDecodingUrl,

    isGeneratingTitle,
    titleProcessedCount,
    titleSuccessCount,
    titleFailCount,
    titleLogs,
    titleTargetCount,
    titleConcurrency,
    titleProgress,
    startGeneratingTitle,
    cancelGeneratingTitle
  };
});
