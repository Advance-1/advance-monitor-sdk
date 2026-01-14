<template>
  <div class="behavior-page">
    <!-- 概览卡片 -->
    <div class="overview-cards">
      <div class="overview-card" v-for="stat in overviewStats" :key="stat.key">
        <div class="card-icon" :style="{ background: stat.bgColor }">
          <span v-html="stat.icon"></span>
        </div>
        <div class="card-content">
          <div class="card-value">{{ formatNumber(stat.value) }}</div>
          <div class="card-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 用户行为趋势 -->
    <div class="chart-section">
      <div class="section-header">
        <h3 class="section-title">用户行为趋势</h3>
      </div>
      <div class="chart-container" ref="chartRef"></div>
    </div>

    <!-- 页面访问排行 -->
    <div class="pages-section">
      <h3 class="section-title">页面访问排行</h3>
      <div class="pages-list">
        <div class="page-item" v-for="(page, index) in topPages" :key="page.path">
          <div class="page-rank">{{ index + 1 }}</div>
          <div class="page-info">
            <div class="page-path">{{ page.path }}</div>
            <div class="page-title">{{ page.title }}</div>
          </div>
          <div class="page-stats">
            <div class="stat-item">
              <span class="stat-value">{{ formatNumber(page.pv) }}</span>
              <span class="stat-label">PV</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ formatNumber(page.uv) }}</span>
              <span class="stat-label">UV</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ page.avgDuration }}s</span>
              <span class="stat-label">平均停留</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ page.bounceRate }}%</span>
              <span class="stat-label">跳出率</span>
            </div>
          </div>
          <div class="page-bar">
            <div class="page-bar-fill" :style="{ width: page.percent + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户会话列表 -->
    <div class="sessions-section">
      <div class="section-header">
        <h3 class="section-title">最近会话</h3>
        <button class="view-all-btn" @click="viewAllSessions">查看全部</button>
      </div>
      <div class="sessions-list">
        <div class="session-item" v-for="session in recentSessions" :key="session.id" @click="viewSession(session.id)">
          <div class="session-user">
            <div class="user-avatar">{{ session.userId?.charAt(0) || '?' }}</div>
            <div class="user-info">
              <div class="user-id">{{ session.userId || '匿名用户' }}</div>
              <div class="user-meta">
                <span>{{ session.browser }}</span>
                <span>{{ session.os }}</span>
                <span>{{ session.device }}</span>
              </div>
            </div>
          </div>
          <div class="session-stats">
            <div class="stat">
              <span class="stat-value">{{ session.pageViews }}</span>
              <span class="stat-label">页面</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ session.events }}</span>
              <span class="stat-label">事件</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ formatDuration(session.duration) }}</span>
              <span class="stat-label">时长</span>
            </div>
          </div>
          <div class="session-time">{{ fromNow(session.startTime) }}</div>
          <div class="session-arrow">→</div>
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
import { formatNumber, fromNow } from '@/utils'

const router = useRouter()

// 图表
const chartRef = ref(null)
let chart = null

// 状态
const overviewStats = ref([
  { key: 'pv', label: '页面浏览量', value: 0, bgColor: '#E8F3FF', icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="#165DFF" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="#165DFF" stroke-width="2"/></svg>' },
  { key: 'uv', label: '独立访客', value: 0, bgColor: '#E8FFEA', icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="#00B42A" stroke-width="2"/><circle cx="9" cy="7" r="4" stroke="#00B42A" stroke-width="2"/></svg>' },
  { key: 'sessions', label: '会话数', value: 0, bgColor: '#FFF7E8', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#FF7D00" stroke-width="2"/><path d="M3 9H21" stroke="#FF7D00" stroke-width="2"/></svg>' },
  { key: 'avgDuration', label: '平均停留时长', value: '0s', bgColor: '#F7F8FA', icon: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#86909C" stroke-width="2"/><path d="M12 6V12L16 14" stroke="#86909C" stroke-width="2" stroke-linecap="round"/></svg>' },
])

const topPages = ref([])
const recentSessions = ref([])

// 方法
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}min`
}

function initChart() {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#E5E6EB',
      borderWidth: 1,
      textStyle: { color: '#1D2129' },
    },
    legend: {
      data: ['PV', 'UV'],
      right: 20,
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
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
    series: [
      {
        name: 'PV',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#165DFF', width: 2 },
        itemStyle: { color: '#165DFF' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(22, 93, 255, 0.2)' },
            { offset: 1, color: 'rgba(22, 93, 255, 0.02)' },
          ]),
        },
        data: [],
      },
      {
        name: 'UV',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#00B42A', width: 2 },
        itemStyle: { color: '#00B42A' },
        data: [],
      },
    ],
  }
  
  chart.setOption(option)
}

async function fetchData() {
  try {
    const [overviewRes, pagesRes, sessionsRes] = await Promise.all([
      api.behavior.getOverview(),
      api.behavior.getPageViews({ limit: 10 }),
      api.behavior.getUserSessions({ limit: 5 }),
    ])

    if (overviewRes.data) {
      overviewStats.value[0].value = overviewRes.data.pv || 0
      overviewStats.value[1].value = overviewRes.data.uv || 0
      overviewStats.value[2].value = overviewRes.data.sessions || 0
      overviewStats.value[3].value = formatDuration(overviewRes.data.avgDuration || 0)
    }

    if (pagesRes.data) {
      const maxPv = Math.max(...pagesRes.data.map(p => p.pv))
      topPages.value = pagesRes.data.map(p => ({
        ...p,
        percent: (p.pv / maxPv) * 100,
      }))
    }

    if (sessionsRes.data) {
      recentSessions.value = sessionsRes.data
    }
  } catch (error) {
    console.error('Failed to fetch behavior data:', error)
  }
}

function viewAllSessions() {
  // TODO: 跳转到会话列表页
}

function viewSession(id) {
  // TODO: 跳转到会话详情页
}

function handleResize() {
  chart?.resize()
}

function handleGlobalRefresh() {
  fetchData()
}

onMounted(() => {
  initChart()
  fetchData()
  window.addEventListener('resize', handleResize)
  window.addEventListener('globalRefresh', handleGlobalRefresh)
})

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('globalRefresh', handleGlobalRefresh)
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.behavior-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 概览卡片
.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.overview-card {
  @include card;
  @include flex-start;
  gap: $spacing-base;
}

.card-icon {
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

.card-value {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.card-label {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  margin-top: $spacing-xs;
}

// 图表区域
.chart-section {
  @include card;
  margin-bottom: $spacing-xl;
}

.section-header {
  @include flex-between;
  margin-bottom: $spacing-lg;
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.chart-container {
  height: 300px;
}

// 页面访问排行
.pages-section {
  @include card;
  margin-bottom: $spacing-xl;
}

.pages-list {
  display: flex;
  flex-direction: column;
}

.page-item {
  display: grid;
  grid-template-columns: 40px 1fr auto 200px;
  gap: $spacing-lg;
  align-items: center;
  padding: $spacing-md 0;
  border-bottom: 1px solid $color-border-light;

  &:last-child {
    border-bottom: none;
  }
}

.page-rank {
  width: 32px;
  height: 32px;
  border-radius: $radius-md;
  background: $color-bg-hover;
  @include flex-center;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-secondary;

  &:nth-child(1) { background: #FFF7E8; color: #FF7D00; }
  &:nth-child(2) { background: #F7F8FA; color: #86909C; }
  &:nth-child(3) { background: #FFF1E8; color: #D25F00; }
}

.page-info {
  min-width: 0;
}

.page-path {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
  @include text-ellipsis;
}

.page-title {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: 2px;
  @include text-ellipsis;
}

.page-stats {
  @include flex-start;
  gap: $spacing-xl;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.stat-label {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: 2px;
}

.page-bar {
  height: 6px;
  background: $color-bg-hover;
  border-radius: 3px;
  overflow: hidden;
}

.page-bar-fill {
  height: 100%;
  background: $color-primary;
  border-radius: 3px;
}

// 会话列表
.sessions-section {
  @include card;
}

.view-all-btn {
  @include button-ghost;
  font-size: $font-size-sm;
  color: $color-primary;
}

.sessions-list {
  display: flex;
  flex-direction: column;
}

.session-item {
  display: grid;
  grid-template-columns: 1fr auto 120px 30px;
  gap: $spacing-lg;
  align-items: center;
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

.session-user {
  @include flex-start;
  gap: $spacing-md;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: $color-primary-bg;
  color: $color-primary;
  @include flex-center;
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
}

.user-id {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.user-meta {
  @include flex-start;
  gap: $spacing-md;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: 2px;
}

.session-stats {
  @include flex-start;
  gap: $spacing-xl;
}

.stat {
  text-align: center;
}

.session-time {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.session-arrow {
  color: $color-text-quaternary;
  font-size: $font-size-lg;
}
</style>
