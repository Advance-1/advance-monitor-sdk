<template>
  <div class="performance-page">
    <!-- 快捷入口 -->
    <div class="quick-links">
      <router-link to="/performance/waterfall" class="quick-link-card">
        <div class="link-icon">📊</div>
        <div class="link-content">
          <div class="link-title">资源瀑布图</div>
          <div class="link-desc">查看页面资源加载时序和耗时分析</div>
        </div>
        <div class="link-arrow">→</div>
      </router-link>
      <router-link to="/performance/longtasks" class="quick-link-card">
        <div class="link-icon">⏱️</div>
        <div class="link-content">
          <div class="link-title">长任务分析</div>
          <div class="link-desc">分析阻塞主线程的长任务，优化交互响应</div>
        </div>
        <div class="link-arrow">→</div>
      </router-link>
    </div>

    <!-- 性能评分卡片 -->
    <div class="score-card">
      <div class="score-main">
        <div class="score-circle" :class="scoreRating">
          <span class="score-value">{{ overallScore }}</span>
        </div>
        <div class="score-info">
          <h2 class="score-title">性能评分</h2>
          <p class="score-desc">基于 Core Web Vitals 指标计算</p>
        </div>
      </div>
      <div class="score-legend">
        <div class="legend-item good">
          <span class="legend-dot"></span>
          <span>良好 (0-100ms)</span>
        </div>
        <div class="legend-item needs-improvement">
          <span class="legend-dot"></span>
          <span>需改进</span>
        </div>
        <div class="legend-item poor">
          <span class="legend-dot"></span>
          <span>较差</span>
        </div>
      </div>
    </div>

    <!-- Web Vitals 指标 -->
    <div class="vitals-section">
      <h3 class="section-title">Core Web Vitals</h3>
      <div class="vitals-grid">
        <div class="vital-card" v-for="vital in webVitals" :key="vital.name">
          <div class="vital-header">
            <span class="vital-name">{{ vital.name }}</span>
            <span class="vital-badge" :class="vital.rating">{{ vital.ratingText }}</span>
          </div>
          <div class="vital-value" :style="{ color: getRatingColor(vital.rating) }">
            {{ vital.value }}{{ vital.unit }}
          </div>
          <div class="vital-bar">
            <div 
              class="vital-bar-fill" 
              :style="{ width: vital.percent + '%', background: getRatingColor(vital.rating) }"
            ></div>
          </div>
          <div class="vital-desc">{{ vital.description }}</div>
          <div class="vital-trend" :class="vital.trend > 0 ? 'up' : 'down'" v-if="vital.trend !== 0">
            {{ vital.trend > 0 ? '↑' : '↓' }} {{ Math.abs(vital.trend) }}%
          </div>
        </div>
      </div>
    </div>

    <!-- 性能趋势图表 -->
    <div class="chart-section">
      <div class="section-header">
        <h3 class="section-title">性能趋势</h3>
        <div class="chart-tabs">
          <button 
            v-for="metric in chartMetrics" 
            :key="metric.key"
            class="chart-tab"
            :class="{ active: activeMetric === metric.key }"
            @click="activeMetric = metric.key"
          >
            {{ metric.label }}
          </button>
        </div>
      </div>
      <div class="chart-container" ref="chartRef"></div>
    </div>

    <!-- 页面性能排行 -->
    <div class="pages-section">
      <h3 class="section-title">页面性能排行</h3>
      <div class="pages-table">
        <div class="table-header">
          <span class="col-page">页面</span>
          <span class="col-metric">LCP</span>
          <span class="col-metric">FID</span>
          <span class="col-metric">CLS</span>
          <span class="col-metric">TTFB</span>
          <span class="col-metric">访问量</span>
        </div>
        <div class="table-body">
          <div class="table-row" v-for="page in pageMetrics" :key="page.path">
            <span class="col-page">
              <span class="page-path">{{ page.path }}</span>
            </span>
            <span class="col-metric">
              <span class="metric-value" :style="{ color: getRatingColor(page.lcpRating) }">
                {{ page.lcp }}ms
              </span>
            </span>
            <span class="col-metric">
              <span class="metric-value" :style="{ color: getRatingColor(page.fidRating) }">
                {{ page.fid }}ms
              </span>
            </span>
            <span class="col-metric">
              <span class="metric-value" :style="{ color: getRatingColor(page.clsRating) }">
                {{ page.cls }}
              </span>
            </span>
            <span class="col-metric">
              <span class="metric-value" :style="{ color: getRatingColor(page.ttfbRating) }">
                {{ page.ttfb }}ms
              </span>
            </span>
            <span class="col-metric">
              <span class="metric-value">{{ formatNumber(page.views) }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 资源加载分析 -->
    <div class="resources-section">
      <h3 class="section-title">资源加载分析</h3>
      <div class="resources-grid">
        <div class="resource-card" v-for="resource in resourceStats" :key="resource.type">
          <div class="resource-icon" :style="{ background: resource.bgColor }">
            <span v-html="resource.icon"></span>
          </div>
          <div class="resource-info">
            <div class="resource-type">{{ resource.label }}</div>
            <div class="resource-stats">
              <span>{{ resource.count }} 个</span>
              <span>{{ formatBytes(resource.size) }}</span>
              <span>{{ resource.avgTime }}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { usePerformanceStore } from '@/stores'
import { formatNumber, formatBytes, getRatingColor } from '@/utils'

const performanceStore = usePerformanceStore()

// 图表
const chartRef = ref(null)
let chart = null

// 状态
const activeMetric = ref('lcp')

// 图表指标配置
const chartMetrics = [
  { key: 'lcp', label: 'LCP' },
  { key: 'fid', label: 'FID' },
  { key: 'cls', label: 'CLS' },
  { key: 'ttfb', label: 'TTFB' },
]

// 计算属性
const overallScore = computed(() => performanceStore.overallScore)
const scoreRating = computed(() => {
  if (overallScore.value >= 90) return 'good'
  if (overallScore.value >= 50) return 'needs-improvement'
  return 'poor'
})

const webVitals = computed(() => {
  const overview = performanceStore.overview
  return [
    {
      name: 'LCP',
      value: overview.lcp?.value || 0,
      unit: 'ms',
      rating: overview.lcp?.rating || 'good',
      ratingText: getRatingText(overview.lcp?.rating),
      percent: Math.min((overview.lcp?.value || 0) / 4000 * 100, 100),
      description: '最大内容绘制时间',
      trend: overview.lcp?.trend || 0,
    },
    {
      name: 'FID',
      value: overview.fid?.value || 0,
      unit: 'ms',
      rating: overview.fid?.rating || 'good',
      ratingText: getRatingText(overview.fid?.rating),
      percent: Math.min((overview.fid?.value || 0) / 300 * 100, 100),
      description: '首次输入延迟',
      trend: overview.fid?.trend || 0,
    },
    {
      name: 'CLS',
      value: (overview.cls?.value || 0).toFixed(3),
      unit: '',
      rating: overview.cls?.rating || 'good',
      ratingText: getRatingText(overview.cls?.rating),
      percent: Math.min((overview.cls?.value || 0) / 0.25 * 100, 100),
      description: '累积布局偏移',
      trend: overview.cls?.trend || 0,
    },
    {
      name: 'TTFB',
      value: overview.ttfb?.value || 0,
      unit: 'ms',
      rating: overview.ttfb?.rating || 'good',
      ratingText: getRatingText(overview.ttfb?.rating),
      percent: Math.min((overview.ttfb?.value || 0) / 800 * 100, 100),
      description: '首字节时间',
      trend: overview.ttfb?.trend || 0,
    },
  ]
})

const pageMetrics = computed(() => performanceStore.pageMetrics)

const resourceStats = ref([
  { type: 'script', label: 'JavaScript', count: 0, size: 0, avgTime: 0, bgColor: '#FFF7E8', icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#FF7D00" stroke-width="2"/></svg>' },
  { type: 'style', label: 'CSS', count: 0, size: 0, avgTime: 0, bgColor: '#E8F3FF', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#165DFF" stroke-width="2"/></svg>' },
  { type: 'image', label: '图片', count: 0, size: 0, avgTime: 0, bgColor: '#E8FFEA', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#00B42A" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="#00B42A"/><path d="M21 15L16 10L5 21" stroke="#00B42A" stroke-width="2"/></svg>' },
  { type: 'font', label: '字体', count: 0, size: 0, avgTime: 0, bgColor: '#F7F8FA', icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7V4H20V7" stroke="#86909C" stroke-width="2"/><path d="M12 4V20" stroke="#86909C" stroke-width="2"/><path d="M8 20H16" stroke="#86909C" stroke-width="2"/></svg>' },
])

// 方法
function getRatingText(rating) {
  const texts = {
    good: '良好',
    'needs-improvement': '需改进',
    poor: '较差',
  }
  return texts[rating] || '良好'
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
      name: 'LCP',
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
    }],
  }
  
  chart.setOption(option)
}

function updateChart() {
  if (!chart) return
  
  const chartData = performanceStore.chartData
  chart.setOption({
    xAxis: { data: chartData.timestamps || [] },
    series: [{ data: chartData[activeMetric.value] || [] }],
  })
}

function handleResize() {
  chart?.resize()
}

function handleGlobalRefresh() {
  performanceStore.refreshAll()
}

onMounted(async () => {
  initChart()
  await performanceStore.refreshAll()
  updateChart()
  
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

.performance-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 评分卡片
.score-card {
  @include card;
  @include flex-between;
  margin-bottom: $spacing-xl;
}

.score-main {
  @include flex-start;
  gap: $spacing-xl;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  @include flex-center;
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;

  &.good {
    background: $color-success-bg;
    color: $color-success;
    border: 3px solid $color-success;
  }

  &.needs-improvement {
    background: $color-warning-bg;
    color: $color-warning;
    border: 3px solid $color-warning;
  }

  &.poor {
    background: $color-error-bg;
    color: $color-error;
    border: 3px solid $color-error;
  }
}

.score-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.score-desc {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.score-legend {
  @include flex-start;
  gap: $spacing-xl;
}

.legend-item {
  @include flex-start;
  gap: $spacing-sm;
  font-size: $font-size-sm;
  color: $color-text-secondary;

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  &.good .legend-dot { background: $color-success; }
  &.needs-improvement .legend-dot { background: $color-warning; }
  &.poor .legend-dot { background: $color-error; }
}

// Web Vitals
.vitals-section {
  margin-bottom: $spacing-xl;
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-lg;
}

.vitals-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.vital-card {
  @include card;
  position: relative;
}

.vital-header {
  @include flex-between;
  margin-bottom: $spacing-md;
}

.vital-name {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.vital-badge {
  font-size: $font-size-xs;
  padding: 2px $spacing-sm;
  border-radius: $radius-sm;

  &.good { background: $color-success-bg; color: $color-success; }
  &.needs-improvement { background: $color-warning-bg; color: $color-warning; }
  &.poor { background: $color-error-bg; color: $color-error; }
}

.vital-value {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  margin-bottom: $spacing-md;
}

.vital-bar {
  height: 4px;
  background: $color-bg-hover;
  border-radius: 2px;
  margin-bottom: $spacing-sm;
  overflow: hidden;
}

.vital-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width $transition-slow;
}

.vital-desc {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.vital-trend {
  position: absolute;
  top: $spacing-base;
  right: $spacing-base;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;

  &.up { color: $color-error; }
  &.down { color: $color-success; }
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

.chart-tabs {
  @include flex-start;
  gap: $spacing-xs;
}

.chart-tab {
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

// 页面性能表格
.pages-section {
  @include card;
  margin-bottom: $spacing-xl;
}

.pages-table {
  overflow-x: auto;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1fr repeat(5, 100px);
  gap: $spacing-md;
  padding: $spacing-md 0;
}

.table-header {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  font-weight: $font-weight-medium;
  border-bottom: 1px solid $color-border-light;
}

.table-row {
  border-bottom: 1px solid $color-border-light;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: $color-bg-hover;
  }
}

.col-page {
  @include text-ellipsis;
}

.page-path {
  font-size: $font-size-sm;
  color: $color-text-primary;
}

.col-metric {
  text-align: center;
}

.metric-value {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
}

// 资源分析
.resources-section {
  @include card;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.resource-card {
  @include flex-start;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.resource-icon {
  width: 48px;
  height: 48px;
  border-radius: $radius-md;
  @include flex-center;
  flex-shrink: 0;

  :deep(svg) {
    width: 24px;
    height: 24px;
  }
}

.resource-type {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.resource-stats {
  @include flex-start;
  gap: $spacing-md;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

// 快捷入口
.quick-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
  }
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
