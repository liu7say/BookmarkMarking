<template>
  <div class="tools-container">
    <section class="tool-section fluent-card">
      <div class="section-header">
        <div class="section-title">
          <Link :size="20" class="section-icon" style="color: #059669" />
          <h2>URL 批量解码</h2>
        </div>
        <p class="section-desc">
          将书签 URL 中被转义的特殊字符（如中文字符）解码为可读明文，提升阅读体验。
        </p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ totalBookmarks }}</span>
          <span class="stat-label">总书签数</span>
        </div>
        <div class="stat-card stat-warning">
          <span class="stat-value">{{ encodedUrlCount }}</span>
          <span class="stat-label">含编码 URL</span>
        </div>
        <div
          class="stat-card success"
          v-if="taskStore.decodeSuccessCount > 0 || taskStore.isDecodingUrl"
        >
          <span class="stat-value">{{ taskStore.decodeSuccessCount }}</span>
          <span class="stat-label">成功解码</span>
        </div>
        <div
          class="stat-card danger"
          v-if="taskStore.decodeFailCount > 0 || taskStore.isDecodingUrl"
        >
          <span class="stat-value">{{ taskStore.decodeFailCount }}</span>
          <span class="stat-label">解码失败</span>
        </div>
      </div>

      <!-- 待解码列表预览 -->
      <div class="missing-list-section" v-if="encodedUrlCount > 0 && !taskStore.isDecodingUrl">
        <div class="missing-list-header" @click="isEncodedUrlListOpen = !isEncodedUrlListOpen">
          <span class="missing-list-title">查看待解码书签列表 ({{ encodedUrlCount }})</span>
          <component :is="isEncodedUrlListOpen ? ChevronDown : ChevronRight" :size="16" />
        </div>
        <div class="missing-list-content missing-list" v-if="isEncodedUrlListOpen">
          <div class="missing-item" v-for="node in store.bookmarksWithEncodedUrl" :key="node.id">
            <span class="missing-item-title" :title="node.title">{{ node.title }}</span>
            <span class="missing-item-url" :title="node.url">
              <span class="url-text">{{ node.url }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 进度区域 -->
      <div class="progress-area" v-if="taskStore.isDecodingUrl || taskStore.decodeLogs.length > 0">
        <div class="progress-bar-wrapper" v-if="taskStore.isDecodingUrl">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: taskStore.decodeProgress + '%' }"></div>
          </div>
          <span class="progress-text"
            >{{ taskStore.decodeProcessedCount }} / {{ taskStore.decodeTargetCount }}（{{
              taskStore.decodeProgress
            }}%）</span
          >
        </div>
        <div class="current-item" v-if="taskStore.isDecodingUrl">
          <span class="current-label">解码处理中...</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-row">
        <FButton
          v-if="!taskStore.isDecodingUrl"
          :disabled="encodedUrlCount === 0"
          :icon="Play"
          @click="taskStore.startDecodingUrl"
        >
          <span>{{ encodedUrlCount === 0 ? '所有书签已是明文' : '开始批量解码' }}</span>
        </FButton>
      </div>

      <!-- 处理日志 -->
      <div class="log-area" v-if="taskStore.decodeLogs.length > 0">
        <h3 class="log-title">解码对比日志</h3>
        <div class="log-list">
          <div
            class="log-item ai-log-wrapper"
            v-for="log in taskStore.decodeLogs"
            :key="log.id"
            :class="{
              'log-success': log.success,
              'log-fail': !log.success,
              'is-expanded': log.isExpanded,
            }"
          >
            <div class="log-item-header" @click="log.isExpanded = !log.isExpanded">
              <span class="log-status">{{ log.success ? '✓' : '✗' }}</span>
              <span class="log-name">{{ log.title }}</span>
              <span class="log-detail" v-if="!log.success">{{ log.error }}</span>
              <component
                :is="log.isExpanded ? ChevronDown : ChevronRight"
                :size="14"
                class="expand-icon"
              />
            </div>
            <div class="log-item-details" v-if="log.isExpanded">
              <div class="detail-block" style="margin-bottom: 8px">
                <strong style="display: block; margin-bottom: 4px">解码前：</strong>
                <div style="font-size: 11px; color: var(--text-secondary); word-break: break-all">
                  {{ log.oldUrl }}
                </div>
              </div>
              <div class="detail-block">
                <strong style="display: block; margin-bottom: 4px">解码后：</strong>
                <div style="font-size: 11px; color: var(--fluent-blue); word-break: break-all">
                  {{ log.newUrl }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBookmarkStore } from '@/stores/bookmark'
import { useTaskStore } from '@/stores/task'
import { Play, ChevronDown, ChevronRight, Link } from 'lucide-vue-next'
import FButton from '@/components/common/FButton.vue'

const store = useBookmarkStore()
const taskStore = useTaskStore()

const encodedUrlCount = computed(() => store.bookmarksWithEncodedUrl.length)
const totalBookmarks = computed(() => store.nodes.filter((n) => n.type === 'bookmark').length)

const isEncodedUrlListOpen = ref(false)
</script>

<style scoped>
@import '@/assets/tools.css';
</style>
