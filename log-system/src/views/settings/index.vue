<template>
  <div class="settings-page">
    <!-- 快捷入口 -->
    <div class="quick-links">
      <router-link to="/settings/sourcemaps" class="quick-link-card">
        <div class="link-icon">📦</div>
        <div class="link-content">
          <div class="link-title">SourceMap 管理</div>
          <div class="link-desc">上传和管理 SourceMap，自动解析错误堆栈</div>
        </div>
        <div class="link-arrow">→</div>
      </router-link>
    </div>

    <!-- 项目信息 -->
    <div class="settings-section">
      <h3 class="section-title">项目信息</h3>
      <div class="settings-card">
        <div class="form-group">
          <label class="form-label">项目名称</label>
          <input type="text" v-model="projectInfo.name" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">项目 ID</label>
          <div class="readonly-field">
            <span>{{ projectInfo.id }}</span>
            <button class="copy-btn" @click="copyProjectId">复制</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">DSN</label>
          <div class="readonly-field">
            <code>{{ projectInfo.dsn }}</code>
            <button class="copy-btn" @click="copyDsn">复制</button>
          </div>
        </div>
        <div class="form-actions">
          <button class="save-btn" @click="saveProjectInfo">保存</button>
        </div>
      </div>
    </div>

    <!-- SDK 配置 -->
    <div class="settings-section">
      <h3 class="section-title">SDK 配置</h3>
      <div class="settings-card">
        <div class="config-item">
          <div class="config-info">
            <div class="config-name">错误监控</div>
            <div class="config-desc">捕获 JavaScript 运行时错误、Promise 错误等</div>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="sdkConfig.enableError" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="config-item">
          <div class="config-info">
            <div class="config-name">性能监控</div>
            <div class="config-desc">收集 Web Vitals、页面加载性能等指标</div>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="sdkConfig.enablePerformance" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="config-item">
          <div class="config-info">
            <div class="config-name">用户行为监控</div>
            <div class="config-desc">记录用户点击、输入、页面访问等行为</div>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="sdkConfig.enableBehavior" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="config-item">
          <div class="config-info">
            <div class="config-name">网络请求监控</div>
            <div class="config-desc">监控 XHR 和 Fetch 请求</div>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="sdkConfig.enableNetwork" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">采样率</label>
          <div class="slider-input">
            <input type="range" v-model="sdkConfig.sampleRate" min="0" max="100" step="1" />
            <span class="slider-value">{{ sdkConfig.sampleRate }}%</span>
          </div>
        </div>

        <div class="form-actions">
          <button class="save-btn" @click="saveSdkConfig">保存配置</button>
        </div>
      </div>
    </div>

    <!-- 集成指南 -->
    <div class="settings-section">
      <h3 class="section-title">集成指南</h3>
      <div class="settings-card">
        <div class="code-block">
          <div class="code-header">
            <span>安装 SDK</span>
            <button class="copy-btn" @click="copyCode('install')">复制</button>
          </div>
          <pre><code>npm install advance-monitor-sdk</code></pre>
        </div>

        <div class="code-block">
          <div class="code-header">
            <span>初始化</span>
            <button class="copy-btn" @click="copyCode('init')">复制</button>
          </div>
          <pre><code>import monitor from 'advance-monitor-sdk'

monitor.init({
  dsn: '{{ projectInfo.dsn }}',
  appId: '{{ projectInfo.id }}',
  appVersion: '1.0.0',
  environment: 'production',
})</code></pre>
        </div>

        <div class="code-block">
          <div class="code-header">
            <span>Vue 3 集成</span>
            <button class="copy-btn" @click="copyCode('vue3')">复制</button>
          </div>
          <pre><code>import { createApp } from 'vue'
import monitor from 'advance-monitor-sdk'
import App from './App.vue'

const app = createApp(App)

monitor.init({
  dsn: '{{ projectInfo.dsn }}',
  appId: '{{ projectInfo.id }}',
})

// 集成 Vue 错误处理
monitor.setupVue3(app)

app.mount('#app')</code></pre>
        </div>
      </div>
    </div>

    <!-- 危险操作 -->
    <div class="settings-section danger">
      <h3 class="section-title">危险操作</h3>
      <div class="settings-card">
        <div class="danger-item">
          <div class="danger-info">
            <div class="danger-name">清空数据</div>
            <div class="danger-desc">清空该项目的所有监控数据，此操作不可恢复</div>
          </div>
          <button class="danger-btn" @click="clearData">清空数据</button>
        </div>

        <div class="danger-item">
          <div class="danger-info">
            <div class="danger-name">删除项目</div>
            <div class="danger-desc">删除该项目及所有相关数据，此操作不可恢复</div>
          </div>
          <button class="danger-btn" @click="deleteProject">删除项目</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { copyToClipboard } from '@/utils'

// 状态
const projectInfo = ref({
  id: 'proj_abc123',
  name: '我的项目',
  dsn: 'http://localhost:8080/api/tracker',
})

const sdkConfig = ref({
  enableError: true,
  enablePerformance: true,
  enableBehavior: true,
  enableNetwork: true,
  sampleRate: 100,
})

// 方法
async function copyProjectId() {
  await copyToClipboard(projectInfo.value.id)
  alert('已复制项目 ID')
}

async function copyDsn() {
  await copyToClipboard(projectInfo.value.dsn)
  alert('已复制 DSN')
}

async function copyCode(type) {
  const codes = {
    install: 'npm install advance-monitor-sdk',
    init: `import monitor from 'advance-monitor-sdk'

monitor.init({
  dsn: '${projectInfo.value.dsn}',
  appId: '${projectInfo.value.id}',
  appVersion: '1.0.0',
  environment: 'production',
})`,
    vue3: `import { createApp } from 'vue'
import monitor from 'advance-monitor-sdk'
import App from './App.vue'

const app = createApp(App)

monitor.init({
  dsn: '${projectInfo.value.dsn}',
  appId: '${projectInfo.value.id}',
})

monitor.setupVue3(app)

app.mount('#app')`,
  }
  
  await copyToClipboard(codes[type])
  alert('已复制代码')
}

function saveProjectInfo() {
  // TODO: 调用 API 保存
  alert('保存成功')
}

function saveSdkConfig() {
  // TODO: 调用 API 保存
  alert('配置已保存')
}

function clearData() {
  if (confirm('确定要清空所有监控数据吗？此操作不可恢复！')) {
    // TODO: 调用 API 清空数据
    alert('数据已清空')
  }
}

function deleteProject() {
  if (confirm('确定要删除该项目吗？此操作不可恢复！')) {
    // TODO: 调用 API 删除项目
    alert('项目已删除')
  }
}

onMounted(() => {
  // TODO: 加载项目信息和配置
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.settings-page {
  max-width: 800px;
  margin: 0 auto;
}

.settings-section {
  margin-bottom: $spacing-2xl;

  &.danger {
    .section-title {
      color: $color-error;
    }
  }
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-lg;
}

.settings-card {
  @include card;
}

.form-group {
  margin-bottom: $spacing-lg;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: block;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin-bottom: $spacing-sm;
}

.form-input {
  @include input-base;
}

.readonly-field {
  @include flex-between;
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
  font-family: $font-family-mono;
  font-size: $font-size-sm;

  code {
    word-break: break-all;
  }
}

.copy-btn {
  @include button-ghost;
  padding: $spacing-xs $spacing-md;
  font-size: $font-size-xs;
  color: $color-primary;
  flex-shrink: 0;
  margin-left: $spacing-md;
}

.form-actions {
  margin-top: $spacing-lg;
  padding-top: $spacing-lg;
  border-top: 1px solid $color-border-light;
}

.save-btn {
  @include button-primary;
}

// 配置项
.config-item {
  @include flex-between;
  padding: $spacing-md 0;
  border-bottom: 1px solid $color-border-light;

  &:last-of-type {
    border-bottom: none;
  }
}

.config-name {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.config-desc {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: 2px;
}

// 开关
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: $color-border;
    transition: $transition-fast;
    border-radius: 24px;

    &::before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: $transition-fast;
      border-radius: 50%;
    }
  }

  input:checked + .slider {
    background-color: $color-primary;
  }

  input:checked + .slider::before {
    transform: translateX(20px);
  }
}

// 滑块输入
.slider-input {
  @include flex-start;
  gap: $spacing-md;

  input[type="range"] {
    flex: 1;
    height: 4px;
    appearance: none;
    background: $color-bg-hover;
    border-radius: 2px;
    outline: none;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      background: $color-primary;
      border-radius: 50%;
      cursor: pointer;
    }
  }

  .slider-value {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
    min-width: 50px;
    text-align: right;
  }
}

// 代码块
.code-block {
  margin-bottom: $spacing-lg;
  border: 1px solid $color-border-light;
  border-radius: $radius-md;
  overflow: hidden;

  &:last-child {
    margin-bottom: 0;
  }
}

.code-header {
  @include flex-between;
  padding: $spacing-sm $spacing-md;
  background: $color-bg-page;
  border-bottom: 1px solid $color-border-light;
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

pre {
  margin: 0;
  padding: $spacing-md;
  background: #1E1E1E;
  overflow-x: auto;

  code {
    font-family: $font-family-mono;
    font-size: $font-size-sm;
    color: #D4D4D4;
  }
}

// 危险操作
.danger-item {
  @include flex-between;
  padding: $spacing-md 0;
  border-bottom: 1px solid $color-border-light;

  &:last-child {
    border-bottom: none;
  }
}

.danger-name {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.danger-desc {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: 2px;
}

.danger-btn {
  @include button-base;
  background: $color-error-bg;
  color: $color-error;

  &:hover {
    background: $color-error;
    color: #fff;
  }
}

// 快捷入口
.quick-links {
  margin-bottom: $spacing-2xl;
}

.quick-link-card {
  @include card;
  @include flex-start;
  gap: $spacing-lg;
  text-decoration: none;
  transition: all $transition-fast;

  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-2px);
  }
}

.link-icon {
  width: 48px;
  height: 48px;
  border-radius: $radius-lg;
  background: $color-primary-bg;
  @include flex-center;
  font-size: 24px;
  flex-shrink: 0;
}

.link-content {
  flex: 1;
}

.link-title {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.link-desc {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  margin-top: $spacing-xs;
}

.link-arrow {
  font-size: $font-size-xl;
  color: $color-text-quaternary;
}
</style>
