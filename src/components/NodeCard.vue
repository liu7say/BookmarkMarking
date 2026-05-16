<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronRight, ChevronDown, Folder, Link as LinkIcon, Tag, Sparkles, X } from 'lucide-vue-next';
import { generateTagsForBookmark, type AITaggingResult } from '../utils/aiService';
import { useBookmarkStore } from '../stores/bookmark';
import { useSettingsStore } from '../stores/settings';
import { useTaskStore } from '../stores/task';
import FButton from './common/FButton.vue';

interface TreeNode {
  id: string;
  parentId: string | null;
  type: 'folder' | 'bookmark';
  title: string;
  url?: string;
  icon?: string;
  addDate?: number;
  customTags: string[];
  children: TreeNode[];
}

const props = defineProps<{
  node: TreeNode;
}>();

const emit = defineEmits<{
  (e: 'edit-tag', node: TreeNode): void
}>();

const isExpanded = ref(props.node.parentId === null);

const toggleExpand = () => {
  if (props.node.type === 'folder') {
    isExpanded.value = !isExpanded.value;
  }
};

const store = useBookmarkStore();
const settingsStore = useSettingsStore();
const taskStore = useTaskStore();

const aiLogResult = ref<AITaggingResult | null>(null);

const handleAITagging = async () => {
  if (taskStore.isAnyTagging || props.node.type !== 'bookmark') {
    if (taskStore.isAnyTagging) {
      alert('当前已有打标任务正在进行，请稍后再试。');
    }
    return;
  }
  
  taskStore.isSingleTagging = true;
  aiLogResult.value = null; // reset
  try {
    const result = await generateTagsForBookmark(props.node.title, props.node.url || '');
    aiLogResult.value = result;
    
    if (result.success && result.tags) {
      // 合并旧标签并去重
      const currentTags = props.node.customTags || [];
      
      // 获取文件夹标签
      const folderTags = store.getFolderTags(props.node.id, settingsStore.folderTagBlacklist);
      
      const mergedTags = Array.from(new Set([...currentTags, ...result.tags, ...folderTags]));
      await store.updateTags(props.node.id, mergedTags);
    }
  } catch (err: any) {
    aiLogResult.value = { success: false, error: `错误: ${err.message}` };
  } finally {
    taskStore.isSingleTagging = false;
  }
};

const defaultIcon = computed(() => {
  return props.node.type === 'folder' ? Folder : LinkIcon;
});
</script>

<template>
  <div class="node-wrapper">
    <!-- Node Content -->
    <div class="node-card fluent-card" 
         :class="{ 'is-folder': node.type === 'folder' }"
         @click="toggleExpand">
         
      <div class="node-left">
        <!-- Chevron for Folders -->
        <span v-if="node.type === 'folder'" class="chevron">
          <ChevronDown v-if="isExpanded" :size="16" />
          <ChevronRight v-else :size="16" />
        </span>
        <span v-else class="chevron-placeholder"></span>

        <!-- Icon -->
        <img v-if="node.type === 'bookmark' && node.icon" :src="node.icon" class="favicon" />
        <component v-else :is="defaultIcon" :size="16" class="default-icon" :class="{ 'folder-icon': node.type === 'folder' }" />

        <!-- Title & Link -->
        <div class="node-info">
          <span class="node-title" :title="node.title">{{ node.title }}</span>
          <a v-if="node.type === 'bookmark'" :href="node.url" target="_blank" @click.stop class="node-url">{{ node.url }}</a>
        </div>
      </div>

      <div class="node-right" v-if="node.type === 'bookmark'">
        <!-- 自定义标签（仅书签类型支持） -->
        <div class="tags" v-if="node.customTags && node.customTags.length > 0">
          <span class="tag-badge" v-for="tag in node.customTags" :key="tag">
            {{ tag }}
          </span>
        </div>
        <!-- AI 打标按钮 -->
        <FButton 
          variant="subtle"
          size="sm"
          class="icon-btn ai-btn" 
          :loading="taskStore.isSingleTagging && aiLogResult === null"
          :icon="Sparkles"
          :disabled="taskStore.isAnyTagging"
          title="AI 自动生成标签"
          @click.stop="handleAITagging" 
        />
        
        <!-- 添加/编辑标签按钮 -->
        <FButton 
          variant="subtle"
          size="sm"
          class="icon-btn" 
          :icon="Tag"
          title="添加/编辑标签"
          @click.stop="$emit('edit-tag', node)"
        />
      </div>
    </div>

    <!-- AI 打标详情面板 -->
    <div class="ai-log-details" v-if="aiLogResult && (settingsStore.showAILogDetails || !aiLogResult.success)">
      <div class="ai-log-header" :style="{ marginBottom: settingsStore.showAILogDetails ? '12px' : '0' }">
        <span class="log-status" :class="aiLogResult.success ? 'success' : 'error'">
          {{ aiLogResult.success ? '✨ 打标成功' : '❌ 打标失败' }}
        </span>
        <span class="log-error-text" v-if="!aiLogResult.success">{{ aiLogResult.error }}</span>
        <FButton 
          variant="subtle"
          size="sm"
          class="close-btn" 
          :icon="X"
          title="关闭"
          @click="aiLogResult = null"
        />
      </div>
      <template v-if="settingsStore.showAILogDetails">
        <div class="detail-block">
          <strong>发送给 AI 的内容 (Prompt)：</strong>
          <pre>{{ aiLogResult.promptUsed || '无记录' }}</pre>
        </div>
        <div class="detail-block">
          <strong>AI 返回的原始内容：</strong>
          <pre>{{ aiLogResult.rawResponse || '无记录' }}</pre>
        </div>
      </template>
    </div>

    <!-- Recursive Children Render -->
    <div class="node-children" v-if="node.type === 'folder' && isExpanded">
      <NodeCard v-for="child in node.children" :key="child.id" :node="child" @edit-tag="$emit('edit-tag', $event)" />
    </div>
  </div>
</template>

<style scoped>
.node-wrapper {
  margin-bottom: 4px;
}

.node-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: transparent;
  box-shadow: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.node-card:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

@media (prefers-color-scheme: dark) {
  .node-card:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.node-card.is-folder {
  font-weight: 500;
}

.node-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  flex: 1;
}

.chevron, .chevron-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
  transition: transform var(--fluent-duration) var(--fluent-easing);
}

.favicon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.default-icon {
  color: var(--text-secondary);
}

.folder-icon {
  color: #F8D775;
  fill: #F8D775;
}

.node-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.node-title {
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-url {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
}

.node-url:hover {
  text-decoration: underline;
  color: var(--fluent-blue);
}

.node-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tags {
  display: flex;
  gap: 4px;
}

.tag-badge {
  font-size: 10px;
  background-color: var(--fluent-blue);
  color: white;
  padding: 2px 6px;
  border-radius: 12px;
  font-weight: 500;
}

.icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  opacity: 0;
  border: none;
}

.node-card:hover .icon-btn {
  opacity: 1;
}

.node-children {
  padding-left: 24px;
  margin-top: 4px;
  border-left: 1px dashed var(--border-subtle);
  margin-left: 10px;
}

.ai-btn {
  color: #8B5CF6;
}

.ai-btn:hover {
  background-color: rgba(139, 92, 246, 0.1) !important;
}

/* AI 日志面板样式 */
.ai-log-details {
  margin: 4px 0 8px 24px;
  padding: 12px;
  background-color: var(--bg-card);
  border: 1px solid var(--fluent-blue);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  font-size: 13px;
  animation: slide-down 200ms var(--fluent-easing);
}

@media (prefers-color-scheme: dark) {
  .ai-log-details {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.ai-log-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.log-status {
  font-weight: 600;
}

.log-status.success {
  color: #059669;
}

.log-status.error {
  color: #DC2626;
}

.log-error-text {
  color: #DC2626;
  font-size: 12px;
}

.close-btn {
  margin-left: auto;
  width: 24px;
  height: 24px;
  opacity: 1; /* Keep close button visible */
}

.detail-block {
  margin-bottom: 12px;
}

.detail-block:last-child {
  margin-bottom: 0;
}

.detail-block strong {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.detail-block pre {
  margin: 0;
  padding: 8px 10px;
  background-color: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
  max-height: 200px;
  overflow-y: auto;
}

@media (prefers-color-scheme: dark) {
  .detail-block pre {
    background-color: rgba(0, 0, 0, 0.2);
  }
}
</style>
