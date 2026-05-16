import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';

export interface AIProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const useSettingsStore = defineStore('settings', () => {
  // Default prompt template
  const defaultPrompt = `请根据以下书签的标题、URL以及抓取到的网页简介，为其生成 1~3 个高度概括的分类标签。
请直接返回一个 JSON 格式 of 字符串数组，例如：["技术", "前端", "Vue"]。
不要输出任何其他解释性文字，除了合法的 JSON 数组不要包含任何内容。

书签标题：{{title}}
书签URL：{{url}}
网页简介：
{{content}}`;

  // State
  const providers = ref<AIProviderConfig[]>([]);
  const activeProviderId = ref<string>('');
  
  const aiPromptTemplate = ref(defaultPrompt);
  const showAILogDetails = ref(false); // 是否显示单点打标日志详情

  // 并发设置
  const tagConcurrency = ref(2);
  const titleConcurrency = ref(2);
  const iconConcurrency = ref(5);

  // 文件夹打标黑名单
  const folderTagBlacklist = ref<string[]>(['书签栏', '其他书签', '移动书签', 'Bookmarks Bar', 'Other Bookmarks', 'Mobile Bookmarks']);

  // Computed
  const activeProvider = computed(() => {
    return providers.value.find(p => p.id === activeProviderId.value) || null;
  });

  // Initialize from localStorage
  const loadSettings = () => {
    const savedProviders = localStorage.getItem('aiProviders');
    const savedActiveId = localStorage.getItem('activeProviderId');
    const savedPrompt = localStorage.getItem('aiPromptTemplate');
    const savedShowLogs = localStorage.getItem('showAILogDetails');
    
    const savedTagC = localStorage.getItem('tagConcurrency');
    const savedTitleC = localStorage.getItem('titleConcurrency');
    const savedIconC = localStorage.getItem('iconConcurrency');
    
    const savedBlacklist = localStorage.getItem('folderTagBlacklist');

    if (savedProviders) {
      try {
        providers.value = JSON.parse(savedProviders);
        if (savedActiveId) {
          activeProviderId.value = savedActiveId;
        } else if (providers.value.length > 0) {
          activeProviderId.value = providers.value[0]?.id || '';
        }
      } catch (e) {
        console.error('Failed to load providers', e);
      }
    } else {
      // 兼容旧数据
      const savedBaseUrl = localStorage.getItem('aiBaseUrl');
      const savedApiKey = localStorage.getItem('aiApiKey');
      const savedModel = localStorage.getItem('aiModel');

      const defaultId = 'default-' + Date.now();
      providers.value = [{
        id: defaultId,
        name: '默认配置 (DeepSeek)',
        baseUrl: savedBaseUrl || 'https://api.deepseek.com/v1',
        apiKey: savedApiKey || '',
        model: savedModel || 'deepseek-chat'
      }];
      activeProviderId.value = defaultId;
      
      localStorage.removeItem('aiBaseUrl');
      localStorage.removeItem('aiApiKey');
      localStorage.removeItem('aiModel');
    }

    if (savedPrompt) aiPromptTemplate.value = savedPrompt;
    if (savedShowLogs !== null) showAILogDetails.value = savedShowLogs === 'true';
    
    if (savedTagC) tagConcurrency.value = parseInt(savedTagC);
    if (savedTitleC) titleConcurrency.value = parseInt(savedTitleC);
    if (savedIconC) iconConcurrency.value = parseInt(savedIconC);
    
    if (savedBlacklist) {
      try {
        folderTagBlacklist.value = JSON.parse(savedBlacklist);
      } catch (e) {
        console.error('Failed to load folderTagBlacklist', e);
      }
    }
  };

  // Save to localStorage when changed
  watch([providers, activeProviderId, aiPromptTemplate, showAILogDetails, tagConcurrency, titleConcurrency, iconConcurrency, folderTagBlacklist], () => {
    localStorage.setItem('aiProviders', JSON.stringify(providers.value));
    localStorage.setItem('activeProviderId', activeProviderId.value);
    localStorage.setItem('aiPromptTemplate', aiPromptTemplate.value);
    localStorage.setItem('showAILogDetails', String(showAILogDetails.value));
    
    localStorage.setItem('tagConcurrency', String(tagConcurrency.value));
    localStorage.setItem('titleConcurrency', String(titleConcurrency.value));
    localStorage.setItem('iconConcurrency', String(iconConcurrency.value));
    
    localStorage.setItem('folderTagBlacklist', JSON.stringify(folderTagBlacklist.value));
  }, { deep: true });

  // Initial load
  loadSettings();

  const resetPrompt = () => {
    aiPromptTemplate.value = defaultPrompt;
  };

  const addNewProvider = () => {
    const id = 'provider-' + Date.now();
    providers.value.push({
      id,
      name: '新配置',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat'
    });
    activeProviderId.value = id;
  };

  const removeProvider = (id: string) => {
    providers.value = providers.value.filter(p => p.id !== id);
    if (activeProviderId.value === id && providers.value.length > 0) {
      activeProviderId.value = providers.value[0]?.id || '';
    } else if (providers.value.length === 0) {
      activeProviderId.value = '';
    }
  };

  return {
    providers,
    activeProviderId,
    activeProvider,
    aiPromptTemplate,
    showAILogDetails,
    tagConcurrency,
    titleConcurrency,
    iconConcurrency,
    folderTagBlacklist,
    resetPrompt,
    addNewProvider,
    removeProvider
  };
});
