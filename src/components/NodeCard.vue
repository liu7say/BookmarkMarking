<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronRight, ChevronDown, Folder, Link as LinkIcon, Tag } from 'lucide-vue-next';

interface TreeNode {
  id: string;
  parentId: string | null;
  type: 'folder' | 'bookmark';
  title: string;
  url?: string;
  icon?: string;
  addDate?: number;
  customTags: string[];
  children: TreeNode[];
}

const props = defineProps<{
  node: TreeNode;
}>();

const emit = defineEmits<{
  (e: 'edit-tag', node: TreeNode): void
}>();

const isExpanded = ref(false);

const toggleExpand = () => {
  if (props.node.type === 'folder') {
    isExpanded.value = !isExpanded.value;
  }
};

const handleTagClick = (e: Event) => {
  e.stopPropagation();
  emit('edit-tag', props.node);
};

const defaultIcon = computed(() => {
  return props.node.type === 'folder' ? Folder : LinkIcon;
});
</script>

<template>
  <div class="node-wrapper">
    <!-- Node Content -->
    <div class="node-card fluent-card" 
         :class="{ 'is-folder': node.type === 'folder' }"
         @click="toggleExpand">
         
      <div class="node-left">
        <!-- Chevron for Folders -->
        <span v-if="node.type === 'folder'" class="chevron">
          <ChevronDown v-if="isExpanded" :size="16" />
          <ChevronRight v-else :size="16" />
        </span>
        <span v-else class="chevron-placeholder"></span>

        <!-- Icon -->
        <img v-if="node.type === 'bookmark' && node.icon" :src="node.icon" class="favicon" />
        <component v-else :is="defaultIcon" :size="16" class="default-icon" :class="{ 'folder-icon': node.type === 'folder' }" />

        <!-- Title & Link -->
        <div class="node-info">
          <span class="node-title" :title="node.title">{{ node.title }}</span>
          <a v-if="node.type === 'bookmark'" :href="node.url" target="_blank" @click.stop class="node-url">{{ node.url }}</a>
        </div>
      </div>

      <div class="node-right" v-if="node.type === 'bookmark'">
        <!-- 自定义标签（仅书签类型支持） -->
        <div class="tags" v-if="node.customTags && node.customTags.length > 0">
          <span class="tag-badge" v-for="tag in node.customTags" :key="tag">
            {{ tag }}
          </span>
        </div>
        
        <!-- 添加/编辑标签按钮 -->
        <button class="fluent-btn-subtle icon-btn" @click="handleTagClick" title="添加/编辑标签">
          <Tag :size="14" />
        </button>
      </div>
    </div>

    <!-- Recursive Children Render -->
    <div class="node-children" v-if="node.type === 'folder' && isExpanded">
      <NodeCard v-for="child in node.children" :key="child.id" :node="child" @edit-tag="$emit('edit-tag', $event)" />
    </div>
  </div>
</template>

<style scoped>
.node-wrapper {
  margin-bottom: 4px;
}

.node-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: transparent;
  box-shadow: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.node-card:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

@media (prefers-color-scheme: dark) {
  .node-card:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.node-card.is-folder {
  font-weight: 500;
}

.node-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  flex: 1;
}

.chevron, .chevron-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
  transition: transform var(--fluent-duration) var(--fluent-easing);
}

.favicon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.default-icon {
  color: var(--text-secondary);
}

.folder-icon {
  color: #F8D775; /* Classic folder color, or fluent yellow */
  fill: #F8D775;
}

.node-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.node-title {
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-url {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
}

.node-url:hover {
  text-decoration: underline;
  color: var(--fluent-blue);
}

.node-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tags {
  display: flex;
  gap: 4px;
}

.tag-badge {
  font-size: 10px;
  background-color: var(--fluent-blue);
  color: white;
  padding: 2px 6px;
  border-radius: 12px;
  font-weight: 500;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  opacity: 0;
  transition: opacity var(--fluent-duration) var(--fluent-easing), background-color var(--fluent-duration);
}

.node-card:hover .icon-btn {
  opacity: 1;
}

.node-children {
  padding-left: 24px;
  margin-top: 4px;
  border-left: 1px dashed var(--border-subtle);
  margin-left: 10px;
}
</style>
