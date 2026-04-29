<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBookmarkStore } from '../stores/bookmark';
import { fetchFaviconForBookmark, runWithConcurrency, type FetchResult } from '../utils/faviconFetcher';
import { Play, Square, ChevronDown, ChevronRight, Copy, Check, Image, Terminal, ExternalLink, AlertCircle } from 'lucide-vue-next';

const store = useBookmarkStore();

// ========== Favicon 抓取状态 ==========
const isRunning = ref(false);
const processedCount = ref(0);
const successCount = ref(0);
const failCount = ref(0);
const logs = ref<FetchResult[]>([]);
let abortController: AbortController | null = null;

// 并发数（用户可调）
const concurrency = ref(5);

// 统计数据
const totalBookmarks = computed(() => store.nodes.filter(n => n.type === 'bookmark').length);
const missingIconCount = computed(() => store.bookmarksWithoutIcon.length);
const progress = computed(() => {
  const total = taskTargetCount.value;
  if (total === 0) return 0;
  return Math.round((processedCount.value / total) * 100);
});
// 记录任务开始时的目标总数
const taskTargetCount = ref(0);

// 缺少图标列表展开/收起
const isMissingListOpen = ref(false);

// 开始抓取任务
const startFetching = async () => {
  const targets = store.bookmarksWithoutIcon;
  if (targets.length === 0) return;

  isRunning.value = true;
  processedCount.value = 0;
  successCount.value = 0;
  failCount.value = 0;
  logs.value = [];
  taskTargetCount.value = targets.length;
  abortController = new AbortController();

  // 快照目标列表，防止抓取过程中列表变化
  const snapshot = [...targets];

  // 构建任务函数数组
  const tasks = snapshot.map((bookmark) => {
    return () => fetchFaviconForBookmark(bookmark, abortController?.signal);
  });

  // 使用并发池执行
  await runWithConcurrency(
    tasks,
    concurrency.value,
    async (result: FetchResult) => {
      processedCount.value++;

      if (result.success && result.icon) {
        await store.updateIcon(result.id, result.icon);
        successCount.value++;
      } else {
        failCount.value++;
      }

      logs.value.unshift(result); // 最新结果在前
    },
    abortController.signal
  );

  isRunning.value = false;
  abortController = null;
};

// 取消任务
const cancelFetching = () => {
  if (abortController) {
    abortController.abort();
  }
  isRunning.value = false;
};

// ========== JSON 控制台状态 ==========
const isConsoleOpen = ref(false);
const isCopied = ref(false);

const jsonOutput = computed(() => {
  try {
    return JSON.stringify(store.nodes, null, 2);
  } catch {
    return '无法序列化数据';
  }
});

const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(jsonOutput.value);
    isCopied.value = true;
    setTimeout(() => { isCopied.value = false; }, 2000);
  } catch {
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = jsonOutput.value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    isCopied.value = true;
    setTimeout(() => { isCopied.value = false; }, 2000);
  }
};

onMounted(async () => {
  if (!store.isLoaded) {
    await store.loadNodes();
  }
});
</script>

<template>
  <div class="tools-view">
    <!-- Favicon 抓取器 -->
    <section class="tool-section fluent-card">
      <div class="section-header">
        <div class="section-title">
          <Image :size="20" class="section-icon" />
          <h2>Favicon 抓取器</h2>
        </div>
        <p class="section-desc">为缺少图标的书签自动抓取 favicon</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ totalBookmarks }}</span>
          <span class="stat-label">总书签数</span>
        </div>
        <div class="stat-card warning">
          <span class="stat-value">{{ missingIconCount }}</span>
          <span class="stat-label">缺少图标</span>
        </div>
        <div class="stat-card success" v-if="successCount > 0 || isRunning">
          <span class="stat-value">{{ successCount }}</span>
          <span class="stat-label">成功获取</span>
        </div>
        <div class="stat-card danger" v-if="failCount > 0 || isRunning">
          <span class="stat-value">{{ failCount }}</span>
          <span class="stat-label">获取失败</span>
        </div>
      </div>

      <!-- 缺少图标的书签列表 -->
      <div class="missing-list-section" v-if="missingIconCount > 0">
        <div class="missing-list-header" @click="isMissingListOpen = !isMissingListOpen">
          <div class="missing-list-title">
            <AlertCircle :size="14" class="missing-icon" />
            <span>缺少图标的书签（{{ missingIconCount }} 项）</span>
          </div>
          <component :is="isMissingListOpen ? ChevronDown : ChevronRight" :size="16" class="missing-chevron" />
        </div>
        <div class="missing-list" v-if="isMissingListOpen">
          <div
            class="missing-item"
            v-for="bm in store.bookmarksWithoutIcon"
            :key="bm.id"
          >
            <span class="missing-item-title" :title="bm.title">{{ bm.title }}</span>
            <a
              v-if="bm.url"
              :href="bm.url"
              target="_blank"
              class="missing-item-url"
              @click.stop
            >
              <span>{{ bm.url }}</span>
              <ExternalLink :size="10" />
            </a>
          </div>
        </div>
      </div>

      <!-- 进度区域 -->
      <div class="progress-area" v-if="isRunning || logs.length > 0">
        <div class="progress-bar-wrapper" v-if="isRunning">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ processedCount }} / {{ taskTargetCount }}（{{ progress }}%）</span>
        </div>
        <div class="current-item" v-if="isRunning">
          <span class="current-label">并发抓取中，{{ concurrency }} 线程</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-row">
        <button 
          v-if="!isRunning" 
          class="fluent-btn action-btn"
          :disabled="missingIconCount === 0"
          @click="startFetching"
        >
          <Play :size="16" />
          <span>{{ missingIconCount === 0 ? '所有书签已有图标' : '开始抓取' }}</span>
        </button>

        <!-- 并发数设置 -->
        <div class="concurrency-control" v-if="!isRunning">
          <label class="concurrency-label">并发数</label>
          <input 
            type="number" 
            v-model.number="concurrency" 
            min="1" 
            max="20" 
            class="concurrency-input"
          />
        </div>
        <button 
          v-else
          class="fluent-btn cancel-btn action-btn"
          @click="cancelFetching"
        >
          <Square :size="16" />
          <span>取消任务</span>
        </button>
      </div>

      <!-- 处理日志 -->
      <div class="log-area" v-if="logs.length > 0">
        <h3 class="log-title">处理日志</h3>
        <div class="log-list">
          <div 
            class="log-item" 
            v-for="log in logs" 
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

    <!-- JSON 控制台 -->
    <section class="tool-section console-section">
      <div 
        class="console-header fluent-card" 
        @click="isConsoleOpen = !isConsoleOpen"
      >
        <div class="section-title">
          <Terminal :size="20" class="section-icon console-icon" />
          <h2>JSON 控制台</h2>
          <span class="console-badge">{{ store.nodes.length }} 条记录</span>
        </div>
        <component :is="isConsoleOpen ? ChevronDown : ChevronRight" :size="20" class="chevron-icon" />
      </div>

      <div class="console-body" v-if="isConsoleOpen">
        <div class="console-toolbar">
          <button class="fluent-btn-subtle console-btn" @click.stop="copyJson">
            <component :is="isCopied ? Check : Copy" :size="14" />
            <span>{{ isCopied ? '已复制' : '复制 JSON' }}</span>
          </button>
        </div>
        <div class="console-output">
          <pre><code>{{ jsonOutput }}</code></pre>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tools-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fade-in var(--fluent-duration) var(--fluent-easing);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 通用段落 ===== */
.tool-section {
  padding: 24px;
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.section-icon {
  color: var(--fluent-blue);
}

.section-desc {
  margin: 4px 0 0 28px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 统计卡片 ===== */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 100px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all var(--fluent-duration) var(--fluent-easing);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--fluent-blue);
  line-height: 1;
}

.stat-card.warning .stat-value {
  color: #D97706;
}

.stat-card.success .stat-value {
  color: #16A34A;
}

.stat-card.danger .stat-value {
  color: #DC2626;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ===== 进度条 ===== */
.progress-area {
  margin-bottom: 16px;
}

.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--border-subtle);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--fluent-blue), var(--fluent-blue-light));
  border-radius: 3px;
  transition: width 300ms var(--fluent-easing);
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 100px;
  text-align: right;
}

.current-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 6px 12px;
  background: rgba(0, 120, 212, 0.05);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.current-label {
  color: var(--text-secondary);
  white-space: nowrap;
}

.current-title {
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 操作按钮 ===== */
.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.concurrency-control {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.concurrency-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.concurrency-input {
  width: 56px;
  padding: 6px 8px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  text-align: center;
  outline: none;
  transition: border-color 150ms;
  -moz-appearance: textfield;
}

.concurrency-input::-webkit-inner-spin-button,
.concurrency-input::-webkit-outer-spin-button {
  opacity: 1;
}

.concurrency-input:focus {
  border-color: var(--fluent-blue);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-size: 14px;
  border-radius: var(--radius-sm);
}

.cancel-btn {
  background-color: #DC2626;
}

.cancel-btn:hover {
  background-color: #EF4444;
}

.cancel-btn:active {
  background-color: #B91C1C;
}

/* ===== 缺少图标列表 ===== */
.missing-list-section {
  margin-bottom: 20px;
}

.missing-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
  transition: background-color 150ms;
}

.missing-list-header:hover {
  background: rgba(0, 0, 0, 0.03);
}

@media (prefers-color-scheme: dark) {
  .missing-list-header:hover {
    background: rgba(255, 255, 255, 0.04);
  }
}

.missing-list-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.missing-icon {
  color: #D97706;
}

.missing-chevron {
  color: var(--text-secondary);
}

.missing-list {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  margin-top: 8px;
}

.missing-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 12px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12px;
  transition: background-color 150ms;
}

.missing-item:last-child {
  border-bottom: none;
}

.missing-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

@media (prefers-color-scheme: dark) {
  .missing-item:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}

.missing-item-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
  font-weight: 500;
}

.missing-item-url {
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 300px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 150ms;
}

.missing-item-url span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.missing-item-url:hover {
  color: var(--fluent-blue);
}

.missing-list::-webkit-scrollbar {
  width: 6px;
}

.missing-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 3px;
}

@media (prefers-color-scheme: dark) {
  .missing-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
  }
}

/* ===== 日志 ===== */
.log-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.log-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background-color 150ms;
}

.log-item:last-child {
  border-bottom: none;
}

.log-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

@media (prefers-color-scheme: dark) {
  .log-item:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}

.log-status {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  font-weight: 700;
}

.log-success .log-status {
  color: #16A34A;
}

.log-fail .log-status {
  color: #DC2626;
}

.log-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.log-detail {
  flex-shrink: 0;
  max-width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
  font-size: 11px;
}

/* ===== JSON 控制台 ===== */
.console-section {
  padding: 0;
  overflow: hidden;
  background: transparent;
  backdrop-filter: none;
  border: none;
  box-shadow: none;
}

.console-section:hover {
  transform: none;
  box-shadow: none;
}

.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  cursor: pointer;
  user-select: none;
}

.console-header:hover {
  transform: none; /* 不要浮动效果 */
}

.console-icon {
  color: #10B981;
}

.console-badge {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10B981;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.chevron-icon {
  color: var(--text-secondary);
}

.console-body {
  border: 1px solid var(--border-subtle);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  overflow: hidden;
}

.console-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px;
  background: #1E1E1E;
  border-bottom: 1px solid #333;
}

.console-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  color: #9DA5B4;
  border: 1px solid #444;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: transparent;
  transition: all 150ms;
}

.console-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #E0E0E0;
}

.console-output {
  background: #1E1E1E;
  padding: 16px;
  max-height: 500px;
  overflow: auto;
}

.console-output pre {
  margin: 0;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #D4D4D4;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 自定义滚动条（控制台区域） */
.console-output::-webkit-scrollbar {
  width: 8px;
}

.console-output::-webkit-scrollbar-track {
  background: #1E1E1E;
}

.console-output::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.console-output::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 日志列表滚动条 */
.log-list::-webkit-scrollbar {
  width: 6px;
}

.log-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

@media (prefers-color-scheme: dark) {
  .log-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
  }
}
</style>
