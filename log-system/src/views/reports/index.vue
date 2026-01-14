<template>
  <div class="reports-page">
    <!-- 报表头部 -->
    <div class="reports-header">
      <h2 class="page-title">数据报表</h2>
      <div class="header-actions">
        <div class="date-range-picker">
          <button 
            v-for="range in dateRanges" 
            :key="range.value"
            class="range-btn"
            :class="{ active: selectedRange === range.value }"
            @click="selectedRange = range.value"
          >
            {{ range.label }}
          </button>
        </div>
        <button class="export-btn" @click="exportReport">
          📥 导出报表
        </button>
      </div>
    </div>

    <!-- 核心指标概览 -->
    <div class="metrics-overview">
      <div class="metric-card" v-for="metric in coreMetrics" :key="metric.key">
        <div class="metric-header">
          <span class="metric-icon">{{ metric.icon }}</span>
          <span class="metric-name">{{ metric.name }}</span>
        </div>
        <div class="metric-value">{{ metric.value }}</div>
        <div class="metric-trend" :class="metric.trendType">
          <span class="trend-arrow">{{ metric.trend > 0 ? '↑' : '↓' }}</span>
          <span class="trend-value">{{ Math.abs(metric.trend) }}%</span>
          <span class="trend-label">较上周期</span>
        </div>
        <div class="metric-sparkline">
          <div class="sparkline-bar" 
            v-for="(val, idx) in metric.sparkline" 
            :key="idx"
            :style="{ height: val + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 错误分析 -->
    <div class="report-section">
      <div class="section-header">
        <h3 class="section-title">错误分析</h3>
      </div>
      <div class="section-grid">
        <div class="chart-card">
          <h4 class="chart-title">错误趋势</h4>
          <div class="chart-container" ref="errorTrendChartRef"></div>
        </div>
        <div class="chart-card">
          <h4 class="chart-title">错误类型分布</h4>
          <div class="chart-container" ref="errorTypeChartRef"></div>
        </div>
      </div>
      <div class="data-table">
        <h4 class="table-title">Top 10 错误</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th>错误信息</th>
              <th>类型</th>
              <th>发生次数</th>
              <th>影响用户</th>
              <th>首次发生</th>
              <th>最近发生</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="error in topErrors" :key="error.id">
              <td class="error-message">{{ error.message }}</td>
              <td><span class="type-badge">{{ error.type }}</span></td>
              <td class="count">{{ formatNumber(error.count) }}</td>
              <td class="users">{{ formatNumber(error.users) }}</td>
              <td class="time">{{ formatDate(error.firstSeen) }}</td>
              <td class="time">{{ formatDate(error.lastSeen) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 性能分析 -->
    <div class="report-section">
      <div class="section-header">
        <h3 class="section-title">性能分析</h3>
      </div>
      <div class="section-grid">
        <div class="chart-card">
          <h4 class="chart-title">Web Vitals 趋势</h4>
          <div class="chart-container" ref="vitalsChartRef"></div>
        </div>
        <div class="chart-card">
          <h4 class="chart-title">性能评分分布</h4>
          <div class="chart-container" ref="scoreChartRef"></div>
        </div>
      </div>
      <div class="vitals-summary">
        <div class="vital-item" v-for="vital in webVitals" :key="vital.name">
          <div class="vital-name">{{ vital.name }}</div>
          <div class="vital-value" :class="vital.rating">{{ vital.value }}</div>
          <div class="vital-bar">
            <div class="vital-progress" :style="{ width: vital.percent + '%' }" :class="vital.rating"></div>
          </div>
          <div class="vital-percentiles">
            <span>P50: {{ vital.p50 }}</span>
            <span>P75: {{ vital.p75 }}</span>
            <span>P95: {{ vital.p95 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户行为分析 -->
    <div class="report-section">
      <div class="section-header">
        <h3 class="section-title">用户行为分析</h3>
      </div>
      <div class="section-grid three-cols">
        <div class="chart-card">
          <h4 class="chart-title">访问趋势</h4>
          <div class="chart-container" ref="visitChartRef"></div>
        </div>
        <div class="chart-card">
          <h4 class="chart-title">设备分布</h4>
          <div class="chart-container" ref="deviceChartRef"></div>
        </div>
        <div class="chart-card">
          <h4 class="chart-title">浏览器分布</h4>
          <div class="chart-container" ref="browserChartRef"></div>
        </div>
      </div>
      <div class="section-grid">
        <div class="data-card">
          <h4 class="card-title">热门页面</h4>
          <div class="rank-list">
            <div class="rank-item" v-for="(page, idx) in topPages" :key="page.path">
              <span class="rank-num">{{ idx + 1 }}</span>
              <span class="rank-name">{{ page.path }}</span>
              <span class="rank-value">{{ formatNumber(page.pv) }} PV</span>
              <div class="rank-bar">
                <div class="rank-progress" :style="{ width: page.percent + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="data-card">
          <h4 class="card-title">用户地域分布</h4>
          <div class="rank-list">
            <div class="rank-item" v-for="(region, idx) in topRegions" :key="region.name">
              <span class="rank-num">{{ idx + 1 }}</span>
              <span class="rank-name">{{ region.name }}</span>
              <span class="rank-value">{{ formatNumber(region.users) }}</span>
              <div class="rank-bar">
                <div class="rank-progress" :style="{ width: region.percent + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 资源加载分析 -->
    <div class="report-section">
      <div class="section-header">
        <h3 class="section-title">资源加载分析</h3>
      </div>
      <div class="section-grid">
        <div class="chart-card">
          <h4 class="chart-title">资源类型占比</h4>
          <div class="chart-container" ref="resourceTypeChartRef"></div>
        </div>
        <div class="chart-card">
          <h4 class="chart-title">加载时间分布</h4>
          <div class="chart-container" ref="loadTimeChartRef"></div>
        </div>
      </div>
      <div class="data-table">
        <h4 class="table-title">慢资源 Top 10</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th>资源</th>
              <th>类型</th>
              <th>大小</th>
              <th>平均耗时</th>
              <th>请求次数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="resource in slowResources" :key="resource.url">
              <td class="resource-url">{{ resource.name }}</td>
              <td><span class="type-badge" :class="resource.type">{{ resource.type }}</span></td>
              <td>{{ formatBytes(resource.size) }}</td>
              <td class="duration">{{ formatMs(resource.duration) }}</td>
              <td>{{ formatNumber(resource.count) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

// 图表引用
const errorTrendChartRef = ref(null)
const errorTypeChartRef = ref(null)
const vitalsChartRef = ref(null)
const scoreChartRef = ref(null)
const visitChartRef = ref(null)
const deviceChartRef = ref(null)
const browserChartRef = ref(null)
const resourceTypeChartRef = ref(null)
const loadTimeChartRef = ref(null)

let charts = []

// 状态
const selectedRange = ref('7d')

// 日期范围选项
const dateRanges = [
  { label: '今天', value: '1d' },
  { label: '7天', value: '7d' },
  { label: '30天', value: '30d' },
  { label: '90天', value: '90d' },
]

// 核心指标
const coreMetrics = ref([
  {
    key: 'errors',
    name: '错误数',
    icon: '🐛',
    value: '1,234',
    trend: -12,
    trendType: 'positive',
    sparkline: [60, 45, 70, 55, 80, 65, 50],
  },
  {
    key: 'users',
    name: '活跃用户',
    icon: '👥',
    value: '32,456',
    trend: 8,
    trendType: 'positive',
    sparkline: [40, 55, 60, 75, 70, 85, 90],
  },
  {
    key: 'sessions',
    name: '会话数',
    icon: '📊',
    value: '45,678',
    trend: 5,
    trendType: 'positive',
    sparkline: [50, 60, 55, 70, 65, 80, 75],
  },
  {
    key: 'performance',
    name: '性能评分',
    icon: '⚡',
    value: '85',
    trend: 3,
    trendType: 'positive',
    sparkline: [70, 75, 72, 80, 78, 85, 85],
  },
])

// Web Vitals
const webVitals = ref([
  { name: 'LCP', value: '2.1s', rating: 'good', percent: 85, p50: '1.8s', p75: '2.5s', p95: '4.2s' },
  { name: 'FID', value: '80ms', rating: 'good', percent: 90, p50: '50ms', p75: '100ms', p95: '200ms' },
  { name: 'CLS', value: '0.08', rating: 'good', percent: 88, p50: '0.05', p75: '0.12', p95: '0.25' },
  { name: 'TTFB', value: '450ms', rating: 'needs-improvement', percent: 65, p50: '350ms', p75: '600ms', p95: '1.2s' },
])

// Top 错误
const topErrors = ref([
  { id: 1, message: 'TypeError: Cannot read property \'map\' of undefined', type: 'TypeError', count: 1234, users: 456, firstSeen: Date.now() - 7 * 24 * 3600000, lastSeen: Date.now() - 3600000 },
  { id: 2, message: 'ReferenceError: $ is not defined', type: 'ReferenceError', count: 890, users: 234, firstSeen: Date.now() - 14 * 24 * 3600000, lastSeen: Date.now() - 7200000 },
  { id: 3, message: 'SyntaxError: Unexpected token <', type: 'SyntaxError', count: 567, users: 189, firstSeen: Date.now() - 3 * 24 * 3600000, lastSeen: Date.now() - 1800000 },
  { id: 4, message: 'NetworkError: Failed to fetch', type: 'NetworkError', count: 432, users: 156, firstSeen: Date.now() - 5 * 24 * 3600000, lastSeen: Date.now() - 900000 },
  { id: 5, message: 'ChunkLoadError: Loading chunk 5 failed', type: 'ChunkLoadError', count: 321, users: 98, firstSeen: Date.now() - 2 * 24 * 3600000, lastSeen: Date.now() - 600000 },
])

// 热门页面
const topPages = ref([
  { path: '/', pv: 45000, percent: 100 },
  { path: '/products', pv: 32000, percent: 71 },
  { path: '/product/:id', pv: 28000, percent: 62 },
  { path: '/cart', pv: 15000, percent: 33 },
  { path: '/checkout', pv: 8000, percent: 18 },
])

// 地域分布
const topRegions = ref([
  { name: '北京', users: 12000, percent: 100 },
  { name: '上海', users: 10500, percent: 87 },
  { name: '广州', users: 8200, percent: 68 },
  { name: '深圳', users: 7800, percent: 65 },
  { name: '杭州', users: 5600, percent: 47 },
])

// 慢资源
const slowResources = ref([
  { name: 'vendor.js', url: '/js/vendor.js', type: 'script', size: 450000, duration: 1200, count: 12000 },
  { name: 'main.css', url: '/css/main.css', type: 'stylesheet', size: 120000, duration: 800, count: 12000 },
  { name: 'hero.jpg', url: '/images/hero.jpg', type: 'image', size: 280000, duration: 650, count: 8000 },
  { name: 'analytics.js', url: '/js/analytics.js', type: 'script', size: 85000, duration: 520, count: 12000 },
  { name: 'fonts.woff2', url: '/fonts/main.woff2', type: 'font', size: 45000, duration: 380, count: 12000 },
])

// 方法
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function formatDate(timestamp) {
  return dayjs(timestamp).format('MM-DD HH:mm')
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

function formatMs(ms) {
  if (ms >= 1000) return (ms / 1000).toFixed(2) + 's'
  return ms + 'ms'
}

function exportReport() {
  alert('报表导出功能开发中...')
}

// 初始化图表
function initCharts() {
  // 错误趋势图
  if (errorTrendChartRef.value) {
    const chart = echarts.init(errorTrendChartRef.value)
    charts.push(chart)
    
    const days = Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day').format('MM-DD'))
    
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#E5E6EB' } }, axisLabel: { color: '#86909C' } },
      yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#F2F3F5' } }, axisLabel: { color: '#86909C' } },
      series: [{
        type: 'line',
        data: [120, 180, 150, 200, 170, 140, 160],
        smooth: true,
        areaStyle: { color: 'rgba(245, 63, 63, 0.1)' },
        lineStyle: { color: '#F53F3F' },
        itemStyle: { color: '#F53F3F' },
      }],
    })
  }

  // 错误类型分布
  if (errorTypeChartRef.value) {
    const chart = echarts.init(errorTypeChartRef.value)
    charts.push(chart)
    
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 45, name: 'TypeError', itemStyle: { color: '#F53F3F' } },
          { value: 25, name: 'ReferenceError', itemStyle: { color: '#FF7D00' } },
          { value: 15, name: 'SyntaxError', itemStyle: { color: '#FADC19' } },
          { value: 10, name: 'NetworkError', itemStyle: { color: '#165DFF' } },
          { value: 5, name: 'Other', itemStyle: { color: '#86909C' } },
        ],
        label: { formatter: '{b}: {d}%' },
      }],
    })
  }

  // Web Vitals 趋势
  if (vitalsChartRef.value) {
    const chart = echarts.init(vitalsChartRef.value)
    charts.push(chart)
    
    const days = Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day').format('MM-DD'))
    
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['LCP', 'FID', 'CLS'], right: 20 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#E5E6EB' } }, axisLabel: { color: '#86909C' } },
      yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#F2F3F5' } }, axisLabel: { color: '#86909C' } },
      series: [
        { name: 'LCP', type: 'line', data: [2.1, 2.3, 2.0, 2.2, 1.9, 2.1, 2.1], smooth: true, lineStyle: { color: '#165DFF' }, itemStyle: { color: '#165DFF' } },
        { name: 'FID', type: 'line', data: [80, 90, 75, 85, 70, 80, 80], smooth: true, lineStyle: { color: '#00B42A' }, itemStyle: { color: '#00B42A' } },
        { name: 'CLS', type: 'line', data: [0.08, 0.1, 0.07, 0.09, 0.06, 0.08, 0.08], smooth: true, lineStyle: { color: '#722ED1' }, itemStyle: { color: '#722ED1' } },
      ],
    })
  }

  // 性能评分分布
  if (scoreChartRef.value) {
    const chart = echarts.init(scoreChartRef.value)
    charts.push(chart)
    
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 65, name: '优秀 (90-100)', itemStyle: { color: '#00B42A' } },
          { value: 25, name: '良好 (75-89)', itemStyle: { color: '#165DFF' } },
          { value: 8, name: '需改进 (50-74)', itemStyle: { color: '#FF7D00' } },
          { value: 2, name: '较差 (<50)', itemStyle: { color: '#F53F3F' } },
        ],
        label: { formatter: '{b}: {d}%' },
      }],
    })
  }

  // 访问趋势
  if (visitChartRef.value) {
    const chart = echarts.init(visitChartRef.value)
    charts.push(chart)
    
    const days = Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day').format('MM-DD'))
    
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['PV', 'UV'], right: 20 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#E5E6EB' } }, axisLabel: { color: '#86909C' } },
      yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#F2F3F5' } }, axisLabel: { color: '#86909C' } },
      series: [
        { name: 'PV', type: 'bar', data: [12000, 15000, 14000, 16000, 13000, 18000, 17000], itemStyle: { color: '#165DFF' } },
        { name: 'UV', type: 'line', data: [3000, 3500, 3200, 4000, 3100, 4500, 4200], lineStyle: { color: '#00B42A' }, itemStyle: { color: '#00B42A' } },
      ],
    })
  }

  // 设备分布
  if (deviceChartRef.value) {
    const chart = echarts.init(deviceChartRef.value)
    charts.push(chart)
    
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: '70%',
        data: [
          { value: 55, name: 'Desktop', itemStyle: { color: '#165DFF' } },
          { value: 35, name: 'Mobile', itemStyle: { color: '#00B42A' } },
          { value: 10, name: 'Tablet', itemStyle: { color: '#722ED1' } },
        ],
      }],
    })
  }

  // 浏览器分布
  if (browserChartRef.value) {
    const chart = echarts.init(browserChartRef.value)
    charts.push(chart)
    
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: '70%',
        data: [
          { value: 60, name: 'Chrome', itemStyle: { color: '#165DFF' } },
          { value: 20, name: 'Safari', itemStyle: { color: '#00B42A' } },
          { value: 10, name: 'Firefox', itemStyle: { color: '#FF7D00' } },
          { value: 5, name: 'Edge', itemStyle: { color: '#722ED1' } },
          { value: 5, name: 'Other', itemStyle: { color: '#86909C' } },
        ],
      }],
    })
  }

  // 资源类型占比
  if (resourceTypeChartRef.value) {
    const chart = echarts.init(resourceTypeChartRef.value)
    charts.push(chart)
    
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 40, name: 'Script', itemStyle: { color: '#FF7D00' } },
          { value: 25, name: 'Image', itemStyle: { color: '#722ED1' } },
          { value: 15, name: 'Stylesheet', itemStyle: { color: '#00B42A' } },
          { value: 10, name: 'Font', itemStyle: { color: '#F53F3F' } },
          { value: 10, name: 'Other', itemStyle: { color: '#86909C' } },
        ],
      }],
    })
  }

  // 加载时间分布
  if (loadTimeChartRef.value) {
    const chart = echarts.init(loadTimeChartRef.value)
    charts.push(chart)
    
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: ['<100ms', '100-300ms', '300-500ms', '500ms-1s', '>1s'], axisLine: { lineStyle: { color: '#E5E6EB' } }, axisLabel: { color: '#86909C' } },
      yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#F2F3F5' } }, axisLabel: { color: '#86909C' } },
      series: [{
        type: 'bar',
        data: [
          { value: 45, itemStyle: { color: '#00B42A' } },
          { value: 30, itemStyle: { color: '#165DFF' } },
          { value: 15, itemStyle: { color: '#FF7D00' } },
          { value: 7, itemStyle: { color: '#F53F3F' } },
          { value: 3, itemStyle: { color: '#86909C' } },
        ],
        barWidth: '60%',
      }],
    })
  }
}

function handleResize() {
  charts.forEach(chart => chart?.resize())
}

onMounted(() => {
  setTimeout(initCharts, 100)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  charts.forEach(chart => chart?.dispose())
  charts = []
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.reports-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 头部
.reports-header {
  @include flex-between;
  margin-bottom: $spacing-xl;
}

.page-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin: 0;
}

.header-actions {
  @include flex-start;
  gap: $spacing-lg;
}

.date-range-picker {
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

.export-btn {
  @include button-primary;
}

// 核心指标
.metrics-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.metric-card {
  @include card;
}

.metric-header {
  @include flex-start;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.metric-icon {
  font-size: 20px;
}

.metric-name {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.metric-value {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-sm;
}

.metric-trend {
  @include flex-start;
  gap: $spacing-xs;
  font-size: $font-size-xs;
  margin-bottom: $spacing-md;

  &.positive .trend-arrow,
  &.positive .trend-value {
    color: $color-success;
  }

  &.negative .trend-arrow,
  &.negative .trend-value {
    color: $color-error;
  }
}

.trend-label {
  color: $color-text-tertiary;
}

.metric-sparkline {
  @include flex-start;
  gap: 3px;
  height: 30px;
  align-items: flex-end;
}

.sparkline-bar {
  flex: 1;
  background: $color-primary;
  border-radius: 2px;
  opacity: 0.6;
}

// 报表区域
.report-section {
  @include card;
  margin-bottom: $spacing-xl;
}

.section-header {
  margin-bottom: $spacing-lg;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0;
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-lg;
  margin-bottom: $spacing-lg;

  &.three-cols {
    grid-template-columns: repeat(3, 1fr);

    @media (max-width: $breakpoint-lg) {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  padding: $spacing-lg;
  background: $color-bg-page;
  border-radius: $radius-lg;
}

.chart-title {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
  margin: 0 0 $spacing-md 0;
}

.chart-container {
  height: 250px;
}

// Web Vitals 摘要
.vitals-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.vital-item {
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.vital-name {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
  margin-bottom: $spacing-xs;
}

.vital-value {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  margin-bottom: $spacing-sm;

  &.good { color: $color-success; }
  &.needs-improvement { color: $color-warning; }
  &.poor { color: $color-error; }
}

.vital-bar {
  height: 4px;
  background: $color-bg-hover;
  border-radius: 2px;
  margin-bottom: $spacing-sm;
}

.vital-progress {
  height: 100%;
  border-radius: 2px;

  &.good { background: $color-success; }
  &.needs-improvement { background: $color-warning; }
  &.poor { background: $color-error; }
}

.vital-percentiles {
  @include flex-start;
  gap: $spacing-md;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

// 数据卡片
.data-card {
  padding: $spacing-lg;
  background: $color-bg-page;
  border-radius: $radius-lg;
}

.card-title {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
  margin: 0 0 $spacing-md 0;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.rank-item {
  display: grid;
  grid-template-columns: 24px 1fr auto 100px;
  gap: $spacing-sm;
  align-items: center;
  padding: $spacing-sm 0;
}

.rank-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: $color-bg-hover;
  @include flex-center;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.rank-name {
  font-size: $font-size-sm;
  color: $color-text-primary;
  @include text-ellipsis;
}

.rank-value {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  text-align: right;
}

.rank-bar {
  height: 4px;
  background: $color-bg-hover;
  border-radius: 2px;
}

.rank-progress {
  height: 100%;
  background: $color-primary;
  border-radius: 2px;
}

// 数据表格
.data-table {
  margin-top: $spacing-lg;
}

.table-title {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
  margin: 0 0 $spacing-md 0;
}

.report-table {
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: $spacing-md;
    text-align: left;
    border-bottom: 1px solid $color-border-light;
  }

  th {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: $color-text-tertiary;
    background: $color-bg-page;
  }

  td {
    font-size: $font-size-sm;
    color: $color-text-primary;
  }

  .error-message,
  .resource-url {
    max-width: 300px;
    @include text-ellipsis;
    font-family: $font-family-mono;
    font-size: $font-size-xs;
  }

  .count,
  .users {
    font-weight: $font-weight-medium;
  }

  .time {
    color: $color-text-tertiary;
    font-size: $font-size-xs;
  }

  .duration {
    font-weight: $font-weight-medium;
    color: $color-warning;
  }
}

.type-badge {
  display: inline-block;
  padding: 2px $spacing-sm;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  background: $color-bg-hover;
  color: $color-text-secondary;

  &.script { background: #FFF7E8; color: #FF7D00; }
  &.stylesheet { background: #E8FFEA; color: #00B42A; }
  &.image { background: #F5E8FF; color: #722ED1; }
  &.font { background: #FFECE8; color: #F53F3F; }
}
</style>
