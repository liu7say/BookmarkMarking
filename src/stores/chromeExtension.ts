import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useBookmarkStore } from './bookmark';

export const useChromeExtensionStore = defineStore('chromeExtension', () => {
  const bookmarkStore = useBookmarkStore();
  const isActiveTabLoaded = ref(false);
  const activeTabInfo = ref<{ title: string; url: string; favIconUrl?: string } | null>(null);

  /**
   * Initialize extension bindings and register real-time bookmarks mutation event listeners
   */
  const initExtension = async () => {
    if (typeof chrome === 'undefined' || !chrome.bookmarks) {
      console.log('Not running in Chrome Extension environment, skipping real-time listeners.');
      return;
    }

    // 1. Fetch current active tab details
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url && activeTab.title) {
          activeTabInfo.value = {
            title: activeTab.title,
            url: activeTab.url,
            favIconUrl: activeTab.favIconUrl
          };
          isActiveTabLoaded.value = true;
        }
      });
    } catch (err) {
      console.warn('Failed to query active tab:', err);
    }

    // 2. Bind active real-time bookmarks synchronization event listeners
    // Avoid binding duplicate listeners if already registered
    try {
      chrome.bookmarks.onCreated.addListener(async (id, node) => {
        console.log('Chrome bookmark created event detected:', id, node.title);
        await bookmarkStore.syncSingleNode(node);
      });

      chrome.bookmarks.onRemoved.addListener(async (id) => {
        console.log('Chrome bookmark removed event detected:', id);
        await bookmarkStore.deleteSingleNode(`chrome-${id}`);
      });

      chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
        console.log('Chrome bookmark changed event detected:', id, changeInfo.title);
        await bookmarkStore.updateNodeTitleAndUrl(`chrome-${id}`, changeInfo.title, changeInfo.url);
      });

      chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
        console.log('Chrome bookmark moved event detected:', id, moveInfo.parentId);
        await bookmarkStore.moveNode(`chrome-${id}`, moveInfo.parentId, moveInfo.index);
      });
    } catch (err) {
      console.error('Failed to attach Chrome bookmark event listeners:', err);
    }
  };

  /**
   * Adds the current tab to Chrome's native bookmarks, which will automatically
   * fire onCreated and sync to our Dexie.js database in real-time.
   */
  const addActiveTabToBookmarks = async (targetParentId: string | null = null) => {
    if (!activeTabInfo.value || typeof chrome === 'undefined' || !chrome.bookmarks) {
      return;
    }
    
    // Parent ID '1' is typically the Chrome bookmarks bar
    const destParentId = targetParentId ? targetParentId.replace('chrome-', '') : '1';
    
    try {
      chrome.bookmarks.create({
        parentId: destParentId,
        title: activeTabInfo.value.title,
        url: activeTabInfo.value.url
      }, (result) => {
        console.log('Successfully saved current tab to Chrome bookmarks:', result);
      });
    } catch (err) {
      console.error('Failed to save current tab to Chrome bookmarks:', err);
    }
  };

  return {
    activeTabInfo,
    isActiveTabLoaded,
    initExtension,
    addActiveTabToBookmarks
  };
});
export type ChromeExtensionStore = ReturnType<typeof useChromeExtensionStore>;
