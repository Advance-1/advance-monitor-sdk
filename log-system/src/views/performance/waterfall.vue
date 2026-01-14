<template>
  <div class="waterfall-page">
    <!-- 页面选择器 -->
    <div class="page-selector">
      <div class="selector-header">
        <h3 class="section-title">资源加载瀑布图</h3>
        <div class="selector-controls">
          <select v-model="selectedPage" @change="fetchWaterfallData" class="page-select">
            <option value="">选择页面</option>
            <option v-for="page in pages" :key="page.url" :value="page.url">
              {{ page.title || page.url }}
            </option>
          </select>
          <button class="refresh-btn" @click="fetchWaterfallData" :disabled="loading">
            {{ loading ? '加载中...' : '刷新' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 概览统计 -->
    <div class="overview-stats" v-if="waterfallData">
      <div class="stat-card">
        <div class="stat-value">{{ waterfallData.resources.length }}</div>
        <div class="stat-label">资源总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatBytes(totalSize) }}</div>
        <div class="stat-label">总大小</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatMs(totalDuration) }}</div>
        <div class="stat-label">总耗时</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatMs(waterfallData.domContentLoaded) }}</div>
        <div class="stat-label">DOMContentLoaded</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatMs(waterfallData.loadEvent) }}</div>
        <div class="stat-label">Load Event</div>
      </div>
    </div>

    <!-- 资源类型分布 -->
    <div class="type-distribution" v-if="waterfallData">
      <div class="type-item" v-for="type in resourceTypes" :key="type.name">
        <div class="type-color" :style="{ background: type.color }"></div>
        <span class="type-name">{{ type.name }}</span>
        <span class="type-count">{{ type.count }}</span>
        <span class="type-size">{{ formatBytes(type.size) }}</span>
      </div>
    </div>

    <!-- 瀑布图 -->
    <div class="waterfall-container" v-if="waterfallData">
      <!-- 时间轴 -->
      <div class="timeline-header">
        <div class="resource-info-header">资源</div>
        <div class="timeline-scale">
          <div 
            class="scale-mark" 
            v-for="mark in timelineMarks" 
            :key="mark.time"
            :style="{ left: mark.percent + '%' }"
          >
            {{ mark.label }}
          </div>
        </div>
      </div>

      <!-- 关键时间点标记 -->
      <div class="timeline-markers">
        <div class="resource-info-placeholder"></div>
        <div class="markers-container">
          <div 
            class="marker domContentLoaded" 
            :style="{ left: getTimePercent(waterfallData.domContentLoaded) + '%' }"
            title="DOMContentLoaded"
          ></div>
          <div 
            class="marker loadEvent" 
            :style="{ left: getTimePercent(waterfallData.loadEvent) + '%' }"
            title="Load Event"
          ></div>
        </div>
      </div>

      <!-- 资源列表 -->
      <div class="waterfall-list">
        <div 
          class="waterfall-item" 
          v-for="(resource, index) in waterfallData.resources" 
          :key="index"
          @click="selectResource(resource)"
          :class="{ selected: selectedResource === resource }"
        >
          <div class="resource-info">
            <div class="resource-icon" :style="{ background: getTypeColor(resource.type) }">
              {{ getTypeIcon(resource.type) }}
            </div>
            <div class="resource-details">
              <div class="resource-name" :title="resource.name">{{ getResourceName(resource.name) }}</div>
              <div class="resource-meta">
                <span class="resource-type">{{ resource.type }}</span>
                <span class="resource-size">{{ formatBytes(resource.size) }}</span>
              </div>
            </div>
          </div>
          <div class="resource-timeline">
            <div 
              class="timing-bar"
              :style="getTimingBarStyle(resource)"
            >
              <!-- DNS -->
              <div 
                class="timing-segment dns" 
                v-if="resource.timing.dns > 0"
                :style="{ width: getSegmentWidth(resource.timing.dns, resource.duration) + '%' }"
                title="DNS"
              ></div>
              <!-- TCP -->
              <div 
                class="timing-segment tcp" 
                v-if="resource.timing.tcp > 0"
                :style="{ width: getSegmentWidth(resource.timing.tcp, resource.duration) + '%' }"
                title="TCP"
              ></div>
              <!-- SSL -->
              <div 
                class="timing-segment ssl" 
                v-if="resource.timing.ssl > 0"
                :style="{ width: getSegmentWidth(resource.timing.ssl, resource.duration) + '%' }"
                title="SSL"
              ></div>
              <!-- TTFB -->
              <div 
                class="timing-segment ttfb" 
                :style="{ width: getSegmentWidth(resource.timing.ttfb, resource.duration) + '%' }"
                title="TTFB"
              ></div>
              <!-- Download -->
              <div 
                class="timing-segment download" 
                :style="{ width: getSegmentWidth(resource.timing.download, resource.duration) + '%' }"
                title="Download"
              ></div>
            </div>
            <span class="timing-duration">{{ formatMs(resource.duration) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 资源详情面板 -->
    <div class="resource-detail-panel" v-if="selectedResource">
      <div class="panel-header">
        <h4>资源详情</h4>
        <button class="close-btn" @click="selectedResource = null">×</button>
      </div>
      <div class="panel-body">
        <div class="detail-group">
          <div class="detail-label">URL</div>
          <div class="detail-value url">{{ selectedResource.name }}</div>
        </div>
        <div class="detail-group">
          <div class="detail-label">类型</div>
          <div class="detail-value">{{ selectedResource.type }}</div>
        </div>
        <div class="detail-group">
          <div class="detail-label">大小</div>
          <div class="detail-value">{{ formatBytes(selectedResource.size) }}</div>
        </div>
        <div class="detail-group">
          <div class="detail-label">总耗时</div>
          <div class="detail-value">{{ formatMs(selectedResource.duration) }}</div>
        </div>
        
        <div class="timing-breakdown">
          <h5>时间分解</h5>
          <div class="timing-item" v-if="selectedResource.timing.dns > 0">
            <span class="timing-name">DNS 查询</span>
            <span class="timing-value">{{ formatMs(selectedResource.timing.dns) }}</span>
          </div>
          <div class="timing-item" v-if="selectedResource.timing.tcp > 0">
            <span class="timing-name">TCP 连接</span>
            <span class="timing-value">{{ formatMs(selectedResource.timing.tcp) }}</span>
          </div>
          <div class="timing-item" v-if="selectedResource.timing.ssl > 0">
            <span class="timing-name">SSL 握手</span>
            <span class="timing-value">{{ formatMs(selectedResource.timing.ssl) }}</span>
          </div>
          <div class="timing-item">
            <span class="timing-name">等待响应 (TTFB)</span>
            <span class="timing-value">{{ formatMs(selectedResource.timing.ttfb) }}</span>
          </div>
          <div class="timing-item">
            <span class="timing-name">内容下载</span>
            <span class="timing-value">{{ formatMs(selectedResource.timing.download) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="waterfall-legend">
      <div class="legend-item">
        <span class="legend-color dns"></span>
        <span>DNS</span>
      </div>
      <div class="legend-item">
        <span class="legend-color tcp"></span>
        <span>TCP</span>
      </div>
      <div class="legend-item">
        <span class="legend-color ssl"></span>
        <span>SSL</span>
      </div>
      <div class="legend-item">
        <span class="legend-color ttfb"></span>
        <span>TTFB</span>
      </div>
      <div class="legend-item">
        <span class="legend-color download"></span>
        <span>Download</span>
      </div>
      <div class="legend-item">
        <span class="legend-marker domContentLoaded"></span>
        <span>DOMContentLoaded</span>
      </div>
      <div class="legend-item">
        <span class="legend-marker loadEvent"></span>
        <span>Load</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="!waterfallData && !loading">
      <div class="empty-icon">📊</div>
      <div class="empty-title">选择页面查看资源加载瀑布图</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'

// 状态
const loading = ref(false)
const pages = ref([])
const selectedPage = ref('')
const waterfallData = ref(null)
const selectedResource = ref(null)

// 资源类型颜色
const typeColors = {
  document: '#165DFF',
  script: '#FF7D00',
  stylesheet: '#00B42A',
  image: '#722ED1',
  font: '#F53F3F',
  xhr: '#14C9C9',
  fetch: '#14C9C9',
  other: '#86909C',
}

// 计算属性
const totalSize = computed(() => {
  if (!waterfallData.value) return 0
  return waterfallData.value.resources.reduce((sum, r) => sum + (r.size || 0), 0)
})

const totalDuration = computed(() => {
  if (!waterfallData.value) return 0
  return Math.max(...waterfallData.value.resources.map(r => r.startTime + r.duration))
})

const resourceTypes = computed(() => {
  if (!waterfallData.value) return []
  
  const types = {}
  waterfallData.value.resources.forEach(r => {
    if (!types[r.type]) {
      types[r.type] = { name: r.type, count: 0, size: 0, color: typeColors[r.type] || typeColors.other }
    }
    types[r.type].count++
    types[r.type].size += r.size || 0
  })
  
  return Object.values(types).sort((a, b) => b.count - a.count)
})

const timelineMarks = computed(() => {
  if (!waterfallData.value) return []
  
  const maxTime = totalDuration.value
  const marks = []
  const step = Math.ceil(maxTime / 5 / 100) * 100 // 取整到 100ms
  
  for (let i = 0; i <= 5; i++) {
    const time = i * step
    marks.push({
      time,
      percent: (time / maxTime) * 100,
      label: formatMs(time),
    })
  }
  
  return marks
})

// 方法
function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatMs(ms) {
  if (!ms) return '0ms'
  if (ms < 1000) return Math.round(ms) + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

function getTypeColor(type) {
  return typeColors[type] || typeColors.other
}

function getTypeIcon(type) {
  const icons = {
    document: '📄',
    script: '📜',
    stylesheet: '🎨',
    image: '🖼️',
    font: '🔤',
    xhr: '📡',
    fetch: '📡',
    other: '📦',
  }
  return icons[type] || icons.other
}

function getResourceName(url) {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname
    return path.split('/').pop() || path
  } catch {
    return url.split('/').pop() || url
  }
}

function getTimePercent(time) {
  if (!totalDuration.value) return 0
  return (time / totalDuration.value) * 100
}

function getTimingBarStyle(resource) {
  const left = getTimePercent(resource.startTime)
  const width = getTimePercent(resource.duration)
  return {
    left: left + '%',
    width: Math.max(width, 0.5) + '%',
  }
}

function getSegmentWidth(segmentTime, totalTime) {
  if (!totalTime) return 0
  return (segmentTime / totalTime) * 100
}

function selectResource(resource) {
  selectedResource.value = selectedResource.value === resource ? null : resource
}

async function fetchPages() {
  try {
    const res = await api.performance.getPageMetrics()
    pages.value = res.data || []
  } catch (error) {
    console.error('Failed to fetch pages:', error)
  }
}

async function fetchWaterfallData() {
  if (!selectedPage.value) return
  
  loading.value = true
  try {
    // 模拟数据 - 实际应该从 API 获取
    waterfallData.value = generateMockWaterfallData()
  } catch (error) {
    console.error('Failed to fetch waterfall data:', error)
  } finally {
    loading.value = false
  }
}

// 生成模拟数据
function generateMockWaterfallData() {
  const resources = []
  const types = ['document', 'stylesheet', 'script', 'image', 'font', 'xhr']
  
  let currentTime = 0
  
  // Document
  resources.push({
    name: selectedPage.value || 'https://example.com/',
    type: 'document',
    size: 45000,
    startTime: 0,
    duration: 350,
    timing: { dns: 20, tcp: 30, ssl: 40, ttfb: 180, download: 80 },
  })
  currentTime = 100
  
  // CSS
  for (let i = 0; i < 3; i++) {
    resources.push({
      name: `https://cdn.example.com/css/style${i + 1}.css`,
      type: 'stylesheet',
      size: 15000 + Math.random() * 30000,
      startTime: currentTime + Math.random() * 50,
      duration: 100 + Math.random() * 200,
      timing: { dns: 0, tcp: 0, ssl: 0, ttfb: 50 + Math.random() * 50, download: 50 + Math.random() * 150 },
    })
  }
  currentTime += 150
  
  // JS
  for (let i = 0; i < 5; i++) {
    resources.push({
      name: `https://cdn.example.com/js/bundle${i + 1}.js`,
      type: 'script',
      size: 50000 + Math.random() * 200000,
      startTime: currentTime + Math.random() * 100,
      duration: 150 + Math.random() * 400,
      timing: { dns: 0, tcp: 0, ssl: 0, ttfb: 80 + Math.random() * 100, download: 70 + Math.random() * 300 },
    })
  }
  currentTime += 300
  
  // Images
  for (let i = 0; i < 8; i++) {
    resources.push({
      name: `https://cdn.example.com/images/img${i + 1}.${['jpg', 'png', 'webp'][i % 3]}`,
      type: 'image',
      size: 20000 + Math.random() * 100000,
      startTime: currentTime + Math.random() * 200,
      duration: 100 + Math.random() * 500,
      timing: { dns: 0, tcp: 0, ssl: 0, ttfb: 30 + Math.random() * 50, download: 70 + Math.random() * 450 },
    })
  }
  
  // Fonts
  for (let i = 0; i < 2; i++) {
    resources.push({
      name: `https://cdn.example.com/fonts/font${i + 1}.woff2`,
      type: 'font',
      size: 30000 + Math.random() * 50000,
      startTime: currentTime + Math.random() * 100,
      duration: 80 + Math.random() * 150,
      timing: { dns: 0, tcp: 0, ssl: 0, ttfb: 40 + Math.random() * 40, download: 40 + Math.random() * 110 },
    })
  }
  
  // XHR
  for (let i = 0; i < 3; i++) {
    resources.push({
      name: `https://api.example.com/data/${['users', 'products', 'config'][i]}`,
      type: 'xhr',
      size: 5000 + Math.random() * 20000,
      startTime: currentTime + 200 + Math.random() * 300,
      duration: 100 + Math.random() * 300,
      timing: { dns: 0, tcp: 0, ssl: 0, ttfb: 80 + Math.random() * 150, download: 20 + Math.random() * 150 },
    })
  }
  
  // 排序
  resources.sort((a, b) => a.startTime - b.startTime)
  
  const maxEndTime = Math.max(...resources.map(r => r.startTime + r.duration))
  
  return {
    url: selectedPage.value,
    resources,
    domContentLoaded: maxEndTime * 0.6,
    loadEvent: maxEndTime * 0.9,
  }
}

onMounted(() => {
  fetchPages()
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.waterfall-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 页面选择器
.page-selector {
  @include card;
  margin-bottom: $spacing-lg;
}

.selector-header {
  @include flex-between;
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0;
}

.selector-controls {
  @include flex-start;
  gap: $spacing-md;
}

.page-select {
  @include input-base;
  min-width: 300px;
}

.refresh-btn {
  @include button-primary;
}

// 概览统计
.overview-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: $spacing-md;
  margin-bottom: $spacing-lg;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.stat-card {
  @include card;
  text-align: center;
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

// 资源类型分布
.type-distribution {
  @include flex-start;
  flex-wrap: wrap;
  gap: $spacing-lg;
  margin-bottom: $spacing-lg;
  padding: $spacing-md;
  background: $color-bg-container;
  border-radius: $radius-lg;
}

.type-item {
  @include flex-start;
  gap: $spacing-sm;
  font-size: $font-size-sm;
}

.type-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.type-name {
  color: $color-text-secondary;
}

.type-count {
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.type-size {
  color: $color-text-tertiary;
}

// 瀑布图容器
.waterfall-container {
  @include card($padding: 0);
  overflow: hidden;
}

// 时间轴头部
.timeline-header {
  display: flex;
  border-bottom: 1px solid $color-border-light;
  background: $color-bg-page;
}

.resource-info-header {
  width: 280px;
  padding: $spacing-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
  flex-shrink: 0;
}

.timeline-scale {
  flex: 1;
  position: relative;
  height: 36px;
}

.scale-mark {
  position: absolute;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

// 时间标记
.timeline-markers {
  display: flex;
  height: 4px;
  background: $color-bg-page;
}

.resource-info-placeholder {
  width: 280px;
  flex-shrink: 0;
}

.markers-container {
  flex: 1;
  position: relative;
}

.marker {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  
  &.domContentLoaded {
    background: #165DFF;
  }
  
  &.loadEvent {
    background: #F53F3F;
  }
}

// 瀑布图列表
.waterfall-list {
  max-height: 600px;
  overflow-y: auto;
  @include custom-scrollbar;
}

.waterfall-item {
  display: flex;
  border-bottom: 1px solid $color-border-light;
  cursor: pointer;
  transition: background $transition-fast;

  &:hover {
    background: $color-bg-hover;
  }

  &.selected {
    background: $color-primary-bg;
  }
}

.resource-info {
  width: 280px;
  padding: $spacing-sm $spacing-md;
  @include flex-start;
  gap: $spacing-sm;
  flex-shrink: 0;
  border-right: 1px solid $color-border-light;
}

.resource-icon {
  width: 24px;
  height: 24px;
  border-radius: $radius-sm;
  @include flex-center;
  font-size: 12px;
  flex-shrink: 0;
}

.resource-details {
  min-width: 0;
  flex: 1;
}

.resource-name {
  font-size: $font-size-sm;
  color: $color-text-primary;
  @include text-ellipsis;
}

.resource-meta {
  @include flex-start;
  gap: $spacing-sm;
  margin-top: 2px;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.resource-timeline {
  flex: 1;
  position: relative;
  height: 40px;
  @include flex-start;
}

.timing-bar {
  position: absolute;
  height: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  border-radius: 2px;
  overflow: hidden;
}

.timing-segment {
  height: 100%;
  
  &.dns { background: #86909C; }
  &.tcp { background: #FF7D00; }
  &.ssl { background: #722ED1; }
  &.ttfb { background: #00B42A; }
  &.download { background: #165DFF; }
}

.timing-duration {
  position: absolute;
  right: $spacing-sm;
  top: 50%;
  transform: translateY(-50%);
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

// 资源详情面板
.resource-detail-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 400px;
  background: $color-bg-container;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  z-index: $z-index-modal;
  display: flex;
  flex-direction: column;
}

.panel-header {
  @include flex-between;
  padding: $spacing-lg;
  border-bottom: 1px solid $color-border-light;

  h4 {
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    margin: 0;
  }
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: $font-size-xl;
  color: $color-text-tertiary;
  cursor: pointer;
  border-radius: $radius-md;

  &:hover {
    background: $color-bg-hover;
  }
}

.panel-body {
  flex: 1;
  padding: $spacing-lg;
  overflow-y: auto;
}

.detail-group {
  margin-bottom: $spacing-lg;
}

.detail-label {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-bottom: $spacing-xs;
}

.detail-value {
  font-size: $font-size-sm;
  color: $color-text-primary;

  &.url {
    word-break: break-all;
    font-family: $font-family-mono;
    font-size: $font-size-xs;
    padding: $spacing-sm;
    background: $color-bg-page;
    border-radius: $radius-sm;
  }
}

.timing-breakdown {
  margin-top: $spacing-xl;

  h5 {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    margin-bottom: $spacing-md;
  }
}

.timing-item {
  @include flex-between;
  padding: $spacing-sm 0;
  border-bottom: 1px solid $color-border-light;

  &:last-child {
    border-bottom: none;
  }
}

.timing-name {
  font-size: $font-size-sm;
  color: $color-text-secondary;
}

.timing-value {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

// 图例
.waterfall-legend {
  @include flex-start;
  flex-wrap: wrap;
  gap: $spacing-lg;
  margin-top: $spacing-lg;
  padding: $spacing-md;
  background: $color-bg-container;
  border-radius: $radius-lg;
}

.legend-item {
  @include flex-start;
  gap: $spacing-xs;
  font-size: $font-size-xs;
  color: $color-text-secondary;
}

.legend-color {
  width: 16px;
  height: 8px;
  border-radius: 2px;

  &.dns { background: #86909C; }
  &.tcp { background: #FF7D00; }
  &.ssl { background: #722ED1; }
  &.ttfb { background: #00B42A; }
  &.download { background: #165DFF; }
}

.legend-marker {
  width: 2px;
  height: 12px;

  &.domContentLoaded { background: #165DFF; }
  &.loadEvent { background: #F53F3F; }
}

// 空状态
.empty-state {
  @include card;
  @include flex-center;
  flex-direction: column;
  padding: $spacing-4xl;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: $spacing-md;
}

.empty-title {
  font-size: $font-size-base;
  color: $color-text-tertiary;
}
</style>
