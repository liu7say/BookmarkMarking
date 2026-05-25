---
trigger: always_on
---

# Linus Torvalds' Code & Architecture Standards (Good Taste)

This document is the code quality constitution of this project. Any agent working on this project MUST strictly adhere to these principles. No exceptions.

## Core Philosophy

### 1. "Good Taste" (好品味) - Our First Principle
> "Sometimes you can look at a problem from a different angle and rewrite it so that a special case goes away and just becomes the normal case."

*   **No Defensive Redundancy**: Avoid adding multiple nested `if/else` checks to handle edge cases. Instead, design data structures and code flows where edge cases natively fall into the happy path.
*   **Zero Magic Strings/Numbers**: Keep constants declared cleanly. Let the code speak for itself.
*   **Spaghetti Code is a Crime**: Keep algorithms direct, linear, and readable.

### 2. Never Break Userspace (向后兼容铁律)
> "We do not break userspace!"

*   **Data Integrity First**: In browser-side client storage (IndexedDB), database migrations and data schema upgrades must be perfectly backward compatible. Existing bookmarks and user-defined tags must NEVER be corrupted, wiped, or orphaned during upgrades or imports.
*   **Graceful Degradation**: If an external API or parsing of an invalid HTML fails, fail gracefully, report a clean error, and keep the application fully operational.

### 3. Absolute Simplicity & Flat Structure
> "If you need more than 3 levels of indentation, you're ruined and you should fix your program."

*   **Nesting Limit**: Refuse to write code with deeper than 3 levels of nested indentation (loops, ifs, callbacks). Split complex logic into small, pure helper functions.
*   **Single Responsibility**: A function must do exactly one thing, and do it extremely well. If a function is longer than 50 lines, it is highly likely it needs to be refactored.
*   **Spartan Naming**: Keep variable and function names short, meaningful, and precise. Avoid overly verbose academic terminology.

---

## Technical Stack Coding Rules

### 1. Vue 3 & TypeScript
*   **Composition API**: Always use `<script setup lang="ts">`. Keep templates clean and minimal.
*   **Ref vs Reactive**: Standardize on `ref()` for reactive state variables to preserve clear TypeScript types and avoid losing reactivity during destructuring.
*   **CSS Scoping**: Use scoped styles (`<style scoped>`) to prevent styling bleed. Follow the Fluent 2 Design System rules strictly.

### 2. State & Data Flow (Pinia & Dexie.js)
*   **Single Source of Truth**: Keep the persistent IndexedDB state (accessed via Dexie) and the local reactive state (Pinia/Vue components) in perfect sync.
*   **Dexie Transactions**: Use Dexie transactions only when modifying multiple interdependent records. Keep database operations asynchronous (`async/await`) and always catch rejection errors cleanly.
*   **No Unnecessary Cloning**: Avoid copying entire arrays/objects repeatedly. Mutate state carefully through reactive assignments or proper Vue-driven updates.

### 3. HTML Bookmark Parsing
*   **Standard DOM Parser**: Use the browser's native `DOMParser` to parse bookmark HTML files. It is faster, safer, and cleaner than complex regex parsing.
*   **Resilient Tree Building**: Since bookmark folders can be deeply nested and unevenly structured, write clean recursive structures that cleanly map `<DT>`, `<p>`, `<A>`, and `<DL>` tags without throwing exceptions.
