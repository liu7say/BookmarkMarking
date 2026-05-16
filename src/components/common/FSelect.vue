<template>
  <div class="f-select" ref="container">
    <div
      class="f-select-trigger"
      :class="{ 'is-open': isOpen, 'is-disabled': disabled }"
      @click="toggleDropdown"
    >
      <span class="selected-label">{{ selectedLabel || placeholder }}</span>
      <ChevronDown :size="16" class="chevron-icon" :class="{ 'is-rotated': isOpen }" />
    </div>

    <Teleport to="body" v-if="isOpen">
      <div
        class="f-select-dropdown-overlay"
        @click="closeDropdown"
      ></div>
      <div
        class="f-select-dropdown"
        :style="dropdownStyle"
      >
        <div
          v-for="option in options"
          :key="option.value"
          class="f-select-item"
          :class="{ 'is-active': option.value === modelValue }"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

interface Option {
  label: string;
  value: any;
}

interface Props {
  modelValue: any;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择...',
  disabled: false,
});

const emit = defineEmits(['update:modelValue', 'change']);

const container = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const dropdownStyle = ref({});

const selectedLabel = computed(() => {
  const option = props.options.find(opt => opt.value === props.modelValue);
  return option ? option.label : '';
});

const toggleDropdown = () => {
  if (props.disabled) return;
  if (!isOpen.value) {
    calculatePosition();
  }
  isOpen.value = !isOpen.value;
};

const closeDropdown = () => {
  isOpen.value = false;
};

const calculatePosition = () => {
  if (!container.value) return;
  const rect = container.value.getBoundingClientRect();
  dropdownStyle.value = {
    top: `${rect.bottom + window.scrollY + 4}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`,
  };
};

const selectOption = (option: Option) => {
  emit('update:modelValue', option.value);
  emit('change', option.value);
  closeDropdown();
};

onUnmounted(() => {
  closeDropdown();
});
</script>

<style scoped>
.f-select {
  position: relative;
  width: 100%;
  max-width: 300px;
}

.f-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  transition: all 150ms ease;
}

.f-select-trigger:hover:not(.is-disabled) {
  background: var(--bg-card-hover);
  border-color: var(--fluent-blue);
}

.f-select-trigger.is-open {
  border-color: var(--fluent-blue);
  box-shadow: 0 0 0 1px var(--fluent-blue);
}

.f-select-trigger.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--bg-app);
}

.selected-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron-icon {
  color: var(--text-secondary);
  transition: transform 200ms var(--fluent-easing);
}

.chevron-icon.is-rotated {
  transform: rotate(180deg);
}

.f-select-dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.f-select-dropdown {
  position: absolute;
  background: var(--bg-card);
  backdrop-filter: var(--acrylic-blur);
  -webkit-backdrop-filter: var(--acrylic-blur);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-flyout);
  z-index: 1001;
  max-height: 250px;
  overflow-y: auto;
  padding: 4px;
  animation: slide-down 200ms var(--fluent-easing);
}

.f-select-item {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  transition: background-color 150ms;
}

.f-select-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.f-select-item.is-active {
  background-color: rgba(0, 120, 212, 0.1);
  color: var(--fluent-blue);
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .f-select-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
