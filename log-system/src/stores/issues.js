/**
 * @fileoverview 问题管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export const useIssuesStore = defineStore('issues', () => {
  // 状态
  const issues = ref([])
  const currentIssue = ref(null)
  const loading = ref(false)
  const total = ref(0)
  const filters = ref({
    status: 'all',
    level: 'all',
    type: 'all',
    timeRange: '24h',
    search: '',
  })
  const pagination = ref({
    page: 1,
    pageSize: 20,
  })

  // 计算属性
  const issueStats = computed(() => {
    const stats = {
      total: total.value,
      unresolved: 0,
      resolved: 0,
      ignored: 0,
      critical: 0,
      error: 0,
      warning: 0,
    }

    issues.value.forEach(issue => {
      if (issue.status === 'unresolved') stats.unresolved++
      if (issue.status === 'resolved') stats.resolved++
      if (issue.status === 'ignored') stats.ignored++
      if (issue.level === 'critical') stats.critical++
      if (issue.level === 'error') stats.error++
      if (issue.level === 'warning') stats.warning++
    })

    return stats
  })

  // 获取问题列表
  async function fetchIssues() {
    loading.value = true
    try {
      const params = {
        ...filters.value,
        ...pagination.value,
      }
      const res = await api.issues.getList(params)
      issues.value = res.data.list || []
      total.value = res.data.total || 0
    } catch (error) {
      console.error('Failed to fetch issues:', error)
    } finally {
      loading.value = false
    }
  }

  // 获取问题详情
  async function fetchIssueDetail(id) {
    loading.value = true
    try {
      const res = await api.issues.getDetail(id)
      currentIssue.value = res.data
      return res.data
    } catch (error) {
      console.error('Failed to fetch issue detail:', error)
      return null
    } finally {
      loading.value = false
    }
  }

  // 更新问题状态
  async function updateIssueStatus(id, status) {
    try {
      await api.issues.updateStatus(id, status)
      // 更新本地状态
      const issue = issues.value.find(i => i.id === id)
      if (issue) {
        issue.status = status
      }
      if (currentIssue.value?.id === id) {
        currentIssue.value.status = status
      }
    } catch (error) {
      console.error('Failed to update issue status:', error)
      throw error
    }
  }

  // 批量更新状态
  async function batchUpdateStatus(ids, status) {
    try {
      await api.issues.batchUpdateStatus(ids, status)
      // 更新本地状态
      issues.value.forEach(issue => {
        if (ids.includes(issue.id)) {
          issue.status = status
        }
      })
    } catch (error) {
      console.error('Failed to batch update status:', error)
      throw error
    }
  }

  // 设置筛选条件
  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1
    fetchIssues()
  }

  // 设置分页
  function setPagination(newPagination) {
    pagination.value = { ...pagination.value, ...newPagination }
    fetchIssues()
  }

  // 重置筛选
  function resetFilters() {
    filters.value = {
      status: 'all',
      level: 'all',
      type: 'all',
      timeRange: '24h',
      search: '',
    }
    pagination.value.page = 1
    fetchIssues()
  }

  return {
    // 状态
    issues,
    currentIssue,
    loading,
    total,
    filters,
    pagination,
    // 计算属性
    issueStats,
    // 方法
    fetchIssues,
    fetchIssueDetail,
    updateIssueStatus,
    batchUpdateStatus,
    setFilters,
    setPagination,
    resetFilters,
  }
})
