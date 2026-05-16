<script setup lang="ts">
import { ref, computed, shallowRef } from 'vue';
import { useBookmarkStore } from '../stores/bookmark';
import { parseBookmarkHTML } from '../utils/bookmarkParser';
import { UploadCloud, RefreshCw, Layers, AlertCircle } from 'lucide-vue-next';
import type { BookmarkNode } from '../db/database';
import FButton from './common/FButton.vue';
import FDialog from './common/FDialog.vue';

const store = useBookmarkStore();
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// 已有数据时判断是否紧凑展示
const hasData = computed(() => store.nodes.length > 0);

// 对话框状态
const showModeDialog = ref(false);
const pendingNodes = shallowRef<BookmarkNode[]>([]);
const mergeResult = ref<{ added: number; skipped: number } | null>(null);
const showResultToast = ref(false);

const handleFileUpload = async (file: File) => {
  if (!file || file.type !== 'text/html') {
    alert('请上传正确的 HTML 书签文件');
    return;
  }

  const text = await file.text();
  try {
    const nodes = parseBookmarkHTML(text);
    if (nodes.length === 0) {
      alert('未解析到任何书签');
      return;
    }

    if (hasData.value) {
      // 已有数据，弹出选择对话框
      pendingNodes.value = nodes;
      showModeDialog.value = true;
    } else {
      // 无数据，直接写入
      await store.saveParsedNodes(nodes);
    }
  } catch (err) {
    console.error('解析错误:', err);
    alert('解析书签文件时发生错误');
  }
};

// 完全覆盖
const handleOverwrite = async () => {
  showModeDialog.value = false;
  await store.saveParsedNodes(pendingNodes.value);
  pendingNodes.value = [];
};

// 增量合并
const handleMerge = async () => {
  showModeDialog.value = false;
  const result = await store.mergeNodes(pendingNodes.value);
  pendingNodes.value = [];

  // 显示合并结果提示
  mergeResult.value = result;
  showResultToast.value = true;
  setTimeout(() => { showResultToast.value = false; }, 4000);
};

// 取消
const handleCancel = () => {
  showModeDialog.value = false;
  pendingNodes.value = [];
};

const onDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }
};

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (file) handleFileUpload(file);
  }
  // 清空 input，允许重复上传同一文件
  if (target) target.value = '';
};
</script>

<template>
  <!-- 上传区域 -->
  <div
    class="upload-container fluent-card"
    :class="{ 'is-dragging': isDragging, 'compact': hasData }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
    @click="fileInput?.click()"
  >
    <div class="upload-content">
      <UploadCloud :size="hasData ? 28 : 48" class="upload-icon" />
      <div class="upload-text">
        <h2>{{ hasData ? '重新上传书签文件' : '点击或拖拽上传书签文件' }}</h2>
        <p class="subtitle">支持从 Chrome, Edge 等浏览器导出的 HTML 书签文件</p>
      </div>
    </div>

    <input
      type="file"
      ref="fileInput"
      accept=".html, text/html"
      style="display: none;"
      @change="onFileChange"
    />
  </div>

  <!-- 导入模式选择对话框 -->
  <FDialog
    v-model:show="showModeDialog"
    title="选择导入方式"
    :icon="AlertCircle"
    @cancel="handleCancel"
  >
    <template #default>
      <p class="dialog-desc">
        检测到已有 <strong>{{ store.nodes.length }}</strong> 条数据，
        新文件包含 <strong>{{ pendingNodes.length }}</strong> 条记录。
      </p>

      <div class="dialog-options">
        <button class="option-card" @click="handleMerge">
          <div class="option-icon merge-icon">
            <Layers :size="24" />
          </div>
          <div class="option-info">
            <span class="option-title">增量更新</span>
            <span class="option-desc">保留现有数据，仅添加新书签（按 URL 去重）</span>
          </div>
        </button>

        <button class="option-card" @click="handleOverwrite">
          <div class="option-icon overwrite-icon">
            <RefreshCw :size="24" />
          </div>
          <div class="option-info">
            <span class="option-title">完全覆盖</span>
            <span class="option-desc">清空所有现有数据，使用新文件替换</span>
          </div>
        </button>
      </div>
    </template>
    <template #actions>
      <FButton variant="subtle" @click="handleCancel">取消导入</FButton>
    </template>
  </FDialog>

  <!-- 合并结果提示 -->
  <Teleport to="body">
    <Transition name="toast">
      <div class="result-toast" v-if="showResultToast && mergeResult">
        新增 <strong>{{ mergeResult.added }}</strong> 条，
        跳过 <strong>{{ mergeResult.skipped }}</strong> 条重复项
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.upload-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 64px 32px;
  border: 2px dashed var(--border-subtle);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: center;
  transition: all var(--fluent-duration) var(--fluent-easing);
  background-color: var(--bg-card);
}

.upload-container.compact {
  padding: 20px 24px;
  border-style: dashed;
}

.upload-container.compact .upload-content {
  flex-direction: row;
  gap: 12px;
}

.upload-container.compact .upload-text {
  text-align: left;
}

.upload-container.compact h2 {
  font-size: 15px;
}

.upload-container.compact .subtitle {
  font-size: 12px;
}

.upload-container:hover {
  background-color: var(--bg-card-hover);
  border-color: var(--fluent-blue-light);
}

.upload-container.is-dragging {
  border-color: var(--fluent-blue);
  background-color: rgba(0, 120, 212, 0.05);
  transform: scale(1.02);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  color: var(--fluent-blue);
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.dialog-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.6;
  text-align: left;
}

.dialog-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  cursor: pointer;
  text-align: left;
  transition: all var(--fluent-duration) var(--fluent-easing);
  width: 100%;
  font-family: inherit;
}

.option-card:hover {
  border-color: var(--fluent-blue-light);
  background: var(--bg-card-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
}

.option-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}

.merge-icon {
  background: rgba(0, 120, 212, 0.1);
  color: var(--fluent-blue);
}

.overwrite-icon {
  background: rgba(217, 119, 6, 0.1);
  color: #D97706;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.option-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ===== 结果提示 Toast ===== */
.result-toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-card);
  backdrop-filter: var(--acrylic-blur);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-flyout);
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  z-index: 1001;
}

.toast-enter-active {
  animation: toast-in 250ms var(--fluent-easing);
}

.toast-leave-active {
  animation: toast-in 200ms var(--fluent-easing) reverse;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(16px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
