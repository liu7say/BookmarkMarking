<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { Bookmark, Loader2, ChevronDown } from 'lucide-vue-next'
import { useTaskStore } from './stores/task'
import { useChromeExtensionStore } from './stores/chromeExtension'

const taskStore = useTaskStore()
const extensionStore = useChromeExtensionStore()
const route = useRoute()
const isToolsDropdownOpen = ref(false)

onMounted(async () => {
  await extensionStore.initExtension()
})
</script>

<template>
  <div class="app-layout">
    <!-- Header with Glassmorphism -->
    <header class="app-header fluent-card">
      <div class="header-content">
        <div class="logo-container">
          <div class="logo-icon-wrapper">
            <Bookmark :size="18" stroke-width="2.5" />
          </div>
          <h1 class="logo-title">浏览器书签整理</h1>
        </div>
        <nav class="nav-links">
          <!-- 全局任务进度 -->
          <div class="task-indicator" v-if="taskStore.isTagging || taskStore.isFetchingIcon">
            <template v-if="taskStore.isTagging">
              <Loader2 :size="14" class="spin-icon" style="animation-duration: 1.5s" />
              <span
                >AI 打标中 {{ taskStore.tagProcessedCount }}/{{ taskStore.tagTargetCount }}</span
              >
            </template>
            <template v-else-if="taskStore.isFetchingIcon">
              <Loader2 :size="14" class="spin-icon" style="animation-duration: 1.5s" />
              <span
                >抓取图标 {{ taskStore.iconProcessedCount }}/{{ taskStore.iconTargetCount }}</span
              >
            </template>
          </div>
          <RouterLink to="/" class="nav-item">首页</RouterLink>
          
          <!-- 工具下拉菜单 -->
          <div 
            class="nav-dropdown" 
            @mouseenter="isToolsDropdownOpen = true" 
            @mouseleave="isToolsDropdownOpen = false"
          >
            <div class="nav-item" :class="{ 'router-link-exact-active': route.path.startsWith('/tools') }" style="cursor: pointer;">
              工具 <ChevronDown :size="14" style="margin-left: 2px; vertical-align: -2px;" />
            </div>
            
            <div class="dropdown-wrapper" v-show="isToolsDropdownOpen">
              <div class="dropdown-menu">
                <RouterLink to="/tools/favicon" class="dropdown-item" @click="isToolsDropdownOpen = false">
                  <span>抓取网站图标</span>
                  <Loader2 v-if="taskStore.isFetchingIcon" :size="14" class="spin-icon active-icon" />
                </RouterLink>
                <RouterLink to="/tools/tagging" class="dropdown-item" @click="isToolsDropdownOpen = false">
                  <span>AI 自动打标</span>
                  <Loader2 v-if="taskStore.isTagging" :size="14" class="spin-icon active-icon" />
                </RouterLink>
                <RouterLink to="/tools/decoder" class="dropdown-item" @click="isToolsDropdownOpen = false">
                  <span>URL 批量解码</span>
                  <Loader2 v-if="taskStore.isDecodingUrl" :size="14" class="spin-icon active-icon" />
                </RouterLink>
                <RouterLink to="/tools/title" class="dropdown-item" @click="isToolsDropdownOpen = false">
                  <span>AI 提取标题</span>
                  <Loader2 v-if="taskStore.isGeneratingTitle" :size="14" class="spin-icon active-icon" />
                </RouterLink>
                <div class="dropdown-divider"></div>
                <RouterLink to="/tools/console" class="dropdown-item" @click="isToolsDropdownOpen = false">
                  <span>开发者控制台</span>
                </RouterLink>
              </div>
            </div>
          </div>

          <RouterLink to="/settings" class="nav-item">设置</RouterLink>
        </nav>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="app-main">
      <div class="content-container">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  padding: 16px 32px;
}

.app-header:hover {
  transform: none;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: default;
}

.logo-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: rgba(0, 120, 212, 0.1);
  color: var(--fluent-blue);
  border-radius: 8px;
}

.logo-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--fluent-blue);
  margin: 0;
  letter-spacing: 0.5px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin-right: 8px;
  background-color: rgba(0, 120, 212, 0.08);
  color: var(--fluent-blue);
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  user-select: none;
}

.spin-icon {
  animation: spin linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.nav-item {
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: all var(--fluent-duration) var(--fluent-easing);
}

.nav-item:hover {
  color: var(--text-primary);
  background-color: rgba(0, 0, 0, 0.04);
}

@media (prefers-color-scheme: dark) {
  .nav-item:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }
}

.nav-item.router-link-exact-active {
  color: var(--fluent-blue);
  background-color: rgba(0, 120, 212, 0.08);
}

/* 下拉菜单样式 */
.nav-dropdown {
  position: relative;
  display: flex;
  align-items: center;
}

.dropdown-wrapper {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding-top: 8px; /* 使用 padding 填补空隙，完美保持 hover 状态 */
  z-index: 100;
}

.dropdown-menu {
  background: #ffffff;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-flyout);
  min-width: 180px;
  padding: 8px;
  display: flex;
  flex-direction: column;
}

@media (prefers-color-scheme: dark) {
  .dropdown-menu {
    background: #2d2d2d;
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  border-radius: var(--radius-sm);
  transition: all 150ms;
}

.dropdown-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
  color: var(--text-primary);
}

@media (prefers-color-scheme: dark) {
  .dropdown-item:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }
}

.dropdown-item.router-link-exact-active {
  color: var(--fluent-blue);
  background-color: rgba(0, 120, 212, 0.08);
}

.dropdown-divider {
  height: 1px;
  background-color: var(--border-subtle);
  margin: 6px 0;
}

.active-icon {
  color: var(--fluent-blue);
}

.app-main {
  flex: 1;
  padding: 32px;
  display: flex;
  justify-content: center;
}

.content-container {
  width: 100%;
  max-width: 1200px;
}
</style>
