<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-layout">
    <!-- Header with Glassmorphism -->
    <header class="app-header fluent-card">
      <div class="header-content">
        <h1 class="logo-title">浏览器书签整理</h1>
        <nav class="nav-links">
          <RouterLink to="/" class="nav-item">首页</RouterLink>
          <RouterLink to="/tools" class="nav-item">工具</RouterLink>
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
  transform: none; /* Disable hover float for header */
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-title {
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--fluent-blue), #50E3C2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.nav-links {
  display: flex;
  gap: 4px;
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

