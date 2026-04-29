<script setup lang="ts">
import { onMounted } from 'vue';
import { useBookmarkStore } from '../stores/bookmark';
import UploadView from '../components/UploadView.vue';
import TreeView from '../components/TreeView.vue';

const store = useBookmarkStore();

onMounted(async () => {
  await store.loadNodes();
});
</script>

<template>
  <div class="home-view">
    <div v-if="!store.isLoaded" class="loading">
      加载中...
    </div>
    <div v-else class="home-content">
      <!-- 上传区域始终显示 -->
      <UploadView />

      <!-- 有数据时显示树形视图 -->
      <TreeView v-if="store.nodes.length > 0" />
    </div>
  </div>
</template>

<style scoped>
.home-view {
  width: 100%;
  animation: fade-in var(--fluent-duration) var(--fluent-easing);
}

.home-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.loading {
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

