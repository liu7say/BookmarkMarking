<script setup lang="ts">
import { computed, ref } from 'vue';
import { useBookmarkStore } from '../stores/bookmark';
import NodeCard from './NodeCard.vue';
import TagEditor from './TagEditor.vue';

const store = useBookmarkStore();
const rootNodes = computed(() => store.getTree(null));

// Tag Editor State
const isTagEditorOpen = ref(false);
const editingNode = ref<any>(null);

const handleEditTag = (node: any) => {
  editingNode.value = node;
  isTagEditorOpen.value = true;
};

const handleSaveTags = async (tags: string[]) => {
  if (editingNode.value) {
    await store.updateTags(editingNode.value.id, tags);
  }
  isTagEditorOpen.value = false;
  editingNode.value = null;
};
</script>

<template>
  <div class="tree-view-container fluent-card">
    <div class="tree-header">
      <h2>我的书签</h2>
      <span class="count-badge">{{ store.nodes.length }} 个项目</span>
    </div>
    
    <div class="tree-body">
      <NodeCard 
        v-for="node in rootNodes" 
        :key="node.id" 
        :node="node" 
        @edit-tag="handleEditTag" 
      />
    </div>

    <!-- Tag Editor Dialog -->
    <TagEditor 
      v-if="isTagEditorOpen"
      :initial-tags="editingNode?.customTags || []"
      :node-title="editingNode?.title"
      @save="handleSaveTags"
      @close="isTagEditorOpen = false"
    />
  </div>
</template>

<style scoped>
.tree-view-container {
  padding: 24px;
  background-color: var(--bg-card);
  min-height: 400px;
}

.tree-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.tree-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.count-badge {
  background-color: rgba(0, 120, 212, 0.1);
  color: var(--fluent-blue);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.tree-body {
  display: flex;
  flex-direction: column;
}
</style>
