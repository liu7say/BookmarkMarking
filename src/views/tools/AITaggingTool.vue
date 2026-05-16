<template>
  <div class="tools-container">
    <section class="tool-section fluent-card">
      <div class="section-header">
        <div class="section-title">
          <Sparkles :size="20" class="section-icon" style="color: #8B5CF6;" />
          <h2>AI 自动打标</h2>
        </div>
        <p class="section-desc">调用大语言模型，为尚未分类的书签自动生成并补充标签。</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ totalBookmarks }}</span>
          <span class="stat-label">总书签数</span>
        </div>
        <div class="stat-card stat-warning">
          <span class="stat-value">{{ missingTagsCount }}</span>
          <span class="stat-label">缺少标签</span>
        </div>
      </div>

      <!-- 缺少标签列表预览 -->
      <div class="missing-list-section" v-if="missingTagsCount > 0 && !taskStore.isTagging">
        <div class="missing-list-header" @click="isMissingTagsListOpen = !isMissingTagsListOpen">
          <span class="missing-list-title">查看待打标书签列表 ({{ missingTagsCount }})</span>
          <component :is="isMissingTagsListOpen ? ChevronDown : ChevronRight" :size="16" />
        </div>
        <div class="missing-list-content missing-list" v-if="isMissingTagsListOpen">
          <div class="missing-item" v-for="node in store.bookmarksWithoutTags" :key="node.id">
            <span class="missing-item-title" :title="node.title">{{ node.title }}</span>
            <span class="missing-item-url" :title="node.url">
              <span class="url-text">{{ node.url }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 进度区域 -->
      <div class="progress-area" v-if="taskStore.isTagging || taskStore.tagLogs.length > 0">
        <div class="progress-bar-wrapper" v-if="taskStore.isTagging">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: taskStore.tagProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ taskStore.tagProcessedCount }} / {{ taskStore.tagTargetCount }}（{{ taskStore.tagProgress }}%）</span>
        </div>
        <div class="current-item" v-if="taskStore.isTagging">
          <span class="current-label">并发打标中，{{ taskStore.tagConcurrency }} 线程</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-row">
        <FButton 
          v-if="!taskStore.isTagging" 
          :disabled="missingTagsCount === 0 || taskStore.isFetchingIcon"
          :icon="Play"
          @click="taskStore.startAITagging"
        >
          <span>{{ missingTagsCount === 0 ? '所有书签已有标签' : '开始自动打标' }}</span>
        </FButton>

        <!-- 并发数设置 -->
        <div class="concurrency-control" v-if="!taskStore.isTagging">
          <label class="concurrency-label">并发数(防频控)</label>
          <FInput 
            type="number" 
            v-model.number="taskStore.tagConcurrency" 
            class="concurrency-input"
            style="width: 80px;"
          />
        </div>
        
        <FButton 
          v-else
          variant="danger"
          :icon="Square"
          @click="taskStore.cancelAITagging"
        >
          取消任务
        </FButton>
      </div>

      <!-- 文件夹打标黑名单设置 (新位置) -->
      <div class="blacklist-section" v-if="!taskStore.isTagging">
        <div class="blacklist-header">
          <div class="blacklist-title">
            <FolderX :size="16" class="blacklist-icon" />
            <h3>文件夹打标黑名单</h3>
          </div>
          <p class="blacklist-desc">打标时自动提取父文件夹名称，黑名单中的名称将被跳过。</p>
        </div>
        <div class="blacklist-container">
          <div class="blacklist-tags">
            <div v-for="item in settingsStore.folderTagBlacklist" :key="item" class="blacklist-tag">
              <span>{{ item }}</span>
              <button @click="settingsStore.folderTagBlacklist = settingsStore.folderTagBlacklist.filter(i => i !== item)" class="remove-tag">×</button>
            </div>
            <div v-if="settingsStore.folderTagBlacklist.length === 0" class="empty-blacklist">暂无黑名单</div>
          </div>
          <div class="blacklist-input-row">
            <FInput 
              v-model="newBlacklistItem" 
              placeholder="输入要忽略的文件夹名称" 
              @keyup.enter="addBlacklistItem"
              class="blacklist-input"
            />
            <FButton size="sm" @click="addBlacklistItem">添加</FButton>
          </div>
        </div>
      </div>

      <!-- 处理日志 -->
      <div class="log-area" v-if="taskStore.tagLogs.length > 0">
        <h3 class="log-title">处理日志</h3>
        <div class="log-list">
          <div 
            class="log-item ai-log-wrapper" 
            v-for="log in taskStore.tagLogs" 
            :key="log.id"
            :class="{ 'log-success': log.success, 'log-fail': !log.success, 'is-expanded': log.isExpanded }"
          >
            <div class="log-item-header" @click="log.isExpanded = !log.isExpanded">
              <span class="log-status">{{ log.success ? '✓' : '✗' }}</span>
              <span class="log-name">{{ log.title }}</span>
              <span class="log-detail" v-if="!log.success">{{ log.error }}</span>
              <span class="log-detail" v-else>标签: {{ log.tags?.join(', ') }}</span>
              <component :is="log.isExpanded ? ChevronDown : ChevronRight" :size="14" class="expand-icon" />
            </div>
            <div class="log-item-details" v-if="log.isExpanded">
              <div class="detail-block">
                <strong>发送给 AI 的内容 (Prompt)：</strong>
                <pre>{{ log.promptUsed || '无记录' }}</pre>
              </div>
              <div class="detail-block">
                <strong>AI 返回的原始内容：</strong>
                <pre>{{ log.rawResponse || '无记录' }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBookmarkStore } from '@/stores/bookmark';
import { useTaskStore } from '@/stores/task';
import { useSettingsStore } from '@/stores/settings';
import { Play, Square, ChevronDown, ChevronRight, Sparkles, FolderX } from 'lucide-vue-next';
import FButton from '@/components/common/FButton.vue';
import FInput from '@/components/common/FInput.vue';

const store = useBookmarkStore();
const taskStore = useTaskStore();
const settingsStore = useSettingsStore();

const missingTagsCount = computed(() => store.bookmarksWithoutTags.length);
const totalBookmarks = computed(() => store.nodes.filter(n => n.type === 'bookmark').length);

const isMissingTagsListOpen = ref(false);

const newBlacklistItem = ref('');
const addBlacklistItem = () => {
  const val = newBlacklistItem.value.trim();
  if (val && !settingsStore.folderTagBlacklist.includes(val)) {
    settingsStore.folderTagBlacklist.push(val);
    newBlacklistItem.value = '';
  }
};
</script>

<style scoped>
@import '@/assets/tools.css';

.concurrency-input :deep(.f-input) {
  text-align: center;
  padding: 6px 8px;
}

.blacklist-section {
  margin: 24px 0;
  padding-top: 24px;
  border-top: 1px solid var(--border-subtle);
}

.blacklist-header {
  margin-bottom: 16px;
}

.blacklist-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.blacklist-title h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}

.blacklist-icon {
  color: #EF4444;
}

.blacklist-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.blacklist-container {
  background: rgba(0, 0, 0, 0.02);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.blacklist-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.blacklist-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  font-size: 12px;
  color: var(--text-primary);
  transition: all 0.2s;
}

.blacklist-tag:hover {
  border-color: var(--fluent-blue-light);
}

.remove-tag {
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0 2px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-tag:hover {
  color: #EF4444;
}

.empty-blacklist {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

.blacklist-input-row {
  display: flex;
  gap: 8px;
}

.blacklist-input-row .blacklist-input {
  flex: 1;
}

@media (prefers-color-scheme: dark) {
  .blacklist-container {
    background: rgba(0, 0, 0, 0.2);
  }
}
</style>
