<script setup lang="ts">
import { ref } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps<{
  initialTags: string[];
  nodeTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'save', tags: string[]): void;
  (e: 'close'): void;
}>();

const tags = ref<string[]>([...props.initialTags]);
const inputValue = ref('');

const addTag = () => {
  const val = inputValue.value.trim();
  if (val && !tags.value.includes(val)) {
    tags.value.push(val);
  }
  inputValue.value = '';
};

const removeTag = (index: number) => {
  tags.value.splice(index, 1);
};

const handleSave = () => {
  if (inputValue.value.trim()) {
    addTag();
  }
  emit('save', tags.value);
};
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog fluent-card">
      <div class="dialog-header">
        <h3>编辑标签 - {{ nodeTitle || '书签' }}</h3>
        <button class="close-btn" @click="$emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="dialog-body">
        <div class="tags-container">
          <span class="tag-chip" v-for="(tag, index) in tags" :key="tag">
            {{ tag }}
            <button class="remove-btn" @click="removeTag(index)"><X :size="12" /></button>
          </span>
        </div>
        
        <input 
          type="text" 
          class="fluent-input" 
          v-model="inputValue" 
          @keydown.enter="addTag"
          placeholder="输入新标签并回车"
        />
      </div>

      <div class="dialog-footer">
        <button class="fluent-btn-subtle" @click="$emit('close')">取消</button>
        <button class="fluent-btn" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.dialog {
  width: 400px;
  max-width: 90vw;
  background-color: var(--acrylic-fallback); /* Solid fallback for dialog */
  padding: 0;
  overflow: hidden;
  box-shadow: var(--shadow-flyout);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 4px;
  transition: background-color var(--fluent-duration);
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dialog-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--fluent-blue);
  color: white;
  padding: 4px 8px 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.remove-btn {
  background: none;
  border: none;
  color: white;
  opacity: 0.8;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 50%;
}

.remove-btn:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.2);
}

.fluent-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background-color: rgba(255, 255, 255, 0.5);
  font-family: inherit;
  font-size: 14px;
  color: var(--text-primary);
  transition: border-color var(--fluent-duration), border-bottom-color var(--fluent-duration);
  border-bottom: 2px solid var(--border-subtle);
}

.fluent-input:focus {
  outline: none;
  border-bottom-color: var(--fluent-blue);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background-color: rgba(0, 0, 0, 0.02);
  border-top: 1px solid var(--border-subtle);
}
</style>
