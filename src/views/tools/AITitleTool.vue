<template>
  <div class="tools-container">
    <section class="tool-section fluent-card">
      <div class="section-header">
        <div class="section-title">
          <Type :size="20" class="section-icon" style="color: #9333EA;" />
          <h2>AI 批量提取标题</h2>
        </div>
        <p class="section-desc">自动检测标题就是网址的劣质书签，利用 AI 配合网页抓取，智能提炼出该网站真正的名字。</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ totalBookmarks }}</span>
          <span class="stat-label">总书签数</span>
        </div>
        <div class="stat-card stat-warning">
          <span class="stat-value">{{ missingTitleCount }}</span>
          <span class="stat-label">待提取标题</span>
        </div>
        <div class="stat-card success" v-if="taskStore.titleSuccessCount > 0 || taskStore.isGeneratingTitle">
          <span class="stat-value">{{ taskStore.titleSuccessCount }}</span>
          <span class="stat-label">成功提取</span>
        </div>
        <div class="stat-card danger" v-if="taskStore.titleFailCount > 0 || taskStore.isGeneratingTitle">
          <span class="stat-value">{{ taskStore.titleFailCount }}</span>
          <span class="stat-label">提取失败</span>
        </div>
      </div>

      <!-- 缺少标题的列表预览 -->
      <div class="missing-list-section" v-if="missingTitleCount > 0 && !taskStore.isGeneratingTitle">
        <div class="missing-list-header" @click="isMissingTitleListOpen = !isMissingTitleListOpen">
          <span class="missing-list-title">查看待提取书签列表 ({{ missingTitleCount }})</span>
          <component :is="isMissingTitleListOpen ? ChevronDown : ChevronRight" :size="16" />
        </div>
        <div class="missing-list-content missing-list" v-if="isMissingTitleListOpen">
          <div class="missing-item" v-for="node in store.bookmarksWithUrlAsTitle" :key="node.id">
            <span class="missing-item-title" :title="node.title">{{ node.title }}</span>
            <span class="missing-item-url" :title="node.url">
              <span class="url-text">{{ node.url }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 进度区域 -->
      <div class="progress-area" v-if="taskStore.isGeneratingTitle || taskStore.titleLogs.length > 0">
        <div class="progress-bar-wrapper" v-if="taskStore.isGeneratingTitle">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: taskStore.titleProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ taskStore.titleProcessedCount }} / {{ taskStore.titleTargetCount }}（{{ taskStore.titleProgress }}%）</span>
        </div>
        <div class="current-item" v-if="taskStore.isGeneratingTitle">
          <span class="current-label">并发提取中，{{ taskStore.titleConcurrency }} 线程</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-row">
        <FButton 
          v-if="!taskStore.isGeneratingTitle" 
          :disabled="missingTitleCount === 0 || taskStore.isCoreTaskRunning"
          :icon="Play"
          @click="taskStore.startGeneratingTitle"
        >
          <span>{{ missingTitleCount === 0 ? '所有标题已完善' : '开始智能提取' }}</span>
        </FButton>

        <FButton 
          v-else 
          variant="danger"
          :icon="Square"
          @click="taskStore.cancelGeneratingTitle"
        >
          <span>停止提取</span>
        </FButton>

        <div class="concurrency-control" v-if="!taskStore.isGeneratingTitle">
          <span class="concurrency-label">并发数:</span>
          <FInput 
            type="number" 
            v-model.number="taskStore.titleConcurrency" 
            class="concurrency-input"
            style="width: 80px;"
            title="并发处理的书签数量"
          />
        </div>
      </div>

      <!-- 处理日志 -->
      <div class="log-area" v-if="taskStore.titleLogs.length > 0">
        <h3 class="log-title">提取日志</h3>
        <div class="log-list">
          <div 
            class="log-item ai-log-wrapper" 
            v-for="log in taskStore.titleLogs" 
            :key="log.id"
            :class="{ 'log-success': log.success, 'log-fail': !log.success }"
          >
            <div class="log-item-header" @click="log.isExpanded = !log.isExpanded">
              <span class="log-status">{{ log.success ? '✓' : '✗' }}</span>
              <span class="log-name">{{ log.title || '提取失败' }}</span>
              <span class="log-detail" v-if="!log.success">{{ log.error }}</span>
              <component v-if="log.success" :is="log.isExpanded ? ChevronDown : ChevronRight" :size="14" style="color: var(--text-secondary); flex-shrink: 0;" />
            </div>
            
            <div class="log-item-details" v-if="log.success && log.isExpanded">
              <div class="detail-block" style="margin-bottom: 6px;">
                <strong style="display: block; margin-bottom: 4px;">原始标题（即网址）：</strong>
                <div style="font-size: 11px; color: var(--text-secondary); word-break: break-all;">{{ log.oldTitle }}</div>
              </div>
              <div class="detail-block">
                <strong style="display: block; margin-bottom: 4px;">提取结果：</strong>
                <div style="font-size: 11px; color: var(--fluent-blue);">{{ log.title }}</div>
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
import { Play, Square, ChevronDown, ChevronRight, Type } from 'lucide-vue-next';
import FButton from '@/components/common/FButton.vue';
import FInput from '@/components/common/FInput.vue';

const store = useBookmarkStore();
const taskStore = useTaskStore();

const missingTitleCount = computed(() => store.bookmarksWithUrlAsTitle.length);
const totalBookmarks = computed(() => store.nodes.filter(n => n.type === 'bookmark').length);

const isMissingTitleListOpen = ref(false);
</script>

<style scoped>
@import '@/assets/tools.css';

.concurrency-input :deep(.f-input) {
  text-align: center;
  padding: 6px 8px;
}
</style>
