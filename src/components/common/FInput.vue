<template>
  <div class="f-input-wrapper">
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="f-input"
      @input="handleInput"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string | number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
});

const emit = defineEmits(['update:modelValue']);

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};
</script>

<style scoped>
.f-input-wrapper {
  width: 100%;
}

.f-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 150ms ease;
  font-family: inherit;
}

.f-input:focus {
  border-color: var(--fluent-blue);
  box-shadow: 0 0 0 1px var(--fluent-blue);
}

.f-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--bg-app);
}

@media (prefers-color-scheme: dark) {
  .f-input {
    background: rgba(255, 255, 255, 0.05);
  }
}
</style>
