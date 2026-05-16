<template>
  <Teleport to="body">
    <div class="f-dialog-overlay" v-if="show" @click.self="handleCancel">
      <div class="f-dialog-card f-card">
        <div v-if="icon" class="f-dialog-icon" :class="`is-${variant}`">
          <component :is="icon" :size="32" />
        </div>
        <h3 class="f-dialog-title" v-if="title">{{ title }}</h3>
        <p class="f-dialog-desc" v-if="description" v-html="description"></p>
        <div class="f-dialog-content">
          <slot></slot>
        </div>
        <div class="f-dialog-actions">
          <slot name="actions">
            <FButton variant="subtle" @click="handleCancel">{{ cancelText }}</FButton>
            <FButton :variant="variant === 'danger' ? 'danger' : 'primary'" @click="handleConfirm">
              {{ confirmText }}
            </FButton>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import FButton from './FButton.vue';

interface Props {
  show: boolean;
  title?: string;
  description?: string;
  variant?: 'primary' | 'danger';
  icon?: any;
  confirmText?: string;
  cancelText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  confirmText: '确认',
  cancelText: '取消',
});

const emit = defineEmits(['confirm', 'cancel', 'update:show']);

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
  emit('update:show', false);
};
</script>

<style scoped>
.f-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: overlay-in 200ms ease;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.f-dialog-card {
  width: 400px;
  max-width: 90vw;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: var(--bg-card);
  backdrop-filter: var(--acrylic-blur);
  -webkit-backdrop-filter: var(--acrylic-blur);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-flyout);
  animation: dialog-in 250ms var(--fluent-easing);
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.f-dialog-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.f-dialog-icon.is-primary {
  background-color: rgba(0, 120, 212, 0.1);
  color: var(--fluent-blue);
}

.f-dialog-icon.is-danger {
  background-color: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.f-dialog-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.f-dialog-desc {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.f-dialog-content {
  width: 100%;
  margin-bottom: 24px;
}

.f-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

.f-dialog-actions > * {
  flex: 1;
}
</style>
