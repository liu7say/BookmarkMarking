<template>
  <div class="tools-layout">
    <div class="tools-content">
      <!-- 加载中 -->
      <div class="loading-state" v-if="isLoading">
        <Loader2 :size="28" class="loading-spinner" />
        <span class="loading-text">正在加载书签数据…</span>
      </div>

      <!-- 路由视图渲染具体的工具子页面 -->
      <router-view v-slot="{ Component }" v-else>
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useBookmarkStore } from '@/stores/bookmark';
import { Loader2 } from 'lucide-vue-next';

const store = useBookmarkStore();
const isLoading = ref(false);

onMounted(async () => {
  if (store.nodes.length === 0) {
    isLoading.value = true;
    await store.loadNodes();
    isLoading.value = false;
  }
});
</script>

<style scoped>
.tools-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tools-content {
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
  background: var(--bg-default);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 200px;
  color: var(--text-secondary);
}

.loading-spinner {
  color: var(--fluent-blue);
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
