<template>
  <button
    :class="[
      'f-btn',
      `f-btn-${variant}`,
      `f-btn-${size}`,
      { 'is-loading': loading }
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <Loader2 v-if="loading" :size="iconSize" class="spin-icon" />
    <component v-else-if="icon" :is="icon" :size="iconSize" />
    <slot v-if="$slots.default"></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Loader2 } from 'lucide-vue-next';

interface Props {
  variant?: 'primary' | 'subtle' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: any;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
});

defineEmits(['click']);

const iconSize = computed(() => {
  switch (props.size) {
    case 'sm': return 14;
    case 'lg': return 20;
    default: return 16;
  }
});
</script>

<style scoped>
.f-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--fluent-duration) var(--fluent-easing);
  user-select: none;
  white-space: nowrap;
}

.f-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Variants */
.f-btn-primary {
  background-color: var(--fluent-blue);
  color: var(--text-on-accent);
}

.f-btn-primary:hover:not(:disabled) {
  background-color: var(--fluent-blue-light);
}

.f-btn-primary:active:not(:disabled) {
  background-color: var(--fluent-blue-dark);
  transform: scale(0.98);
}

.f-btn-subtle {
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}

.f-btn-subtle:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  .f-btn-subtle:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.f-btn-danger {
  background-color: #dc2626;
  color: #ffffff;
}

.f-btn-danger:hover:not(:disabled) {
  background-color: #ef4444;
}

.f-btn-danger:active:not(:disabled) {
  background-color: #b91c1c;
}

/* Sizes */
.f-btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.f-btn-md {
  padding: 8px 16px;
  font-size: 14px;
}

.f-btn-lg {
  padding: 12px 24px;
  font-size: 16px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
