<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.key">
        <div class="stat-icon" :style="{ background: stat.bgColor }">
          <span v-html="stat.icon"></span>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stat.value) }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
        <div class="stat-trend" :class="stat.trend > 0 ? 'up' : 'down'" v-if="stat.trend !== 0">
          <span class="trend-icon">{{ stat.trend > 0 ? '↑' : '↓' }}</span>
          <span class="trend-value">{{ Math.abs(stat.trend) }}%</span>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <div class="chart-card">
        <div class="card-header">
          <h3 class="card-title">错误趋势</h3>
          <div class="card-actions">
            <button 
              v-for="type in chartTypes" 
              :key="type.value"
              class="chart-type-btn"
              :class="{ active: currentChartType === type.value }"
              @click="currentChartType = type.value"
            >
              {{ type.label }}
            </button>
          </div>
        </div>
        <div class="chart-container" ref="errorChartRef"></div>
      </div>

      <div class="chart-card">
        <div class="card-header">
          <h3 class="card-title">性能概览</h3>
        </div>
        <div class="performance-metrics">
          <div class="metric-item" v-for="metric in performanceMetrics" :key="metric.name">
            <div class="metric-header">
              <span class="metric-name">{{ metric.name }}</span>
              <span class="metric-value" :style="{ color: getRatingColor(metric.rating) }">
                {{ metric.value }}{{ metric.unit }}
              </span>
            </div>
            <div class="metric-bar">
              <div 
                class="metric-bar-fill" 
                :style="{ 
                  width: metric.percent + '%',
                  background: getRatingColor(metric.rating)
                }"
              ></div>
            </div>
            <div class="metric-rating" :style="{ color: getRatingColor(metric.rating) }">
              {{ metric.ratingText }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近问题 -->
    <div class="recent-section">
      <div class="section-card">
        <div class="card-header">
          <h3 class="card-title">最近问题</h3>
          <router-link to="/issues" class="view-all">查看全部</router-link>
        </div>
        <div class="issues-list">
          <div 
            class="issue-item" 
            v-for="issue in recentIssues" 
            :key="issue.id"
            @click="goToIssue(issue.id)"
          >
            <div class="issue-level" :style="{ background: getLevelBgColor(issue.level) }">
              <span :style="{ color: getLevelColor(issue.level) }">{{ issue.level }}</span>
            </div>
            <div class="issue-content">
              <div class="issue-title">{{ issue.title }}</div>
              <div class="issue-meta">
                <span class="issue-type">{{ issue.type }}</span>
                <span class="issue-time">{{ fromNow(issue.lastSeen) }}</span>
                <span class="issue-count">{{ issue.count }} 次</span>
              </div>
            </div>
            <div class="issue-arrow">→</div>
          </div>
          <div class="empty-state" v-if="recentIssues.length === 0">
            <div class="empty-icon">✓</div>
            <div class="empty-text">暂无问题</div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="card-header">
          <h3 class="card-title">热门页面</h3>
        </div>
        <div class="pages-list">
          <div class="page-item" v-for="page in topPages" :key="page.path">
            <div class="page-info">
              <div class="page-path">{{ page.path }}</div>
              <div class="page-stats">
                <span>{{ formatNumber(page.pv) }} PV</span>
                <span>{{ formatNumber(page.uv) }} UV</span>
              </div>
            </div>
            <div class="page-bar">
              <div class="page-bar-fill" :style="{ width: page.percent + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import api from '@/api'
import { formatNumber, fromNow, getLevelColor, getLevelBgColor, getRatingColor } from '@/utils'

const router = useRouter()

// 图表实例
const errorChartRef = ref(null)
let errorChart = null

// 状态
const stats = ref([
  { key: 'errors', label: '错误总数', value: 0, trend: 0, bgColor: '#FFECE8', icon: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#F53F3F" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="#F53F3F" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="#F53F3F" stroke-width="2" stroke-linecap="round"/></svg>' },
  { key: 'users', label: '影响用户', value: 0, trend: 0, bgColor: '#E8F3FF', icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="#165DFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="#165DFF" stroke-width="2"/></svg>' },
  { key: 'sessions', label: '会话数', value: 0, trend: 0, bgColor: '#E8FFEA', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#00B42A" stroke-width="2"/><path d="M3 9H21" stroke="#00B42A" stroke-width="2"/></svg>' },
  { key: 'performance', label: '性能评分', value: 0, trend: 0, bgColor: '#FFF7E8', icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M22 12H18L15 21L9 3L6 12H2" stroke="#FF7D00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
])

const chartTypes = [
  { label: '错误数', value: 'errors' },
  { label: '影响用户', value: 'users' },
]
const currentChartType = ref('errors')

const performanceMetrics = ref([
  { name: 'LCP', value: 0, unit: 'ms', rating: 'good', ratingText: '良好', percent: 0 },
  { name: 'FID', value: 0, unit: 'ms', rating: 'good', ratingText: '良好', percent: 0 },
  { name: 'CLS', value: 0, unit: '', rating: 'good', ratingText: '良好', percent: 0 },
  { name: 'TTFB', value: 0, unit: 'ms', rating: 'good', ratingText: '良好', percent: 0 },
])

const recentIssues = ref([])
const topPages = ref([])

// 初始化图表
function initChart() {
  if (!errorChartRef.value) return
  
  errorChart = echarts.init(errorChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#E5E6EB',
      borderWidth: 1,
      textStyle: { color: '#1D2129' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [],
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#F2F3F5' } },
      axisLabel: { color: '#86909C' },
    },
    series: [{
      name: '错误数',
      type: 'line',
      smooth: true,
      symbol: 'none',
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(245, 63, 63, 0.3)' },
          { offset: 1, color: 'rgba(245, 63, 63, 0.05)' },
        ]),
      },
      lineStyle: { color: '#F53F3F', width: 2 },
      data: [],
    }],
  }
  
  errorChart.setOption(option)
}

// 更新图表数据
function updateChart(data) {
  if (!errorChart) return
  
  errorChart.setOption({
    xAxis: { data: data.timestamps || [] },
    series: [{ data: data.values || [] }],
  })
}

// 获取仪表盘数据
async function fetchDashboardData() {
  try {
    const [overviewRes, trendRes, issuesRes, pagesRes] = await Promise.all([
      api.dashboard.getOverview(),
      api.dashboard.getErrorTrend(),
      api.dashboard.getTopErrors({ limit: 5 }),
      api.dashboard.getRecentEvents({ limit: 5 }),
    ])

    // 更新统计数据
    if (overviewRes.data) {
      stats.value[0].value = overviewRes.data.errors || 0
      stats.value[0].trend = overviewRes.data.errorsTrend || 0
      stats.value[1].value = overviewRes.data.users || 0
      stats.value[1].trend = overviewRes.data.usersTrend || 0
      stats.value[2].value = overviewRes.data.sessions || 0
      stats.value[2].trend = overviewRes.data.sessionsTrend || 0
      stats.value[3].value = overviewRes.data.performanceScore || 0
      stats.value[3].trend = overviewRes.data.performanceTrend || 0
    }

    // 更新图表
    if (trendRes.data) {
      updateChart(trendRes.data)
    }

    // 更新最近问题
    if (issuesRes.data) {
      recentIssues.value = issuesRes.data
    }

    // 更新热门页面
    if (pagesRes.data) {
      topPages.value = pagesRes.data
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  }
}

// 跳转到问题详情
function goToIssue(id) {
  router.push(`/issues/${id}`)
}

// 监听窗口大小变化
function handleResize() {
  errorChart?.resize()
}

// 监听全局刷新事件
function handleGlobalRefresh() {
  fetchDashboardData()
}

onMounted(() => {
  initChart()
  fetchDashboardData()
  window.addEventListener('resize', handleResize)
  window.addEventListener('globalRefresh', handleGlobalRefresh)
})

onUnmounted(() => {
  errorChart?.dispose()
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('globalRefresh', handleGlobalRefresh)
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.dashboard-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 统计卡片
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: $breakpoint-sm) {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  @include card;
  @include flex-start;
  gap: $spacing-base;
  position: relative;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: $radius-lg;
  @include flex-center;
  flex-shrink: 0;

  :deep(svg) {
    width: 24px;
    height: 24px;
  }
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  line-height: 1.2;
}

.stat-label {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  margin-top: $spacing-xs;
}

.stat-trend {
  position: absolute;
  top: $spacing-base;
  right: $spacing-base;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  @include flex-center;
  gap: 2px;

  &.up {
    color: $color-error;
  }

  &.down {
    color: $color-success;
  }
}

// 图表区域
.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  @include card;
}

.card-header {
  @include flex-between;
  margin-bottom: $spacing-lg;
}

.card-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.card-actions {
  @include flex-start;
  gap: $spacing-xs;
}

.chart-type-btn {
  @include button-ghost;
  padding: $spacing-xs $spacing-md;
  font-size: $font-size-sm;

  &.active {
    background: $color-primary-bg;
    color: $color-primary;
  }
}

.chart-container {
  height: 300px;
}

.view-all {
  font-size: $font-size-sm;
  color: $color-primary;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

// 性能指标
.performance-metrics {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.metric-header {
  @include flex-between;
}

.metric-name {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  font-weight: $font-weight-medium;
}

.metric-value {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
}

.metric-bar {
  height: 6px;
  background: $color-bg-hover;
  border-radius: 3px;
  overflow: hidden;
}

.metric-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width $transition-slow;
}

.metric-rating {
  font-size: $font-size-xs;
  text-align: right;
}

// 最近问题
.recent-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-lg;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: 1fr;
  }
}

.section-card {
  @include card;
}

.issues-list {
  display: flex;
  flex-direction: column;
}

.issue-item {
  @include flex-start;
  gap: $spacing-md;
  padding: $spacing-md 0;
  border-bottom: 1px solid $color-border-light;
  cursor: pointer;
  transition: background $transition-fast;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: $color-bg-hover;
    margin: 0 (-$spacing-lg);
    padding-left: $spacing-lg;
    padding-right: $spacing-lg;
  }
}

.issue-level {
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  text-transform: uppercase;
}

.issue-content {
  flex: 1;
  min-width: 0;
}

.issue-title {
  font-size: $font-size-base;
  color: $color-text-primary;
  @include text-ellipsis;
}

.issue-meta {
  @include flex-start;
  gap: $spacing-md;
  margin-top: $spacing-xs;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.issue-arrow {
  color: $color-text-quaternary;
  font-size: $font-size-lg;
}

.empty-state {
  @include flex-center;
  flex-direction: column;
  padding: $spacing-3xl;
  color: $color-text-tertiary;
}

.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: $color-success-bg;
  color: $color-success;
  @include flex-center;
  font-size: $font-size-xl;
  margin-bottom: $spacing-md;
}

.empty-text {
  font-size: $font-size-sm;
}

// 热门页面
.pages-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.page-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.page-info {
  @include flex-between;
}

.page-path {
  font-size: $font-size-sm;
  color: $color-text-primary;
  @include text-ellipsis;
  flex: 1;
}

.page-stats {
  @include flex-start;
  gap: $spacing-md;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  flex-shrink: 0;
}

.page-bar {
  height: 4px;
  background: $color-bg-hover;
  border-radius: 2px;
  overflow: hidden;
}

.page-bar-fill {
  height: 100%;
  background: $color-primary;
  border-radius: 2px;
}
</style>
