# Bookmark Manager 书签管理器

基于 Vue 3 + Vite + Dexie.js 构建的浏览器书签管理工具，采用 Fluent 2 设计风格。

## 功能特性

- **书签导入**：支持上传浏览器导出的 HTML 书签文件，自动解析层级结构
- **树形浏览**：以树形视图展示文件夹和书签的层级关系
- **自定义标签**：支持为**书签**添加自定义标签（文件夹不支持打标）
- **Favicon 抓取**：独立工具页面，自动为缺少图标的书签抓取 favicon，支持进度展示和任务取消
- **JSON 控制台**：终端风格面板，展示 IndexedDB 中存储的完整 JSON 数据，支持复制
- **本地存储**：使用 IndexedDB（Dexie.js）在浏览器端持久化存储，无需后端
- **Fluent 2 UI**：亚克力材质卡片、柔和渐变、现代圆角系统

## 技术栈

- Vue 3 + TypeScript
- Vite
- Dexie.js (IndexedDB)
- Lucide Icons
- Fluent 2 Design System

## 开发

```sh
npm install
npm run dev
```

## 构建

```sh
npm run build
```
