import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/tools',
      component: () => import('../views/ToolsView.vue'),
      redirect: '/tools/favicon',
      children: [
        {
          path: 'favicon',
          name: 'tool-favicon',
          component: () => import('../views/tools/FaviconTool.vue'),
        },
        {
          path: 'tagging',
          name: 'tool-tagging',
          component: () => import('../views/tools/AITaggingTool.vue'),
        },
        {
          path: 'decoder',
          name: 'tool-decoder',
          component: () => import('../views/tools/UrlDecoderTool.vue'),
        },
        {
          path: 'title',
          name: 'tool-title',
          component: () => import('../views/tools/AITitleTool.vue'),
        },
        {
          path: 'console',
          name: 'tool-console',
          component: () => import('../views/tools/JsonConsoleTool.vue'),
        }
      ]
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router

