/**
 * @fileoverview 性能监控 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export const usePerformanceStore = defineStore('performance', () => {
  // 状态
  const overview = ref({
    lcp: { value: 0, trend: 0, rating: 'good' },
    fid: { value: 0, trend: 0, rating: 'good' },
    cls: { value: 0, trend: 0, rating: 'good' },
    ttfb: { value: 0, trend: 0, rating: 'good' },
    fcp: { value: 0, trend: 0, rating: 'good' },
  })
  const chartData = ref({
    timestamps: [],
    lcp: [],
    fid: [],
    cls: [],
  })
  const pageMetrics = ref([])
  const resourceMetrics = ref([])
  const loading = ref(false)
  const timeRange = ref('24h')

  // 计算属性
  const overallScore = computed(() => {
    const ratings = Object.values(overview.value).map(m => m.rating)
    const goodCount = ratings.filter(r => r === 'good').length
    return Math.round((goodCount / ratings.length) * 100)
  })

  // 获取概览数据
  async function fetchOverview() {
    loading.value = true
    try {
      const res = await api.performance.getOverview({ timeRange: timeRange.value })
      overview.value = res.data
    } catch (error) {
      console.error('Failed to fetch performance overview:', error)
    } finally {
      loading.value = false
    }
  }

  // 获取图表数据
  async function fetchChartData() {
    try {
      const res = await api.performance.getChartData({ timeRange: timeRange.value })
      chartData.value = res.data
    } catch (error) {
      console.error('Failed to fetch chart data:', error)
    }
  }

  // 获取页面性能指标
  async function fetchPageMetrics() {
    try {
      const res = await api.performance.getPageMetrics({ timeRange: timeRange.value })
      pageMetrics.value = res.data
    } catch (error) {
      console.error('Failed to fetch page metrics:', error)
    }
  }

  // 获取资源加载指标
  async function fetchResourceMetrics() {
    try {
      const res = await api.performance.getResourceMetrics({ timeRange: timeRange.value })
      resourceMetrics.value = res.data
    } catch (error) {
      console.error('Failed to fetch resource metrics:', error)
    }
  }

  // 设置时间范围
  function setTimeRange(range) {
    timeRange.value = range
    fetchOverview()
    fetchChartData()
  }

  // 刷新所有数据
  async function refreshAll() {
    await Promise.all([
      fetchOverview(),
      fetchChartData(),
      fetchPageMetrics(),
      fetchResourceMetrics(),
    ])
  }

  return {
    // 状态
    overview,
    chartData,
    pageMetrics,
    resourceMetrics,
    loading,
    timeRange,
    // 计算属性
    overallScore,
    // 方法
    fetchOverview,
    fetchChartData,
    fetchPageMetrics,
    fetchResourceMetrics,
    setTimeRange,
    refreshAll,
  }
})
