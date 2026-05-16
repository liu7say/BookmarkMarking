<template>
  <div class="tools-container">
    <section class="tool-section fluent-card">
      <div class="section-header">
        <div class="section-title">
          <Terminal :size="20" class="console-icon" />
          <h2>开发者 JSON 控制台</h2>
          <span class="console-badge">高级</span>
        </div>
        <p class="section-desc">直接查看和复制当前书签库在内存中的完整 JSON 数据结构。</p>
      </div>

      <div class="console-body">
        <div class="console-toolbar">
          <FButton
            variant="subtle"
            size="sm"
            :icon="isCopied ? Check : Copy"
            @click="copyJson"
          >
            {{ isCopied ? '已复制' : '复制 JSON' }}
          </FButton>
        </div>
        <div class="console-output">
          <pre>{{ jsonOutput }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBookmarkStore } from '@/stores/bookmark';
import { Terminal, Copy, Check } from 'lucide-vue-next';
import FButton from '@/components/common/FButton.vue';

const store = useBookmarkStore();
const isCopied = ref(false);

const jsonOutput = computed(() => {
  try {
    return JSON.stringify(store.nodes, null, 2);
  } catch (err) {
    return '解析数据失败';
  }
});

const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(jsonOutput.value);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};
</script>

<style scoped>
@import '@/assets/tools.css';

.console-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px;
  background: #1E1E1E;
  border-bottom: 1px solid #333;
}
</style>
