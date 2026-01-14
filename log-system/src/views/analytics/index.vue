<template>
  <div class="analytics-page">
    <!-- 实时数据 -->
    <div class="realtime-section">
      <div class="realtime-card">
        <div class="realtime-icon">🟢</div>
        <div class="realtime-content">
          <div class="realtime-value">{{ realtimeData.activeUsers }}</div>
          <div class="realtime-label">当前在线</div>
        </div>
      </div>
    </div>

    <!-- 核心指标 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon" style="background: #E8F3FF;">👁️</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stats.totalPV) }}</div>
          <div class="stat-label">页面浏览量 (PV)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #E8FFEA;">👤</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stats.totalUV) }}</div>
          <div class="stat-label">独立访客 (UV)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #FFF7E8;">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stats.totalSessions) }}</div>
          <div class="stat-label">会话数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #F5E8FF;">📈</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stats.avgPVPerDay) }}</div>
          <div class="stat-label">日均 PV</div>
        </div>
      </div>
    </div>

    <!-- 时间范围选择 -->
    <div class="filter-bar">
      <div class="range-selector">
        <button 
          v-for="range in timeRanges" 
          :key="range.value"
          class="range-btn"
          :class="{ active: selectedRange === range.value }"
          @click="changeRange(range.value)"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <!-- 趋势图表 -->
    <div class="chart-section">
      <div class="section-header">
        <h3 class="section-title">访问趋势</h3>
      </div>
      <div class="chart-container" ref="trendChartRef"></div>
    </div>

    <!-- 数据详情 -->
    <div class="details-grid">
      <!-- 热门页面 -->
      <div class="detail-card">
        <div class="card-header">
          <h3 class="card-title">热门页面</h3>
        </div>
        <div class="page-list">
          <div class="page-item" v-for="(page, idx) in topPages" :key="page.path">
            <span class="page-rank">{{ idx + 1 }}</span>
            <span class="page-path">{{ page.path }}</span>
            <span class="page-pv">{{ formatNumber(page.pv) }}</span>
            <div class="page-bar">
              <div class="page-bar-fill" :style="{ width: getPagePercent(page.pv) + '%' }"></div>
            </div>
          </div>
          <div class="empty-state" v-if="topPages.length === 0">
            暂无数据
          </div>
        </div>
      </div>

      <!-- 流量来源 -->
      <div class="detail-card">
        <div class="card-header">
          <h3 class="card-title">流量来源</h3>
        </div>
        <div class="source-chart" ref="sourceChartRef"></div>
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="sessions-section">
      <div class="section-header">
        <h3 class="section-title">最近会话</h3>
      </div>
      <div class="sessions-list">
        <div class="session-item" v-for="session in sessions" :key="session.id">
          <div class="session-info">
            <div class="session-visitor">
              <span class="visitor-icon">👤</span>
              <span class="visitor-id">{{ session.visitorId?.substring(0, 12) }}...</span>
            </div>
            <div class="session-meta">
              <span class="meta-item">📄 {{ session.pageViewCount || 0 }} 页</span>
              <span class="meta-item">⏱️ {{ formatDuration(session.duration) }}</span>
            </div>
          </div>
          <div class="session-pages">
            <span class="entry-page">{{ session.entryPage }}</span>
            <span class="exit-arrow" v-if="session.exitPage">→</span>
            <span class="exit-page" v-if="session.exitPage">{{ session.exitPage }}</span>
          </div>
          <div class="session-time">
            {{ formatTime(session.startTime) }}
          </div>
        </div>
        <div class="empty-state" v-if="sessions.length === 0">
          暂无会话数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import api from '@/api'

// 图表引用
const trendChartRef = ref(null)
const sourceChartRef = ref(null)
let trendChart = null
let sourceChart = null

// 状态
const selectedRange = ref('7d')
const loading = ref(false)

// 数据
const stats = ref({
  totalPV: 0,
  totalUV: 0,
  totalSessions: 0,
  avgPVPerDay: 0,
})
const dailyData = ref([])
const topPages = ref([])
const sources = ref([])
const sessions = ref([])
const realtimeData = ref({
  activeUsers: 0,
  totalSessions: 0,
})

// 时间范围选项
const timeRanges = [
  { label: '今天', value: '1d' },
  { label: '7天', value: '7d' },
  { label: '30天', value: '30d' },
  { label: '90天', value: '90d' },
]

// 计算属性
const maxPV = computed(() => {
  return Math.max(...topPages.value.map(p => p.pv), 1)
})

// 方法
function formatNumber(num) {
  if (!num) return '0'
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function formatDuration(ms) {
  if (!ms) return '0s'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return seconds + 's'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes + 'm ' + (seconds % 60) + 's'
  const hours = Math.floor(minutes / 60)
  return hours + 'h ' + (minutes % 60) + 'm'
}

function formatTime(timestamp) {
  return dayjs(timestamp).format('MM-DD HH:mm')
}

function getPagePercent(pv) {
  return (pv / maxPV.value) * 100
}

function changeRange(range) {
  selectedRange.value = range
  fetchData()
}

// 获取数据
async function fetchData() {
  loading.value = true
  
  try {
    // 获取统计数据
    const statsRes = await api.analytics.getStats({ range: selectedRange.value })
    if (statsRes.code === 0) {
      stats.value = statsRes.data.summary || {}
      dailyData.value = statsRes.data.daily || []
      topPages.value = statsRes.data.topPages || []
      sources.value = statsRes.data.sources || []
      
      // 更新图表
      updateTrendChart()
      updateSourceChart()
    }

    // 获取会话列表
    const sessionsRes = await api.analytics.getSessions({ pageSize: 10 })
    if (sessionsRes.code === 0) {
      sessions.value = sessionsRes.data.list || []
    }
  } catch (error) {
    console.error('Failed to fetch analytics data:', error)
    // 使用模拟数据
    useMockData()
  } finally {
    loading.value = false
  }
}

// 获取实时数据
async function fetchRealtime() {
  try {
    const res = await api.analytics.getRealtime()
    if (res.code === 0) {
      realtimeData.value = res.data
    }
  } catch (error) {
    // 使用模拟数据
    realtimeData.value = {
      activeUsers: Math.floor(Math.random() * 50) + 10,
      totalSessions: Math.floor(Math.random() * 100) + 50,
    }
  }
}

// 模拟数据
function useMockData() {
  stats.value = {
    totalPV: 12580,
    totalUV: 3456,
    totalSessions: 4521,
    avgPVPerDay: 1797,
  }

  // 生成每日数据
  const days = parseInt(selectedRange.value) || 7
  dailyData.value = Array.from({ length: days }, (_, i) => ({
    date: dayjs().subtract(days - 1 - i, 'day').format('YYYY-MM-DD'),
    pv: Math.floor(Math.random() * 2000) + 500,
    uv: Math.floor(Math.random() * 500) + 100,
    sessions: Math.floor(Math.random() * 600) + 200,
  }))

  topPages.value = [
    { path: '/', pv: 4520 },
    { path: '/products', pv: 2340 },
    { path: '/product/123', pv: 1890 },
    { path: '/cart', pv: 1230 },
    { path: '/checkout', pv: 890 },
  ]

  sources.value = [
    { type: 'direct', count: 4500 },
    { type: 'search', count: 3200 },
    { type: 'social', count: 2100 },
    { type: 'referral', count: 1500 },
  ]

  sessions.value = Array.from({ length: 5 }, (_, i) => ({
    id: `session_${i}`,
    visitorId: `visitor_${Math.random().toString(36).substring(2, 10)}`,
    startTime: Date.now() - Math.random() * 3600000,
    duration: Math.floor(Math.random() * 300000) + 30000,
    pageViewCount: Math.floor(Math.random() * 10) + 1,
    entryPage: '/',
    exitPage: '/checkout',
  }))

  updateTrendChart()
  updateSourceChart()
}

// 更新趋势图表
function updateTrendChart() {
  if (!trendChartRef.value || !trendChart) return

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#E5E6EB',
      borderWidth: 1,
      textStyle: { color: '#1D2129' },
    },
    legend: {
      data: ['PV', 'UV', '会话'],
      right: 20,
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
      data: dailyData.value.map(d => dayjs(d.date).format('MM-DD')),
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
        data: dailyData.value.map(d => d.pv),
        smooth: true,
        lineStyle: { color: '#165DFF' },
        itemStyle: { color: '#165DFF' },
        areaStyle: { color: 'rgba(22, 93, 255, 0.1)' },
      },
      {
        name: 'UV',
        type: 'line',
        data: dailyData.value.map(d => d.uv),
        smooth: true,
        lineStyle: { color: '#00B42A' },
        itemStyle: { color: '#00B42A' },
      },
      {
        name: '会话',
        type: 'bar',
        data: dailyData.value.map(d => d.sessions),
        itemStyle: { color: 'rgba(255, 125, 0, 0.6)' },
        barWidth: '40%',
      },
    ],
  }

  trendChart.setOption(option)
}

// 更新来源图表
function updateSourceChart() {
  if (!sourceChartRef.value || !sourceChart) return

  const sourceNames = {
    direct: '直接访问',
    search: '搜索引擎',
    social: '社交媒体',
    referral: '外部链接',
    unknown: '未知',
  }

  const colors = ['#165DFF', '#00B42A', '#FF7D00', '#722ED1', '#86909C']

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#E5E6EB',
      borderWidth: 1,
      textStyle: { color: '#1D2129' },
    },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: false,
      label: {
        show: true,
        formatter: '{b}: {d}%',
      },
      data: sources.value.map((s, i) => ({
        name: sourceNames[s.type] || s.type,
        value: s.count,
        itemStyle: { color: colors[i % colors.length] },
      })),
    }],
  }

  sourceChart.setOption(option)
}

function handleResize() {
  trendChart?.resize()
  sourceChart?.resize()
}

let realtimeTimer = null

onMounted(() => {
  // 初始化图表
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (sourceChartRef.value) {
    sourceChart = echarts.init(sourceChartRef.value)
  }

  // 获取数据
  fetchData()
  fetchRealtime()

  // 定时刷新实时数据
  realtimeTimer = setInterval(fetchRealtime, 30000)

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  trendChart?.dispose()
  sourceChart?.dispose()
  if (realtimeTimer) {
    clearInterval(realtimeTimer)
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.analytics-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 实时数据
.realtime-section {
  margin-bottom: $spacing-lg;
}

.realtime-card {
  @include card;
  @include flex-start;
  gap: $spacing-md;
  background: linear-gradient(135deg, #E8FFEA 0%, #E8F3FF 100%);
  border: 1px solid #00B42A;
}

.realtime-icon {
  font-size: 24px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.realtime-value {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: #00B42A;
}

.realtime-label {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

// 统计卡片
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  @include card;
  @include flex-start;
  gap: $spacing-md;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: $radius-lg;
  @include flex-center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-value {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.stat-label {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: $spacing-xs;
}

// 筛选栏
.filter-bar {
  @include flex-between;
  margin-bottom: $spacing-lg;
}

.range-selector {
  @include flex-start;
  gap: $spacing-xs;
  padding: $spacing-xs;
  background: $color-bg-container;
  border-radius: $radius-lg;
}

.range-btn {
  @include button-ghost;
  padding: $spacing-sm $spacing-md;
  font-size: $font-size-sm;

  &.active {
    background: $color-primary;
    color: #fff;
  }
}

// 图表区域
.chart-section {
  @include card;
  margin-bottom: $spacing-xl;
}

.section-header {
  margin-bottom: $spacing-lg;
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0;
}

.chart-container {
  height: 350px;
}

// 详情网格
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
  }
}

.detail-card {
  @include card;
}

.card-header {
  margin-bottom: $spacing-md;
}

.card-title {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0;
}

// 页面列表
.page-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.page-item {
  display: grid;
  grid-template-columns: 24px 1fr auto 80px;
  gap: $spacing-sm;
  align-items: center;
  padding: $spacing-sm 0;
}

.page-rank {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: $color-bg-hover;
  @include flex-center;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.page-path {
  font-size: $font-size-sm;
  color: $color-text-primary;
  @include text-ellipsis;
}

.page-pv {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  text-align: right;
}

.page-bar {
  height: 4px;
  background: $color-bg-hover;
  border-radius: 2px;
}

.page-bar-fill {
  height: 100%;
  background: $color-primary;
  border-radius: 2px;
}

// 来源图表
.source-chart {
  height: 250px;
}

// 会话列表
.sessions-section {
  @include card;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.session-item {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: $spacing-lg;
  align-items: center;
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
    gap: $spacing-sm;
  }
}

.session-visitor {
  @include flex-start;
  gap: $spacing-sm;
}

.visitor-icon {
  font-size: 16px;
}

.visitor-id {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-family: $font-family-mono;
}

.session-meta {
  @include flex-start;
  gap: $spacing-md;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.session-pages {
  @include flex-start;
  gap: $spacing-sm;
  font-size: $font-size-sm;
}

.entry-page {
  color: $color-text-primary;
  @include text-ellipsis;
  max-width: 200px;
}

.exit-arrow {
  color: $color-text-quaternary;
}

.exit-page {
  color: $color-text-secondary;
  @include text-ellipsis;
  max-width: 200px;
}

.session-time {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  text-align: right;
}

.empty-state {
  padding: $spacing-xl;
  text-align: center;
  color: $color-text-tertiary;
  font-size: $font-size-sm;
}
</style>
