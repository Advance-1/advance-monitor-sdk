<template>
  <div class="issues-page">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input 
            type="text" 
            v-model="searchQuery"
            placeholder="搜索错误信息..."
            @input="handleSearch"
          />
        </div>
        
        <div class="filter-group">
          <select v-model="filters.status" @change="handleFilterChange">
            <option value="all">全部状态</option>
            <option value="unresolved">未解决</option>
            <option value="resolved">已解决</option>
            <option value="ignored">已忽略</option>
          </select>
          
          <select v-model="filters.level" @change="handleFilterChange">
            <option value="all">全部级别</option>
            <option value="critical">严重</option>
            <option value="error">错误</option>
            <option value="warning">警告</option>
          </select>
          
          <select v-model="filters.type" @change="handleFilterChange">
            <option value="all">全部类型</option>
            <option value="js_error">JS 错误</option>
            <option value="promise_error">Promise 错误</option>
            <option value="resource_error">资源错误</option>
            <option value="network_error">网络错误</option>
          </select>
        </div>
      </div>
      
      <div class="filter-right">
        <button class="batch-btn" v-if="selectedIds.length > 0" @click="handleBatchResolve">
          批量解决 ({{ selectedIds.length }})
        </button>
        <button class="reset-btn" @click="handleReset">重置</button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-bar">
      <div 
        class="stat-item" 
        v-for="stat in statusStats" 
        :key="stat.key"
        :class="{ active: filters.status === stat.key }"
        @click="filters.status = stat.key; handleFilterChange()"
      >
        <span class="stat-count" :style="{ color: stat.color }">{{ stat.count }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </div>

    <!-- 问题列表 -->
    <div class="issues-list">
      <div class="list-header">
        <label class="checkbox-wrapper">
          <input type="checkbox" v-model="selectAll" @change="handleSelectAll" />
          <span class="checkbox-label">全选</span>
        </label>
        <span class="header-cell">问题</span>
        <span class="header-cell">事件数</span>
        <span class="header-cell">用户数</span>
        <span class="header-cell">最后发生</span>
        <span class="header-cell">操作</span>
      </div>

      <div class="list-body" v-if="!loading">
        <div 
          class="issue-row" 
          v-for="issue in issues" 
          :key="issue.id"
          :class="{ selected: selectedIds.includes(issue.id) }"
        >
          <label class="checkbox-wrapper">
            <input 
              type="checkbox" 
              :checked="selectedIds.includes(issue.id)"
              @change="toggleSelect(issue.id)"
            />
          </label>
          
          <div class="issue-main" @click="goToDetail(issue.id)">
            <div class="issue-level-badge" :style="{ background: getLevelBgColor(issue.level) }">
              <span :style="{ color: getLevelColor(issue.level) }">{{ issue.level }}</span>
            </div>
            <div class="issue-info">
              <div class="issue-title">{{ issue.title }}</div>
              <div class="issue-subtitle">
                <span class="issue-type">{{ issue.type }}</span>
                <span class="issue-file">{{ issue.filename }}</span>
              </div>
            </div>
          </div>
          
          <div class="issue-cell">
            <span class="cell-value">{{ formatNumber(issue.eventCount) }}</span>
          </div>
          
          <div class="issue-cell">
            <span class="cell-value">{{ formatNumber(issue.userCount) }}</span>
          </div>
          
          <div class="issue-cell">
            <span class="cell-time">{{ fromNow(issue.lastSeen) }}</span>
          </div>
          
          <div class="issue-actions">
            <button 
              class="action-btn resolve" 
              v-if="issue.status !== 'resolved'"
              @click.stop="handleResolve(issue.id)"
              title="标记为已解决"
            >
              ✓
            </button>
            <button 
              class="action-btn ignore" 
              v-if="issue.status !== 'ignored'"
              @click.stop="handleIgnore(issue.id)"
              title="忽略"
            >
              ⊘
            </button>
            <button 
              class="action-btn reopen" 
              v-if="issue.status !== 'unresolved'"
              @click.stop="handleReopen(issue.id)"
              title="重新打开"
            >
              ↺
            </button>
          </div>
        </div>

        <div class="empty-state" v-if="issues.length === 0">
          <div class="empty-icon">📋</div>
          <div class="empty-title">暂无问题</div>
          <div class="empty-desc">当前筛选条件下没有找到问题</div>
        </div>
      </div>

      <div class="loading-state" v-else>
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="total > pageSize">
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="handlePageChange(currentPage - 1)"
      >
        上一页
      </button>
      <span class="page-info">
        第 {{ currentPage }} / {{ totalPages }} 页，共 {{ total }} 条
      </span>
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="handlePageChange(currentPage + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useIssuesStore } from '@/stores'
import { formatNumber, fromNow, getLevelColor, getLevelBgColor, debounce } from '@/utils'

const router = useRouter()
const issuesStore = useIssuesStore()

// 状态
const searchQuery = ref('')
const filters = ref({
  status: 'all',
  level: 'all',
  type: 'all',
})
const selectedIds = ref([])
const selectAll = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

// 计算属性
const issues = computed(() => issuesStore.issues)
const total = computed(() => issuesStore.total)
const loading = computed(() => issuesStore.loading)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const statusStats = computed(() => {
  const stats = issuesStore.issueStats
  return [
    { key: 'all', label: '全部', count: stats.total, color: '#1D2129' },
    { key: 'unresolved', label: '未解决', count: stats.unresolved, color: '#F53F3F' },
    { key: 'resolved', label: '已解决', count: stats.resolved, color: '#00B42A' },
    { key: 'ignored', label: '已忽略', count: stats.ignored, color: '#86909C' },
  ]
})

// 方法
const handleSearch = debounce(() => {
  issuesStore.setFilters({ search: searchQuery.value })
}, 300)

function handleFilterChange() {
  issuesStore.setFilters(filters.value)
}

function handleReset() {
  searchQuery.value = ''
  filters.value = { status: 'all', level: 'all', type: 'all' }
  issuesStore.resetFilters()
}

function handleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = issues.value.map(i => i.id)
  } else {
    selectedIds.value = []
  }
}

function toggleSelect(id) {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
  selectAll.value = selectedIds.value.length === issues.value.length
}

async function handleResolve(id) {
  await issuesStore.updateIssueStatus(id, 'resolved')
}

async function handleIgnore(id) {
  await issuesStore.updateIssueStatus(id, 'ignored')
}

async function handleReopen(id) {
  await issuesStore.updateIssueStatus(id, 'unresolved')
}

async function handleBatchResolve() {
  await issuesStore.batchUpdateStatus(selectedIds.value, 'resolved')
  selectedIds.value = []
  selectAll.value = false
}

function handlePageChange(page) {
  currentPage.value = page
  issuesStore.setPagination({ page, pageSize: pageSize.value })
}

function goToDetail(id) {
  router.push(`/issues/${id}`)
}

function handleGlobalRefresh() {
  issuesStore.fetchIssues()
}

onMounted(() => {
  issuesStore.fetchIssues()
  window.addEventListener('globalRefresh', handleGlobalRefresh)
})

onUnmounted(() => {
  window.removeEventListener('globalRefresh', handleGlobalRefresh)
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.issues-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 筛选栏
.filter-bar {
  @include card;
  @include flex-between;
  margin-bottom: $spacing-lg;
}

.filter-left {
  @include flex-start;
  gap: $spacing-lg;
  flex: 1;
}

.search-box {
  position: relative;
  width: 280px;

  .search-icon {
    position: absolute;
    left: $spacing-md;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: $color-text-tertiary;
  }

  input {
    @include input-base;
    padding-left: 40px;
  }
}

.filter-group {
  @include flex-start;
  gap: $spacing-sm;

  select {
    @include input-base;
    padding: $spacing-sm $spacing-xl $spacing-sm $spacing-md;
    min-width: 120px;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386909C' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right $spacing-md center;
  }
}

.filter-right {
  @include flex-start;
  gap: $spacing-sm;
}

.batch-btn {
  @include button-primary;
}

.reset-btn {
  @include button-secondary;
}

// 统计概览
.stats-bar {
  @include flex-start;
  gap: $spacing-xs;
  margin-bottom: $spacing-lg;
}

.stat-item {
  @include flex-center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-lg;
  background: $color-bg-container;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  border: 1px solid transparent;

  &:hover {
    background: $color-bg-hover;
  }

  &.active {
    border-color: $color-primary;
    background: $color-primary-bg;
  }
}

.stat-count {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
}

.stat-label {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

// 问题列表
.issues-list {
  @include card($padding: 0);
}

.list-header {
  display: grid;
  grid-template-columns: 40px 1fr 100px 100px 120px 120px;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  background: $color-bg-page;
  border-bottom: 1px solid $color-border-light;
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  font-weight: $font-weight-medium;
}

.checkbox-wrapper {
  @include flex-center;
  cursor: pointer;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
}

.issue-row {
  display: grid;
  grid-template-columns: 40px 1fr 100px 100px 120px 120px;
  gap: $spacing-md;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid $color-border-light;
  transition: background $transition-fast;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: $color-bg-hover;
  }

  &.selected {
    background: $color-primary-bg;
  }
}

.issue-main {
  @include flex-start;
  gap: $spacing-md;
  cursor: pointer;
  min-width: 0;
}

.issue-level-badge {
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  text-transform: uppercase;
  flex-shrink: 0;
}

.issue-info {
  min-width: 0;
  flex: 1;
}

.issue-title {
  font-size: $font-size-base;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
  @include text-ellipsis;
}

.issue-subtitle {
  @include flex-start;
  gap: $spacing-md;
  margin-top: $spacing-xs;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.issue-type {
  padding: 2px $spacing-sm;
  background: $color-bg-hover;
  border-radius: $radius-sm;
}

.issue-file {
  @include text-ellipsis;
}

.issue-cell {
  @include flex-center;
}

.cell-value {
  font-size: $font-size-base;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.cell-time {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.issue-actions {
  @include flex-center;
  gap: $spacing-xs;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: $radius-md;
  border: none;
  cursor: pointer;
  transition: all $transition-fast;
  @include flex-center;
  font-size: $font-size-sm;

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
    color: $color-text-tertiary;

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

// 空状态
.empty-state {
  @include flex-center;
  flex-direction: column;
  padding: $spacing-4xl;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: $spacing-md;
}

.empty-title {
  font-size: $font-size-md;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
  margin-bottom: $spacing-xs;
}

.empty-desc {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

// 加载状态
.loading-state {
  @include flex-center;
  gap: $spacing-md;
  padding: $spacing-4xl;
  color: $color-text-tertiary;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid $color-border;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// 分页
.pagination {
  @include flex-center;
  gap: $spacing-lg;
  margin-top: $spacing-lg;
}

.page-btn {
  @include button-secondary;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.page-info {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}
</style>
