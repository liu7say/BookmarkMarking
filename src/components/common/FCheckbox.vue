<template>
  <label class="f-checkbox">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="f-checkbox-input"
      @change="handleChange"
    />
    <span class="f-checkbox-label">
      <slot></slot>
    </span>
  </label>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits(['update:modelValue', 'change']);

const handleChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
  emit('change', target.checked);
};
</script>

<style scoped>
.f-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.f-checkbox.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.f-checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--fluent-blue);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  appearance: none;
  background-color: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.f-checkbox-input:checked {
  background-color: var(--fluent-blue);
  border-color: var(--fluent-blue);
}

.f-checkbox-input:checked::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.f-checkbox-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
}

.f-checkbox-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
</style>
