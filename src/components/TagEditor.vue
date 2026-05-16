<script setup lang="ts">
import { ref } from 'vue';
import { X } from 'lucide-vue-next';
import FButton from './common/FButton.vue';
import FInput from './common/FInput.vue';
import FDialog from './common/FDialog.vue';

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
  <FDialog
    show
    :title="`编辑标签 - ${nodeTitle || '书签'}`"
    @cancel="$emit('close')"
  >
    <template #default>
      <div class="dialog-body">
        <div class="tags-container">
          <span class="tag-chip" v-for="(tag, index) in tags" :key="tag">
            {{ tag }}
            <button class="remove-btn" @click="removeTag(index)"><X :size="12" /></button>
          </span>
        </div>
        
        <FInput 
          v-model="inputValue" 
          @keydown.enter="addTag"
          placeholder="输入新标签并回车"
        />
      </div>
    </template>

    <template #actions>
      <FButton variant="subtle" @click="$emit('close')">取消</FButton>
      <FButton @click="handleSave">保存</FButton>
    </template>
  </FDialog>
</template>

<style scoped>
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
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
</style>
