<template>
  <div class="longtasks-page">
    <!-- 概览统计 -->
    <div class="overview-section">
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon" style="background: #FFECE8;">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalTasks }}</div>
            <div class="stat-label">长任务总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #FFF7E8;">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatMs(stats.totalDuration) }}</div>
            <div class="stat-label">总阻塞时间</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #E8F3FF;">📈</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatMs(stats.avgDuration) }}</div>
            <div class="stat-label">平均耗时</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: #E8FFEA;">🎯</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatMs(stats.maxDuration) }}</div>
            <div class="stat-label">最长耗时</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 长任务分布图 -->
    <div class="chart-section">
      <div class="section-header">
        <h3 class="section-title">长任务分布</h3>
        <div class="time-range-selector">
          <button 
            v-for="range in timeRanges" 
            :key="range.value"
            class="range-btn"
            :class="{ active: selectedRange === range.value }"
            @click="selectedRange = range.value"
          >
            {{ range.label }}
          </button>
        </div>
      </div>
      <div class="chart-container" ref="distributionChartRef"></div>
    </div>

    <!-- 长任务时间线 -->
    <div class="timeline-section">
      <div class="section-header">
        <h3 class="section-title">长任务时间线</h3>
      </div>
      <div class="chart-container" ref="timelineChartRef"></div>
    </div>

    <!-- 长任务来源分析 -->
    <div class="source-section">
      <div class="section-header">
        <h3 class="section-title">任务来源分析</h3>
      </div>
      <div class="source-grid">
        <div class="source-chart">
          <div class="chart-container" ref="sourceChartRef"></div>
        </div>
        <div class="source-list">
          <div class="source-item" v-for="source in taskSources" :key="source.name">
            <div class="source-info">
              <div class="source-color" :style="{ background: source.color }"></div>
              <div class="source-name">{{ source.name }}</div>
            </div>
            <div class="source-stats">
              <span class="source-count">{{ source.count }} 次</span>
              <span class="source-duration">{{ formatMs(source.totalDuration) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 长任务列表 -->
    <div class="tasks-section">
      <div class="section-header">
        <h3 class="section-title">长任务详情</h3>
        <div class="filter-controls">
          <select v-model="durationFilter" class="filter-select">
            <option value="all">全部耗时</option>
            <option value="50">≥ 50ms</option>
            <option value="100">≥ 100ms</option>
            <option value="200">≥ 200ms</option>
            <option value="500">≥ 500ms</option>
          </select>
        </div>
      </div>
      <div class="tasks-list">
        <div class="task-item" v-for="task in filteredTasks" :key="task.id">
          <div class="task-header">
            <div class="task-duration" :class="getDurationClass(task.duration)">
              {{ formatMs(task.duration) }}
            </div>
            <div class="task-time">{{ formatTime(task.timestamp) }}</div>
          </div>
          <div class="task-body">
            <div class="task-source">
              <span class="source-badge" :style="{ background: getSourceColor(task.source) }">
                {{ task.source }}
              </span>
            </div>
            <div class="task-attribution" v-if="task.attribution">
              <div class="attribution-item" v-for="attr in task.attribution" :key="attr.name">
                <span class="attr-name">{{ attr.name }}</span>
                <span class="attr-duration">{{ formatMs(attr.duration) }}</span>
              </div>
            </div>
            <div class="task-stack" v-if="task.stack">
              <div class="stack-toggle" @click="task.showStack = !task.showStack">
                {{ task.showStack ? '收起' : '展开' }} 调用栈
              </div>
              <pre class="stack-content" v-if="task.showStack">{{ task.stack }}</pre>
            </div>
          </div>
          <div class="task-context">
            <span class="context-item">
              <span class="context-label">页面:</span>
              {{ task.url }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 优化建议 -->
    <div class="suggestions-section">
      <div class="section-header">
        <h3 class="section-title">优化建议</h3>
      </div>
      <div class="suggestions-list">
        <div class="suggestion-item" v-for="(suggestion, index) in suggestions" :key="index">
          <div class="suggestion-icon">💡</div>
          <div class="suggestion-content">
            <div class="suggestion-title">{{ suggestion.title }}</div>
            <div class="suggestion-desc">{{ suggestion.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

// 图表引用
const distributionChartRef = ref(null)
const timelineChartRef = ref(null)
const sourceChartRef = ref(null)
let distributionChart = null
let timelineChart = null
let sourceChart = null

// 状态
const selectedRange = ref('24h')
const durationFilter = ref('all')
const longTasks = ref([])

// 时间范围选项
const timeRanges = [
  { label: '1小时', value: '1h' },
  { label: '6小时', value: '6h' },
  { label: '24小时', value: '24h' },
  { label: '7天', value: '7d' },
]

// 任务来源颜色
const sourceColors = {
  'script': '#FF7D00',
  'layout': '#165DFF',
  'style': '#722ED1',
  'paint': '#00B42A',
  'gc': '#F53F3F',
  'other': '#86909C',
}

// 计算属性
const stats = computed(() => {
  if (longTasks.value.length === 0) {
    return { totalTasks: 0, totalDuration: 0, avgDuration: 0, maxDuration: 0 }
  }
  
  const durations = longTasks.value.map(t => t.duration)
  return {
    totalTasks: longTasks.value.length,
    totalDuration: durations.reduce((a, b) => a + b, 0),
    avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    maxDuration: Math.max(...durations),
  }
})

const taskSources = computed(() => {
  const sources = {}
  longTasks.value.forEach(task => {
    const source = task.source || 'other'
    if (!sources[source]) {
      sources[source] = { name: source, count: 0, totalDuration: 0, color: sourceColors[source] || sourceColors.other }
    }
    sources[source].count++
    sources[source].totalDuration += task.duration
  })
  return Object.values(sources).sort((a, b) => b.totalDuration - a.totalDuration)
})

const filteredTasks = computed(() => {
  let tasks = [...longTasks.value]
  
  if (durationFilter.value !== 'all') {
    const minDuration = parseInt(durationFilter.value)
    tasks = tasks.filter(t => t.duration >= minDuration)
  }
  
  return tasks.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)
})

const suggestions = computed(() => {
  const result = []
  
  if (stats.value.totalTasks > 10) {
    result.push({
      title: '长任务数量过多',
      description: '考虑使用 Web Workers 将计算密集型任务移出主线程，或使用 requestIdleCallback 分割任务。',
    })
  }
  
  if (stats.value.maxDuration > 500) {
    result.push({
      title: '存在超长任务',
      description: '发现耗时超过 500ms 的任务，建议检查是否有同步操作阻塞主线程，如大量 DOM 操作或复杂计算。',
    })
  }
  
  const scriptTasks = taskSources.value.find(s => s.name === 'script')
  if (scriptTasks && scriptTasks.count > 5) {
    result.push({
      title: 'JavaScript 执行时间过长',
      description: '考虑代码分割、延迟加载非关键脚本，或优化热点函数。',
    })
  }
  
  const layoutTasks = taskSources.value.find(s => s.name === 'layout')
  if (layoutTasks && layoutTasks.count > 3) {
    result.push({
      title: '频繁触发布局',
      description: '避免强制同步布局，批量读写 DOM 属性，使用 CSS transform 代替 top/left。',
    })
  }
  
  if (result.length === 0) {
    result.push({
      title: '性能表现良好',
      description: '当前页面长任务数量和耗时都在合理范围内，继续保持！',
    })
  }
  
  return result
})

// 方法
function formatMs(ms) {
  if (!ms) return '0ms'
  if (ms < 1000) return Math.round(ms) + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

function formatTime(timestamp) {
  return dayjs(timestamp).format('HH:mm:ss')
}

function getDurationClass(duration) {
  if (duration >= 500) return 'critical'
  if (duration >= 200) return 'warning'
  return 'normal'
}

function getSourceColor(source) {
  return sourceColors[source] || sourceColors.other
}

// 初始化分布图
function initDistributionChart() {
  if (!distributionChartRef.value) return
  
  distributionChart = echarts.init(distributionChartRef.value)
  
  // 生成分布数据
  const buckets = [
    { range: '50-100ms', min: 50, max: 100 },
    { range: '100-200ms', min: 100, max: 200 },
    { range: '200-500ms', min: 200, max: 500 },
    { range: '500ms-1s', min: 500, max: 1000 },
    { range: '>1s', min: 1000, max: Infinity },
  ]
  
  const data = buckets.map(bucket => {
    const count = longTasks.value.filter(t => t.duration >= bucket.min && t.duration < bucket.max).length
    return count
  })
  
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
      data: buckets.map(b => b.range),
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
      type: 'bar',
      data: data.map((value, index) => ({
        value,
        itemStyle: {
          color: index < 2 ? '#00B42A' : index < 4 ? '#FF7D00' : '#F53F3F',
        },
      })),
      barWidth: '60%',
      label: {
        show: true,
        position: 'top',
        color: '#86909C',
      },
    }],
  }
  
  distributionChart.setOption(option)
}

// 初始化时间线图
function initTimelineChart() {
  if (!timelineChartRef.value) return
  
  timelineChart = echarts.init(timelineChartRef.value)
  
  // 按时间聚合
  const timeData = {}
  longTasks.value.forEach(task => {
    const hour = dayjs(task.timestamp).format('HH:00')
    if (!timeData[hour]) {
      timeData[hour] = { count: 0, duration: 0 }
    }
    timeData[hour].count++
    timeData[hour].duration += task.duration
  })
  
  const hours = Object.keys(timeData).sort()
  
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#E5E6EB',
      borderWidth: 1,
      textStyle: { color: '#1D2129' },
    },
    legend: {
      data: ['任务数', '总耗时'],
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
      data: hours,
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' },
    },
    yAxis: [
      {
        type: 'value',
        name: '任务数',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#F2F3F5' } },
        axisLabel: { color: '#86909C' },
      },
      {
        type: 'value',
        name: '耗时(ms)',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#86909C' },
      },
    ],
    series: [
      {
        name: '任务数',
        type: 'bar',
        data: hours.map(h => timeData[h]?.count || 0),
        itemStyle: { color: '#165DFF' },
      },
      {
        name: '总耗时',
        type: 'line',
        yAxisIndex: 1,
        data: hours.map(h => timeData[h]?.duration || 0),
        lineStyle: { color: '#FF7D00' },
        itemStyle: { color: '#FF7D00' },
      },
    ],
  }
  
  timelineChart.setOption(option)
}

// 初始化来源图
function initSourceChart() {
  if (!sourceChartRef.value) return
  
  sourceChart = echarts.init(sourceChartRef.value)
  
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
      radius: ['50%', '70%'],
      avoidLabelOverlap: false,
      label: {
        show: false,
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      data: taskSources.value.map(s => ({
        name: s.name,
        value: s.totalDuration,
        itemStyle: { color: s.color },
      })),
    }],
  }
  
  sourceChart.setOption(option)
}

// 生成模拟数据
function generateMockData() {
  const tasks = []
  const sources = ['script', 'layout', 'style', 'paint', 'gc']
  const now = Date.now()
  
  for (let i = 0; i < 50; i++) {
    const duration = 50 + Math.random() * 500
    tasks.push({
      id: `task_${i}`,
      timestamp: now - Math.random() * 24 * 60 * 60 * 1000,
      duration,
      source: sources[Math.floor(Math.random() * sources.length)],
      url: 'https://example.com/page',
      attribution: duration > 100 ? [
        { name: 'Function A', duration: duration * 0.4 },
        { name: 'Function B', duration: duration * 0.3 },
        { name: 'Other', duration: duration * 0.3 },
      ] : null,
      stack: duration > 200 ? `at functionA (app.js:123:45)
at functionB (app.js:456:78)
at handleClick (app.js:789:12)` : null,
      showStack: false,
    })
  }
  
  longTasks.value = tasks
}

function handleResize() {
  distributionChart?.resize()
  timelineChart?.resize()
  sourceChart?.resize()
}

onMounted(() => {
  generateMockData()
  
  setTimeout(() => {
    initDistributionChart()
    initTimelineChart()
    initSourceChart()
  }, 100)
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  distributionChart?.dispose()
  timelineChart?.dispose()
  sourceChart?.dispose()
  window.removeEventListener('resize', handleResize)
})

watch(selectedRange, () => {
  generateMockData()
  setTimeout(() => {
    initDistributionChart()
    initTimelineChart()
    initSourceChart()
  }, 100)
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.longtasks-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 概览统计
.overview-section {
  margin-bottom: $spacing-xl;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;

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

// 图表区域
.chart-section,
.timeline-section,
.source-section {
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
  margin: 0;
}

.time-range-selector {
  @include flex-start;
  gap: $spacing-xs;
}

.range-btn {
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

// 来源分析
.source-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-xl;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
  }
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.source-item {
  @include flex-between;
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.source-info {
  @include flex-start;
  gap: $spacing-sm;
}

.source-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.source-name {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.source-stats {
  @include flex-start;
  gap: $spacing-md;
  font-size: $font-size-sm;
}

.source-count {
  color: $color-text-secondary;
}

.source-duration {
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

// 任务列表
.tasks-section {
  @include card;
  margin-bottom: $spacing-xl;
}

.filter-controls {
  @include flex-start;
  gap: $spacing-md;
}

.filter-select {
  @include input-base;
  padding: $spacing-xs $spacing-md;
  min-width: 120px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.task-item {
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
  border-left: 3px solid transparent;

  &:hover {
    background: $color-bg-hover;
  }
}

.task-header {
  @include flex-between;
  margin-bottom: $spacing-sm;
}

.task-duration {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;

  &.normal {
    background: $color-success-bg;
    color: $color-success;
  }

  &.warning {
    background: $color-warning-bg;
    color: $color-warning;
  }

  &.critical {
    background: $color-error-bg;
    color: $color-error;
  }
}

.task-time {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.task-body {
  margin-bottom: $spacing-sm;
}

.source-badge {
  display: inline-block;
  padding: 2px $spacing-sm;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  color: #fff;
}

.task-attribution {
  margin-top: $spacing-sm;
  padding: $spacing-sm;
  background: $color-bg-container;
  border-radius: $radius-sm;
}

.attribution-item {
  @include flex-between;
  padding: $spacing-xs 0;
  font-size: $font-size-xs;

  &:not(:last-child) {
    border-bottom: 1px solid $color-border-light;
  }
}

.attr-name {
  color: $color-text-secondary;
}

.attr-duration {
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.task-stack {
  margin-top: $spacing-sm;
}

.stack-toggle {
  font-size: $font-size-xs;
  color: $color-primary;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.stack-content {
  margin-top: $spacing-sm;
  padding: $spacing-sm;
  background: #1E1E1E;
  border-radius: $radius-sm;
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  color: #D4D4D4;
  overflow-x: auto;
}

.task-context {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.context-label {
  color: $color-text-quaternary;
}

// 优化建议
.suggestions-section {
  @include card;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.suggestion-item {
  @include flex-start;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.suggestion-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.suggestion-title {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.suggestion-desc {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  line-height: 1.5;
}
</style>
