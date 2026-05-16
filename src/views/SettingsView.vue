<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useBookmarkStore } from '../stores/bookmark'
import {
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  AlertCircle,
  Plus,
} from 'lucide-vue-next'
import FButton from '../components/common/FButton.vue'
import FInput from '../components/common/FInput.vue'
import FSelect from '../components/common/FSelect.vue'
import FDialog from '../components/common/FDialog.vue'
import FCheckbox from '../components/common/FCheckbox.vue'

const store = useSettingsStore()
const bookmarkStore = useBookmarkStore()

const isTesting = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

const testConnection = async () => {
  const activeConfig = store.activeProvider
  if (!activeConfig) return

  if (!activeConfig.apiKey) {
    testResult.value = { success: false, message: '请先填写 API Key' }
    return
  }

  isTesting.value = true
  testResult.value = null

  try {
    const response = await fetch(`${activeConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: activeConfig.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      }),
    })

    if (response.ok) {
      testResult.value = { success: true, message: '连接成功！API 配置有效。' }
    } else {
      const errorData = await response.json().catch(() => ({}))
      testResult.value = {
        success: false,
        message: `请求失败 (${response.status}): ${errorData.error?.message || response.statusText}`,
      }
    }
  } catch (err: any) {
    testResult.value = { success: false, message: `网络或配置错误: ${err.message}` }
  } finally {
    isTesting.value = false
  }
}

// ========== 下拉框选项 ==========
const providerOptions = computed(() => 
  store.providers.map(p => ({ label: p.name, value: p.id }))
)

const handleProviderChange = (id: string) => {
  store.activeProviderId = id
}

// ========== 拉取模型逻辑 ==========
const isFetchingModels = ref(false)
const availableModels = ref<string[]>([])
const isModelDropdownOpen = ref(false)

const fetchModels = async () => {
  const activeConfig = store.activeProvider
  if (!activeConfig || !activeConfig.apiKey || !activeConfig.baseUrl) {
    alert('请先填写 Base URL 和 API Key')
    return
  }

  isFetchingModels.value = true
  availableModels.value = []
  isModelDropdownOpen.value = false

  try {
    const response = await fetch(`${activeConfig.baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${activeConfig.apiKey}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data && data.data && Array.isArray(data.data)) {
        availableModels.value = data.data.map((m: any) => m.id)
        isModelDropdownOpen.value = true
      } else {
        alert('获取成功但模型列表为空')
      }
    } else {
      const err = await response.json().catch(() => ({}))
      alert(`获取失败: ${err.error?.message || response.statusText}`)
    }
  } catch (err: any) {
    alert(`网络错误或跨域拦截: ${err.message}\n建议：如果持续失败，请直接手动输入模型名称。`)
  } finally {
    isFetchingModels.value = false
  }
}

const selectModel = (modelId: string) => {
  if (store.activeProvider) {
    store.activeProvider.model = modelId
  }
  isModelDropdownOpen.value = false
}

// 点击空白处关闭模型下拉框
const closeDropdowns = (e: Event) => {
  const target = e.target as HTMLElement
  if (!target.closest('.model-dropdown-container') && !target.closest('.fetch-btn')) {
    isModelDropdownOpen.value = false
  }
}

// ========== 数据管理 ==========
const showConfirm = ref(false)

const handleClear = async () => {
  await bookmarkStore.clearAll()
  showConfirm.value = false
}
</script>

<template>
  <div class="settings-view" @click="closeDropdowns">
    <div class="page-header">
      <div class="title-container">
        <Settings :size="24" class="header-icon" />
        <h2>设置</h2>
      </div>
      <p class="subtitle">配置应用偏好与 AI 自动打标服务</p>
    </div>

    <div class="settings-section fluent-card">
      <div class="section-header">
        <h3>AI 自动打标配置</h3>
        <p class="section-desc">
          基于通用 OpenAI API 格式调用大语言模型（如 DeepSeek、千问、Kimi 或本地
          Ollama）来为书签自动生成标签。
        </p>
      </div>

      <!-- 配置选择器 -->
      <div class="provider-selector">
        <label>选择当前配置：</label>
        <div class="selector-row">
          <FSelect
            :model-value="store.activeProviderId"
            :options="providerOptions"
            placeholder="选择配置..."
            @update:model-value="handleProviderChange"
          />
          <FButton variant="subtle" size="sm" :icon="Plus" @click="store.addNewProvider">新增</FButton>
          <FButton
            variant="danger"
            size="sm"
            :icon="Trash2"
            :disabled="store.providers.length <= 1"
            @click="store.removeProvider(store.activeProviderId)"
          >
            删除
          </FButton>
        </div>
      </div>

      <template v-if="store.activeProvider">
        <div class="form-group">
          <label for="providerName">配置名称</label>
          <FInput
            id="providerName"
            v-model="store.activeProvider.name"
            placeholder="给这个配置起个名字"
          />
        </div>

        <div class="form-group">
          <label for="baseUrl">Base URL</label>
          <FInput
            id="baseUrl"
            v-model="store.activeProvider.baseUrl"
            placeholder="例如：https://api.deepseek.com/v1"
          />
          <span class="field-hint">API 的基础请求地址，需包含到 /v1（视厂商而定）。</span>
        </div>

        <div class="form-group">
          <label for="apiKey">API Key</label>
          <FInput
            id="apiKey"
            type="password"
            v-model="store.activeProvider.apiKey"
            placeholder="sk-..."
          />
          <span class="field-hint">您的 API 访问密钥。密钥安全存储在本地浏览器中。</span>
        </div>

        <div class="form-group relative-group">
          <label for="model">模型名称 (Model)</label>
          <div class="model-input-row">
            <div class="model-dropdown-container">
              <FInput
                id="model"
                v-model="store.activeProvider.model"
                placeholder="例如：deepseek-chat"
                @focus="isModelDropdownOpen = availableModels.length > 0"
              />
              <div
                class="custom-dropdown-menu model-menu"
                v-if="isModelDropdownOpen && availableModels.length > 0"
              >
                <div
                  v-for="m in availableModels"
                  :key="m"
                  class="dropdown-item"
                  @click.stop="selectModel(m)"
                >
                  {{ m }}
                </div>
              </div>
            </div>
            <FButton
              variant="subtle"
              size="sm"
              class="fetch-btn"
              :loading="isFetchingModels"
              @click.stop="fetchModels"
            >
              获取可用模型
            </FButton>
          </div>
          <span class="field-hint">对应 API 平台提供的模型标识符。可尝试自动获取或手动输入。</span>
        </div>
      </template>

      <div class="form-group">
        <label for="prompt">系统提示词模板 (Prompt - 全局共用)</label>
        <div class="textarea-header">
          <span class="field-hint"
            >自定义 AI 打标的系统指令。支持占位符：&#123;&#123;title&#125;&#125; 和
            &#123;&#123;url&#125;&#125;</span
          >
          <FButton variant="subtle" size="sm" @click="store.resetPrompt()">恢复默认</FButton>
        </div>
        <textarea
          id="prompt"
          class="fluent-input prompt-input"
          v-model="store.aiPromptTemplate"
          rows="6"
        ></textarea>
      </div>

      <div class="test-action-row" v-if="store.activeProvider">
        <FButton
          class="test-btn"
          :loading="isTesting"
          :disabled="!store.activeProvider.apiKey"
          @click="testConnection"
        >
          测试连接
        </FButton>

        <div
          class="test-result"
          v-if="testResult"
          :class="testResult.success ? 'success' : 'error'"
        >
          <CheckCircle2 v-if="testResult.success" :size="16" />
          <XCircle v-else :size="16" />
          <span>{{ testResult.message }}</span>
        </div>
      </div>
    </div>

    <!-- 交互偏好设置 -->
    <div class="settings-section fluent-card">
      <div class="section-header">
        <h3>交互偏好</h3>
        <p class="section-desc">定制打标过程中的界面反馈与体验。</p>
      </div>

      <div class="form-group checkbox-group">
        <FCheckbox v-model="store.showAILogDetails">
          在单点打标后显示对话日志详情
        </FCheckbox>
        <span class="field-hint checkbox-hint"
          >开启后，点击卡片右上角的 ✨ 打标按钮，将会在下方弹出包含发给 AI
          的完整提示词和原始返回结果的面版；关闭后，仅展示成功/失败状态。</span
        >
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="settings-section fluent-card danger-section">
      <div class="section-header">
        <h3>数据管理</h3>
        <p class="section-desc">危险操作区域，谨慎处理您的本地数据。</p>
      </div>

      <div class="form-group">
        <FButton
          variant="danger"
          class="clear-btn"
          :icon="Trash2"
          :disabled="bookmarkStore.nodes.length === 0"
          @click="showConfirm = true"
        >
          清空所有书签数据
        </FButton>
        <span class="field-hint"
          >此操作将删除您导入的所有书签数据及标签，不可恢复。AI 配置等设置会保留。</span
        >
      </div>
    </div>

    <!-- 确认对话框 -->
    <FDialog
      v-model:show="showConfirm"
      title="清空书签数据"
      description="此操作只会删除已导入的书签数据，<strong>不会影响</strong>您的系统设置和 AI 配置。<br />清空后无法恢复，确定要继续吗？"
      variant="danger"
      :icon="AlertCircle"
      confirm-text="确认清空"
      @confirm="handleClear"
    />
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fade-in var(--fluent-duration) var(--fluent-easing);
}

.page-header {
  margin-bottom: 8px;
}

.title-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.header-icon {
  color: var(--fluent-blue);
}

.page-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.settings-section {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background-color: var(--bg-card);
}

.section-header {
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 16px;
}

.section-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.fluent-input {
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

.fluent-input:focus {
  border-color: var(--fluent-blue);
  box-shadow: 0 0 0 1px var(--fluent-blue);
}

.prompt-input {
  max-width: 100%;
  resize: vertical;
  line-height: 1.5;
}

.field-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.textarea-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 100%;
}

.test-action-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.test-btn {
  padding: 8px 24px;
}

.test-result {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}

.test-result.success {
  background-color: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.test-result.error {
  background-color: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.checkbox-group {
  gap: 4px;
}


.checkbox-hint {
  margin-left: 26px;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.provider-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

@media (prefers-color-scheme: dark) {
  .provider-selector {
    background-color: rgba(0, 0, 0, 0.2);
  }
}

.provider-selector label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.selector-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 数据管理 */
.danger-section {
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.clear-btn {
  width: fit-content;
}

.relative-group {
  position: relative;
}

.model-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-dropdown-container {
  position: relative;
  flex: 1;
  max-width: 500px;
}

.custom-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.dropdown-item {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  transition: background-color 150ms;
}

.dropdown-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  .custom-dropdown-menu {
    background: rgba(40, 40, 40, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  .dropdown-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}
</style>
