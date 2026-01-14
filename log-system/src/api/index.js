/**
 * @fileoverview API 模块
 */

import request from './request.js'

// 问题相关 API
const issues = {
  getList: (params) => request.get('/api/issues', { params }),
  getDetail: (id) => request.get(`/api/issues/${id}`),
  updateStatus: (id, status) => request.put(`/api/issues/${id}/status`, { status }),
  batchUpdateStatus: (ids, status) => request.put('/api/issues/batch-status', { ids, status }),
  getEvents: (id, params) => request.get(`/api/issues/${id}/events`, { params }),
  getTags: (id) => request.get(`/api/issues/${id}/tags`),
}

// 性能相关 API
const performance = {
  getOverview: (params) => request.get('/api/performance/overview', { params }),
  getChartData: (params) => request.get('/api/performance/chart', { params }),
  getPageMetrics: (params) => request.get('/api/performance/pages', { params }),
  getResourceMetrics: (params) => request.get('/api/performance/resources', { params }),
}

// 行为相关 API
const behavior = {
  getOverview: (params) => request.get('/api/behavior/overview', { params }),
  getPageViews: (params) => request.get('/api/behavior/pageviews', { params }),
  getUserSessions: (params) => request.get('/api/behavior/sessions', { params }),
  getSessionDetail: (id) => request.get(`/api/behavior/sessions/${id}`),
  getHeatmap: (params) => request.get('/api/behavior/heatmap', { params }),
}

// 告警相关 API
const alerts = {
  getList: (params) => request.get('/api/alerts', { params }),
  getDetail: (id) => request.get(`/api/alerts/${id}`),
  create: (data) => request.post('/api/alerts', data),
  update: (id, data) => request.put(`/api/alerts/${id}`, data),
  delete: (id) => request.delete(`/api/alerts/${id}`),
  toggle: (id, enabled) => request.put(`/api/alerts/${id}/toggle`, { enabled }),
}

// 项目相关 API
const projects = {
  getList: () => request.get('/api/projects'),
  getDetail: (id) => request.get(`/api/projects/${id}`),
  create: (data) => request.post('/api/projects', data),
  update: (id, data) => request.put(`/api/projects/${id}`, data),
  delete: (id) => request.delete(`/api/projects/${id}`),
  getStats: (id, params) => request.get(`/api/projects/${id}/stats`, { params }),
}

// 仪表盘相关 API
const dashboard = {
  getOverview: (params) => request.get('/api/dashboard/overview', { params }),
  getErrorTrend: (params) => request.get('/api/dashboard/error-trend', { params }),
  getTopErrors: (params) => request.get('/api/dashboard/top-errors', { params }),
  getRecentEvents: (params) => request.get('/api/dashboard/recent-events', { params }),
}

// 上报数据接收 API
const tracker = {
  report: (data) => request.post('/api/tracker', data),
}

// 数据分析 API (UV/PV)
const analytics = {
  getStats: (params) => request.get('/api/analytics/stats', { params }),
  getRealtime: () => request.get('/api/analytics/realtime'),
  getSessions: (params) => request.get('/api/analytics/sessions', { params }),
}

export default {
  issues,
  performance,
  behavior,
  alerts,
  projects,
  dashboard,
  tracker,
  analytics,
}
