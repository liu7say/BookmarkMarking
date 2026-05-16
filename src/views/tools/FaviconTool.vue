<template>
  <div class="tools-container">
    <section class="tool-section fluent-card">
      <div class="section-header">
        <div class="section-title">
          <Image :size="20" class="section-icon" style="color: #D97706;" />
          <h2>抓取缺失的网站图标</h2>
        </div>
        <p class="section-desc">自动扫描并为缺少图标（Favicon）的书签补充图标，让书签栏更美观。</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ totalBookmarks }}</span>
          <span class="stat-label">总书签数</span>
        </div>
        <div class="stat-card stat-warning">
          <span class="stat-value">{{ missingIconCount }}</span>
          <span class="stat-label">缺少图标</span>
        </div>
        <div class="stat-card success" v-if="taskStore.iconSuccessCount > 0 || taskStore.isFetchingIcon">
          <span class="stat-value">{{ taskStore.iconSuccessCount }}</span>
          <span class="stat-label">成功抓取</span>
        </div>
        <div class="stat-card danger" v-if="taskStore.iconFailCount > 0 || taskStore.isFetchingIcon">
          <span class="stat-value">{{ taskStore.iconFailCount }}</span>
          <span class="stat-label">抓取失败</span>
        </div>
      </div>

      <!-- 缺少图标列表预览 -->
      <div class="missing-list-section" v-if="missingIconCount > 0 && !taskStore.isFetchingIcon">
        <div class="missing-list-header" @click="isMissingListOpen = !isMissingListOpen">
          <span class="missing-list-title">查看缺少图标的书签列表 ({{ missingIconCount }})</span>
          <component :is="isMissingListOpen ? ChevronDown : ChevronRight" :size="16" />
        </div>
        <div class="missing-list-content missing-list" v-if="isMissingListOpen">
          <div class="missing-item" v-for="node in store.bookmarksWithoutIcon" :key="node.id">
            <span class="missing-item-title" :title="node.title">{{ node.title }}</span>
            <a :href="node.url" target="_blank" class="missing-item-url" :title="node.url">
              <span class="url-text">{{ node.url }}</span>
              <ExternalLink :size="12" class="ext-icon" />
            </a>
          </div>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="progress-area" v-if="taskStore.isFetchingIcon || taskStore.iconLogs.length > 0">
        <div class="progress-bar-wrapper" v-if="taskStore.isFetchingIcon">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: taskStore.iconProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ taskStore.iconProcessedCount }} / {{ taskStore.iconTargetCount }}（{{ taskStore.iconProgress }}%）</span>
        </div>
        <div class="current-item" v-if="taskStore.isFetchingIcon">
          <span class="current-label">并发执行中，{{ taskStore.iconConcurrency }} 线程</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-row">
        <FButton 
          v-if="!taskStore.isFetchingIcon" 
          :disabled="missingIconCount === 0 || taskStore.isTagging"
          :icon="Play"
          @click="taskStore.startFetchingIcon"
        >
          <span>{{ missingIconCount === 0 ? '所有书签已有图标' : '开始抓取' }}</span>
        </FButton>
        <div class="concurrency-control" v-if="!taskStore.isFetchingIcon">
          <label class="concurrency-label">并发数(1-20)</label>
          <FInput 
            type="number" 
            v-model.number="taskStore.iconConcurrency" 
            class="concurrency-input"
            style="width: 80px;"
          />
        </div>
        <FButton 
          v-else
          variant="danger"
          :icon="Square"
          @click="taskStore.cancelFetchingIcon"
        >
          取消任务
        </FButton>
      </div>

      <!-- 处理日志 -->
      <div class="log-area" v-if="taskStore.iconLogs.length > 0">
        <h3 class="log-title">处理日志</h3>
        <div class="log-list">
          <div 
            class="log-item" 
            v-for="log in taskStore.iconLogs" 
            :key="log.id"
            :class="{ 'log-success': log.success, 'log-fail': !log.success }"
          >
            <span class="log-status">{{ log.success ? '✓' : '✗' }}</span>
            <span class="log-name">{{ log.title }}</span>
            <span class="log-detail" v-if="!log.success">{{ log.error }}</span>
            <span class="log-detail" v-else>{{ log.source }}</span>
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
import { Play, Square, ChevronDown, ChevronRight, Image, ExternalLink } from 'lucide-vue-next';
import FButton from '@/components/common/FButton.vue';
import FInput from '@/components/common/FInput.vue';

const store = useBookmarkStore();
const taskStore = useTaskStore();

const missingIconCount = computed(() => store.bookmarksWithoutIcon.length);
const totalBookmarks = computed(() => store.nodes.filter(n => n.type === 'bookmark').length);

const isMissingListOpen = ref(false);
</script>

<style scoped>
@import '@/assets/tools.css';

.concurrency-input :deep(.f-input) {
  text-align: center;
  padding: 6px 8px;
}
</style>
