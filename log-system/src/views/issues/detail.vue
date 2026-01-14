<template>
  <div class="issue-detail-page" v-if="issue">
    <!-- 头部信息 -->
    <div class="detail-header">
      <div class="header-main">
        <div class="issue-level-badge" :style="{ background: getLevelBgColor(issue.level) }">
          <span :style="{ color: getLevelColor(issue.level) }">{{ issue.level }}</span>
        </div>
        <h1 class="issue-title">{{ issue.title }}</h1>
      </div>
      <div class="header-actions">
        <button 
          class="action-btn resolve" 
          v-if="issue.status !== 'resolved'"
          @click="handleResolve"
        >
          ✓ 标记已解决
        </button>
        <button 
          class="action-btn ignore" 
          v-if="issue.status !== 'ignored'"
          @click="handleIgnore"
        >
          ⊘ 忽略
        </button>
        <button 
          class="action-btn reopen" 
          v-if="issue.status !== 'unresolved'"
          @click="handleReopen"
        >
          ↺ 重新打开
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-label">事件数</span>
        <span class="stat-value">{{ formatNumber(issue.eventCount) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">影响用户</span>
        <span class="stat-value">{{ formatNumber(issue.userCount) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">首次发生</span>
        <span class="stat-value">{{ formatTime(issue.firstSeen) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">最后发生</span>
        <span class="stat-value">{{ fromNow(issue.lastSeen) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">状态</span>
        <span class="stat-value status" :style="{ color: getStatusColor(issue.status) }">
          {{ statusText[issue.status] }}
        </span>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="tab-content">
      <!-- 错误详情 -->
      <div class="error-detail" v-if="activeTab === 'detail'">
        <div class="detail-section">
          <h3 class="section-title">错误信息</h3>
          <div class="error-message">{{ issue.message }}</div>
        </div>

        <div class="detail-section" v-if="issue.stack">
          <h3 class="section-title">堆栈信息</h3>
          <div class="stack-trace">
            <div 
              class="stack-frame" 
              v-for="(frame, index) in parsedStack" 
              :key="index"
              :class="{ 'is-app': !frame.file.includes('node_modules') }"
            >
              <span class="frame-function">{{ frame.function }}</span>
              <span class="frame-location">
                {{ frame.file }}:{{ frame.line }}:{{ frame.column }}
              </span>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="issue.context">
          <h3 class="section-title">上下文信息</h3>
          <div class="context-grid">
            <div class="context-item" v-for="(value, key) in issue.context" :key="key">
              <span class="context-key">{{ key }}</span>
              <span class="context-value">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 面包屑 -->
      <div class="breadcrumbs-list" v-if="activeTab === 'breadcrumbs'">
        <div 
          class="breadcrumb-item" 
          v-for="(crumb, index) in issue.breadcrumbs" 
          :key="index"
        >
          <div class="crumb-time">{{ formatTime(crumb.timestamp, 'HH:mm:ss.SSS') }}</div>
          <div class="crumb-type" :class="crumb.type">{{ crumb.type }}</div>
          <div class="crumb-content">
            <div class="crumb-message">{{ crumb.message }}</div>
            <div class="crumb-data" v-if="crumb.data">
              <pre>{{ JSON.stringify(crumb.data, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- 标签 -->
      <div class="tags-section" v-if="activeTab === 'tags'">
        <div class="tags-grid">
          <div class="tag-item" v-for="(value, key) in issue.tags" :key="key">
            <span class="tag-key">{{ key }}</span>
            <span class="tag-value">{{ value }}</span>
          </div>
        </div>
      </div>

      <!-- 设备信息 -->
      <div class="device-section" v-if="activeTab === 'device'">
        <div class="info-grid">
          <div class="info-group">
            <h4 class="group-title">浏览器</h4>
            <div class="info-item">
              <span class="info-label">名称</span>
              <span class="info-value">{{ issue.browser?.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">版本</span>
              <span class="info-value">{{ issue.browser?.version }}</span>
            </div>
          </div>
          <div class="info-group">
            <h4 class="group-title">操作系统</h4>
            <div class="info-item">
              <span class="info-label">名称</span>
              <span class="info-value">{{ issue.os?.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">版本</span>
              <span class="info-value">{{ issue.os?.version }}</span>
            </div>
          </div>
          <div class="info-group">
            <h4 class="group-title">设备</h4>
            <div class="info-item">
              <span class="info-label">类型</span>
              <span class="info-value">{{ issue.device?.type }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">分辨率</span>
              <span class="info-value">{{ issue.device?.screenWidth }}x{{ issue.device?.screenHeight }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 事件列表 -->
      <div class="events-section" v-if="activeTab === 'events'">
        <div class="events-list">
          <div class="event-item" v-for="event in events" :key="event.id">
            <div class="event-time">{{ formatTime(event.timestamp) }}</div>
            <div class="event-user">{{ event.userId || '匿名用户' }}</div>
            <div class="event-url">{{ event.url }}</div>
          </div>
        </div>
        <div class="load-more" v-if="hasMoreEvents">
          <button class="load-more-btn" @click="loadMoreEvents">加载更多</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 加载状态 -->
  <div class="loading-state" v-else-if="loading">
    <div class="loading-spinner"></div>
    <span>加载中...</span>
  </div>

  <!-- 错误状态 -->
  <div class="error-state" v-else>
    <div class="error-icon">⚠️</div>
    <div class="error-title">加载失败</div>
    <button class="retry-btn" @click="fetchDetail">重试</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useIssuesStore } from '@/stores'
import { 
  formatNumber, 
  formatTime, 
  fromNow, 
  getLevelColor, 
  getLevelBgColor, 
  getStatusColor,
  parseStack 
} from '@/utils'

const route = useRoute()
const issuesStore = useIssuesStore()

// 状态
const activeTab = ref('detail')
const events = ref([])
const eventsPage = ref(1)
const hasMoreEvents = ref(true)

// 标签页配置
const tabs = [
  { key: 'detail', label: '错误详情' },
  { key: 'breadcrumbs', label: '面包屑' },
  { key: 'tags', label: '标签' },
  { key: 'device', label: '设备信息' },
  { key: 'events', label: '事件列表' },
]

const statusText = {
  unresolved: '未解决',
  resolved: '已解决',
  ignored: '已忽略',
}

// 计算属性
const issue = computed(() => issuesStore.currentIssue)
const loading = computed(() => issuesStore.loading)
const parsedStack = computed(() => {
  if (!issue.value?.stack) return []
  return parseStack(issue.value.stack)
})

// 方法
async function fetchDetail() {
  const id = route.params.id
  await issuesStore.fetchIssueDetail(id)
}

async function handleResolve() {
  await issuesStore.updateIssueStatus(issue.value.id, 'resolved')
}

async function handleIgnore() {
  await issuesStore.updateIssueStatus(issue.value.id, 'ignored')
}

async function handleReopen() {
  await issuesStore.updateIssueStatus(issue.value.id, 'unresolved')
}

async function loadMoreEvents() {
  // 加载更多事件
  eventsPage.value++
  // TODO: 调用 API 加载更多
}

onMounted(() => {
  fetchDetail()
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.issue-detail-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 头部
.detail-header {
  @include flex-between;
  margin-bottom: $spacing-xl;
}

.header-main {
  @include flex-start;
  gap: $spacing-md;
}

.issue-level-badge {
  padding: $spacing-xs $spacing-md;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  text-transform: uppercase;
}

.issue-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.header-actions {
  @include flex-start;
  gap: $spacing-sm;
}

.action-btn {
  @include button-base;
  padding: $spacing-sm $spacing-lg;

  &.resolve {
    background: $color-success-bg;
    color: $color-success;

    &:hover {
      background: $color-success;
      color: #fff;
    }
  }

  &.ignore {
    background: $color-bg-hover;
    color: $color-text-secondary;

    &:hover {
      background: $color-text-tertiary;
      color: #fff;
    }
  }

  &.reopen {
    background: $color-warning-bg;
    color: $color-warning;

    &:hover {
      background: $color-warning;
      color: #fff;
    }
  }
}

// 统计信息
.stats-row {
  @include flex-start;
  gap: $spacing-xl;
  padding: $spacing-lg;
  background: $color-bg-container;
  border-radius: $radius-lg;
  margin-bottom: $spacing-xl;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.stat-label {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.stat-value {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;

  &.status {
    text-transform: capitalize;
  }
}

// 标签页
.tabs {
  @include flex-start;
  gap: $spacing-xs;
  border-bottom: 1px solid $color-border-light;
  margin-bottom: $spacing-xl;
}

.tab-btn {
  @include button-ghost;
  padding: $spacing-md $spacing-lg;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;

  &.active {
    color: $color-primary;
    border-bottom-color: $color-primary;
    background: transparent;
  }
}

// 内容区域
.tab-content {
  @include card;
}

// 错误详情
.detail-section {
  margin-bottom: $spacing-xl;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-md;
}

.error-message {
  font-family: $font-family-mono;
  font-size: $font-size-sm;
  color: $color-error;
  background: $color-error-bg;
  padding: $spacing-md;
  border-radius: $radius-md;
  word-break: break-all;
}

// 堆栈信息
.stack-trace {
  font-family: $font-family-mono;
  font-size: $font-size-sm;
  background: #1E1E1E;
  border-radius: $radius-md;
  overflow: hidden;
}

.stack-frame {
  padding: $spacing-sm $spacing-md;
  border-bottom: 1px solid #333;
  color: #999;

  &:last-child {
    border-bottom: none;
  }

  &.is-app {
    background: rgba(22, 93, 255, 0.1);
    color: #fff;
  }
}

.frame-function {
  color: #DCDCAA;
  margin-right: $spacing-md;
}

.frame-location {
  color: #9CDCFE;
}

// 上下文信息
.context-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
}

.context-item {
  @include flex-between;
  padding: $spacing-sm $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.context-key {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.context-value {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-family: $font-family-mono;
}

// 面包屑
.breadcrumbs-list {
  display: flex;
  flex-direction: column;
}

.breadcrumb-item {
  display: grid;
  grid-template-columns: 100px 80px 1fr;
  gap: $spacing-md;
  padding: $spacing-md 0;
  border-bottom: 1px solid $color-border-light;

  &:last-child {
    border-bottom: none;
  }
}

.crumb-time {
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.crumb-type {
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  padding: 2px $spacing-sm;
  border-radius: $radius-sm;
  text-align: center;

  &.click { background: #E8F3FF; color: #165DFF; }
  &.navigation { background: #E8FFEA; color: #00B42A; }
  &.xhr, &.fetch { background: #FFF7E8; color: #FF7D00; }
  &.error { background: #FFECE8; color: #F53F3F; }
  &.console { background: #F7F8FA; color: #86909C; }
}

.crumb-message {
  font-size: $font-size-sm;
  color: $color-text-primary;
}

.crumb-data {
  margin-top: $spacing-xs;

  pre {
    font-family: $font-family-mono;
    font-size: $font-size-xs;
    color: $color-text-tertiary;
    background: $color-bg-page;
    padding: $spacing-sm;
    border-radius: $radius-sm;
    overflow-x: auto;
    margin: 0;
  }
}

// 标签
.tags-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-md;
}

.tag-item {
  @include flex-between;
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.tag-key {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.tag-value {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

// 设备信息
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-xl;
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.group-title {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  padding-bottom: $spacing-sm;
  border-bottom: 1px solid $color-border-light;
}

.info-item {
  @include flex-between;
}

.info-label {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.info-value {
  font-size: $font-size-sm;
  color: $color-text-primary;
}

// 事件列表
.events-list {
  display: flex;
  flex-direction: column;
}

.event-item {
  display: grid;
  grid-template-columns: 180px 150px 1fr;
  gap: $spacing-md;
  padding: $spacing-md 0;
  border-bottom: 1px solid $color-border-light;
  font-size: $font-size-sm;

  &:last-child {
    border-bottom: none;
  }
}

.event-time {
  font-family: $font-family-mono;
  color: $color-text-tertiary;
}

.event-user {
  color: $color-text-secondary;
}

.event-url {
  color: $color-text-primary;
  @include text-ellipsis;
}

.load-more {
  @include flex-center;
  padding-top: $spacing-lg;
}

.load-more-btn {
  @include button-secondary;
}

// 加载状态
.loading-state,
.error-state {
  @include flex-center;
  flex-direction: column;
  gap: $spacing-md;
  padding: $spacing-4xl;
  color: $color-text-tertiary;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid $color-border;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
}

.error-title {
  font-size: $font-size-md;
  color: $color-text-primary;
}

.retry-btn {
  @include button-primary;
}
</style>
