/**
 * @fileoverview 日志系统后端服务
 * @description Express + JSON 文件存储
 */

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'
import { sourceMapParser } from './sourcemap-parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8080

// 数据存储目录
const DATA_DIR = join(__dirname, 'data')

// 文件上传配置
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.mkdir(join(DATA_DIR, 'events'), { recursive: true })
    await fs.mkdir(join(DATA_DIR, 'issues'), { recursive: true })
    await fs.mkdir(join(DATA_DIR, 'performance'), { recursive: true })
    await fs.mkdir(join(DATA_DIR, 'behavior'), { recursive: true })
    await fs.mkdir(join(DATA_DIR, 'analytics'), { recursive: true })
    await fs.mkdir(join(DATA_DIR, 'sessions'), { recursive: true })
  } catch (error) {
    console.error('Failed to create data directory:', error)
  }
}

// 读取 JSON 文件
async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return defaultValue
  }
}

// 写入 JSON 文件
async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

// 生成 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

// ============================================
// 数据上报接口
// ============================================

// 接收上报数据
app.post('/api/tracker', async (req, res) => {
  try {
    const { events, meta } = req.body
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ code: 1, message: 'Invalid events data' })
    }

    const timestamp = Date.now()
    const dateStr = new Date().toISOString().split('T')[0]

    for (const event of events) {
      // 根据事件类型分类存储
      const eventType = event.type || 'unknown'
      let storePath = join(DATA_DIR, 'events')

      if (eventType === 'error') {
        storePath = join(DATA_DIR, 'issues')
        await processErrorEvent(event)
      } else if (eventType === 'performance') {
        storePath = join(DATA_DIR, 'performance')
      } else if (eventType === 'behavior') {
        storePath = join(DATA_DIR, 'behavior')
      } else if (eventType === 'pageview' || eventType === 'uv') {
        storePath = join(DATA_DIR, 'analytics')
        await processAnalyticsEvent(event)
      } else if (eventType === 'session_start' || eventType === 'session_end' || eventType === 'heartbeat') {
        storePath = join(DATA_DIR, 'sessions')
        await processSessionEvent(event)
      }

      // 存储原始事件
      const eventsFile = join(storePath, `${dateStr}.json`)
      const existingEvents = await readJsonFile(eventsFile, [])
      existingEvents.push({
        ...event,
        _id: generateId(),
        _receivedAt: timestamp,
      })
      await writeJsonFile(eventsFile, existingEvents)
    }

    res.json({ code: 0, message: 'OK' })
  } catch (error) {
    console.error('Failed to process tracker data:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 处理错误事件，聚合为 Issue
async function processErrorEvent(event) {
  const issuesFile = join(DATA_DIR, 'issues.json')
  const issues = await readJsonFile(issuesFile, [])

  // 根据错误信息生成指纹
  const fingerprint = generateFingerprint(event)
  
  // 查找是否已存在相同的 Issue
  let issue = issues.find(i => i.fingerprint === fingerprint)

  if (issue) {
    // 更新已有 Issue
    issue.eventCount++
    issue.lastSeen = Date.now()
    if (event.context?.user?.id && !issue.userIds.includes(event.context.user.id)) {
      issue.userIds.push(event.context.user.id)
      issue.userCount = issue.userIds.length
    }
  } else {
    // 创建新 Issue
    issue = {
      id: generateId(),
      fingerprint,
      title: event.data?.message || 'Unknown Error',
      message: event.data?.message || '',
      type: event.data?.errorType || 'unknown',
      level: event.data?.level || 'error',
      status: 'unresolved',
      filename: event.data?.filename || '',
      stack: event.data?.stack || '',
      eventCount: 1,
      userCount: 1,
      userIds: event.context?.user?.id ? [event.context.user.id] : [],
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      browser: event.context?.browser,
      os: event.context?.os,
      device: event.context?.device,
      tags: event.context?.tags || {},
      breadcrumbs: event.breadcrumbs || [],
      context: {
        url: event.context?.page?.url,
        userAgent: event.context?.browser?.userAgent,
      },
    }
    issues.push(issue)
  }

  await writeJsonFile(issuesFile, issues)
}

// 生成错误指纹
function generateFingerprint(event) {
  const parts = [
    event.data?.errorType || '',
    event.data?.message || '',
    event.data?.filename || '',
    event.data?.lineno || '',
  ]
  return parts.join('|').substring(0, 200)
}

// ============================================
// Analytics 处理
// ============================================

// 处理分析事件 (PV/UV)
async function processAnalyticsEvent(event) {
  const dateStr = new Date().toISOString().split('T')[0]
  const statsFile = join(DATA_DIR, 'analytics', 'stats.json')
  const stats = await readJsonFile(statsFile, {
    daily: {},
    visitors: {},
    pages: {},
    sources: {},
  })

  // 初始化当天数据
  if (!stats.daily[dateStr]) {
    stats.daily[dateStr] = { pv: 0, uv: 0, sessions: 0, avgDuration: 0 }
  }

  const eventType = event.type
  const data = event.data || {}

  if (eventType === 'pageview') {
    // PV 统计
    stats.daily[dateStr].pv++

    // 页面统计
    const path = data.path || '/'
    if (!stats.pages[path]) {
      stats.pages[path] = { pv: 0, avgTime: 0 }
    }
    stats.pages[path].pv++

    // 来源统计
    if (data.source?.type) {
      const sourceType = data.source.type
      if (!stats.sources[sourceType]) {
        stats.sources[sourceType] = 0
      }
      stats.sources[sourceType]++
    }
  } else if (eventType === 'uv') {
    // UV 统计
    const visitorId = data.visitorId
    if (visitorId && !stats.visitors[visitorId]) {
      stats.visitors[visitorId] = {
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        device: data.device,
      }
      stats.daily[dateStr].uv++
    } else if (visitorId) {
      stats.visitors[visitorId].lastSeen = Date.now()
    }
  }

  await writeJsonFile(statsFile, stats)
}

// 处理会话事件
async function processSessionEvent(event) {
  const sessionsFile = join(DATA_DIR, 'sessions', 'active.json')
  const sessions = await readJsonFile(sessionsFile, {})

  const eventType = event.type
  const data = event.data || {}
  const sessionId = data.sessionId

  if (!sessionId) return

  if (eventType === 'session_start') {
    sessions[sessionId] = {
      id: sessionId,
      visitorId: data.visitorId,
      startTime: data.startTime || Date.now(),
      lastActivity: Date.now(),
      entryPage: data.entryPage,
      pageViewCount: 0,
      device: data.device,
      utm: data.utm,
    }
  } else if (eventType === 'heartbeat') {
    if (sessions[sessionId]) {
      sessions[sessionId].lastActivity = Date.now()
      sessions[sessionId].pageViewCount = data.pageViewCount || 0
    }
  } else if (eventType === 'session_end') {
    if (sessions[sessionId]) {
      // 计算会话时长
      const session = sessions[sessionId]
      session.endTime = Date.now()
      session.duration = session.endTime - session.startTime
      session.exitPage = data.exitPage

      // 保存到历史记录
      const dateStr = new Date(session.startTime).toISOString().split('T')[0]
      const historyFile = join(DATA_DIR, 'sessions', `${dateStr}.json`)
      const history = await readJsonFile(historyFile, [])
      history.push(session)
      await writeJsonFile(historyFile, history)

      // 从活跃会话中移除
      delete sessions[sessionId]

      // 更新每日统计
      const statsFile = join(DATA_DIR, 'analytics', 'stats.json')
      const stats = await readJsonFile(statsFile, { daily: {} })
      if (!stats.daily[dateStr]) {
        stats.daily[dateStr] = { pv: 0, uv: 0, sessions: 0, avgDuration: 0 }
      }
      stats.daily[dateStr].sessions++
      await writeJsonFile(statsFile, stats)
    }
  }

  await writeJsonFile(sessionsFile, sessions)
}

// ============================================
// Issues API
// ============================================

// 获取问题列表
app.get('/api/issues', async (req, res) => {
  try {
    const { status, level, type, search, page = 1, pageSize = 20 } = req.query
    let issues = await readJsonFile(join(DATA_DIR, 'issues.json'), [])

    // 筛选
    if (status && status !== 'all') {
      issues = issues.filter(i => i.status === status)
    }
    if (level && level !== 'all') {
      issues = issues.filter(i => i.level === level)
    }
    if (type && type !== 'all') {
      issues = issues.filter(i => i.type === type)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      issues = issues.filter(i => 
        i.title.toLowerCase().includes(searchLower) ||
        i.message.toLowerCase().includes(searchLower)
      )
    }

    // 排序（按最后发生时间倒序）
    issues.sort((a, b) => b.lastSeen - a.lastSeen)

    // 分页
    const total = issues.length
    const start = (page - 1) * pageSize
    const list = issues.slice(start, start + parseInt(pageSize))

    res.json({
      code: 0,
      data: { list, total },
    })
  } catch (error) {
    console.error('Failed to get issues:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取问题详情
app.get('/api/issues/:id', async (req, res) => {
  try {
    const { id } = req.params
    const issues = await readJsonFile(join(DATA_DIR, 'issues.json'), [])
    const issue = issues.find(i => i.id === id)

    if (!issue) {
      return res.status(404).json({ code: 1, message: 'Issue not found' })
    }

    res.json({ code: 0, data: issue })
  } catch (error) {
    console.error('Failed to get issue detail:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 更新问题状态
app.put('/api/issues/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const issues = await readJsonFile(join(DATA_DIR, 'issues.json'), [])
    const issue = issues.find(i => i.id === id)

    if (!issue) {
      return res.status(404).json({ code: 1, message: 'Issue not found' })
    }

    issue.status = status
    await writeJsonFile(join(DATA_DIR, 'issues.json'), issues)

    res.json({ code: 0, message: 'OK' })
  } catch (error) {
    console.error('Failed to update issue status:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 批量更新状态
app.put('/api/issues/batch-status', async (req, res) => {
  try {
    const { ids, status } = req.body
    const issues = await readJsonFile(join(DATA_DIR, 'issues.json'), [])

    issues.forEach(issue => {
      if (ids.includes(issue.id)) {
        issue.status = status
      }
    })

    await writeJsonFile(join(DATA_DIR, 'issues.json'), issues)

    res.json({ code: 0, message: 'OK' })
  } catch (error) {
    console.error('Failed to batch update status:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// ============================================
// Performance API
// ============================================

// 获取性能概览
app.get('/api/performance/overview', async (req, res) => {
  try {
    // 模拟数据
    res.json({
      code: 0,
      data: {
        lcp: { value: 2100, trend: -5, rating: 'good' },
        fid: { value: 80, trend: -10, rating: 'good' },
        cls: { value: 0.08, trend: 2, rating: 'good' },
        ttfb: { value: 450, trend: -8, rating: 'good' },
        fcp: { value: 1200, trend: -3, rating: 'good' },
      },
    })
  } catch (error) {
    console.error('Failed to get performance overview:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取性能图表数据
app.get('/api/performance/chart', async (req, res) => {
  try {
    // 生成模拟数据
    const timestamps = []
    const lcp = []
    const fid = []
    const cls = []

    for (let i = 23; i >= 0; i--) {
      const date = new Date()
      date.setHours(date.getHours() - i)
      timestamps.push(date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
      lcp.push(Math.floor(1800 + Math.random() * 600))
      fid.push(Math.floor(50 + Math.random() * 100))
      cls.push(parseFloat((0.05 + Math.random() * 0.1).toFixed(3)))
    }

    res.json({
      code: 0,
      data: { timestamps, lcp, fid, cls },
    })
  } catch (error) {
    console.error('Failed to get performance chart:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取页面性能指标
app.get('/api/performance/pages', async (req, res) => {
  try {
    // 模拟数据
    res.json({
      code: 0,
      data: [
        { path: '/', lcp: 1800, fid: 60, cls: 0.05, ttfb: 380, views: 12500, lcpRating: 'good', fidRating: 'good', clsRating: 'good', ttfbRating: 'good' },
        { path: '/products', lcp: 2200, fid: 90, cls: 0.12, ttfb: 450, views: 8200, lcpRating: 'good', fidRating: 'good', clsRating: 'needs-improvement', ttfbRating: 'good' },
        { path: '/cart', lcp: 2800, fid: 120, cls: 0.08, ttfb: 520, views: 5600, lcpRating: 'needs-improvement', fidRating: 'needs-improvement', clsRating: 'good', ttfbRating: 'good' },
        { path: '/checkout', lcp: 3200, fid: 150, cls: 0.15, ttfb: 600, views: 3200, lcpRating: 'needs-improvement', fidRating: 'needs-improvement', clsRating: 'needs-improvement', ttfbRating: 'needs-improvement' },
      ],
    })
  } catch (error) {
    console.error('Failed to get page metrics:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// ============================================
// Behavior API
// ============================================

// 获取行为概览
app.get('/api/behavior/overview', async (req, res) => {
  try {
    res.json({
      code: 0,
      data: {
        pv: 125000,
        uv: 32000,
        sessions: 45000,
        avgDuration: 180000,
      },
    })
  } catch (error) {
    console.error('Failed to get behavior overview:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取页面访问数据
app.get('/api/behavior/pageviews', async (req, res) => {
  try {
    res.json({
      code: 0,
      data: [
        { path: '/', title: '首页', pv: 45000, uv: 12000, avgDuration: 45, bounceRate: 35 },
        { path: '/products', title: '商品列表', pv: 32000, uv: 8500, avgDuration: 120, bounceRate: 28 },
        { path: '/product/:id', title: '商品详情', pv: 28000, uv: 7200, avgDuration: 180, bounceRate: 42 },
        { path: '/cart', title: '购物车', pv: 15000, uv: 4800, avgDuration: 90, bounceRate: 25 },
        { path: '/checkout', title: '结算', pv: 8000, uv: 3200, avgDuration: 240, bounceRate: 15 },
      ],
    })
  } catch (error) {
    console.error('Failed to get pageviews:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取用户会话
app.get('/api/behavior/sessions', async (req, res) => {
  try {
    res.json({
      code: 0,
      data: [
        { id: 's1', userId: 'user_123', browser: 'Chrome 120', os: 'Windows 10', device: 'Desktop', pageViews: 12, events: 45, duration: 360000, startTime: Date.now() - 3600000 },
        { id: 's2', userId: 'user_456', browser: 'Safari 17', os: 'macOS 14', device: 'Desktop', pageViews: 8, events: 28, duration: 240000, startTime: Date.now() - 7200000 },
        { id: 's3', userId: null, browser: 'Chrome 120', os: 'Android 14', device: 'Mobile', pageViews: 5, events: 15, duration: 120000, startTime: Date.now() - 10800000 },
      ],
    })
  } catch (error) {
    console.error('Failed to get sessions:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// ============================================
// Dashboard API
// ============================================

// 获取仪表盘概览
app.get('/api/dashboard/overview', async (req, res) => {
  try {
    const issues = await readJsonFile(join(DATA_DIR, 'issues.json'), [])
    const unresolvedCount = issues.filter(i => i.status === 'unresolved').length

    res.json({
      code: 0,
      data: {
        errors: unresolvedCount,
        errorsTrend: -12,
        users: 32000,
        usersTrend: 8,
        sessions: 45000,
        sessionsTrend: 5,
        performanceScore: 85,
        performanceTrend: 3,
      },
    })
  } catch (error) {
    console.error('Failed to get dashboard overview:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取错误趋势
app.get('/api/dashboard/error-trend', async (req, res) => {
  try {
    const timestamps = []
    const values = []

    for (let i = 23; i >= 0; i--) {
      const date = new Date()
      date.setHours(date.getHours() - i)
      timestamps.push(date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
      values.push(Math.floor(Math.random() * 50))
    }

    res.json({
      code: 0,
      data: { timestamps, values },
    })
  } catch (error) {
    console.error('Failed to get error trend:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取热门错误
app.get('/api/dashboard/top-errors', async (req, res) => {
  try {
    const { limit = 5 } = req.query
    const issues = await readJsonFile(join(DATA_DIR, 'issues.json'), [])
    
    const topIssues = issues
      .filter(i => i.status === 'unresolved')
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, parseInt(limit))

    res.json({ code: 0, data: topIssues })
  } catch (error) {
    console.error('Failed to get top errors:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取最近事件
app.get('/api/dashboard/recent-events', async (req, res) => {
  try {
    res.json({
      code: 0,
      data: [
        { path: '/', pv: 45000, uv: 12000, percent: 100 },
        { path: '/products', pv: 32000, uv: 8500, percent: 71 },
        { path: '/product/:id', pv: 28000, uv: 7200, percent: 62 },
        { path: '/cart', pv: 15000, uv: 4800, percent: 33 },
        { path: '/checkout', pv: 8000, uv: 3200, percent: 18 },
      ],
    })
  } catch (error) {
    console.error('Failed to get recent events:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// ============================================
// Alerts API
// ============================================

// 获取告警规则列表
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await readJsonFile(join(DATA_DIR, 'alerts.json'), [])
    res.json({ code: 0, data: alerts })
  } catch (error) {
    console.error('Failed to get alerts:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 创建告警规则
app.post('/api/alerts', async (req, res) => {
  try {
    const alerts = await readJsonFile(join(DATA_DIR, 'alerts.json'), [])
    const newAlert = {
      id: generateId(),
      ...req.body,
      triggerCount: 0,
      lastTriggered: null,
      createdAt: Date.now(),
    }
    alerts.push(newAlert)
    await writeJsonFile(join(DATA_DIR, 'alerts.json'), alerts)
    res.json({ code: 0, data: newAlert })
  } catch (error) {
    console.error('Failed to create alert:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 更新告警规则
app.put('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params
    const alerts = await readJsonFile(join(DATA_DIR, 'alerts.json'), [])
    const index = alerts.findIndex(a => a.id === id)

    if (index === -1) {
      return res.status(404).json({ code: 1, message: 'Alert not found' })
    }

    alerts[index] = { ...alerts[index], ...req.body }
    await writeJsonFile(join(DATA_DIR, 'alerts.json'), alerts)
    res.json({ code: 0, message: 'OK' })
  } catch (error) {
    console.error('Failed to update alert:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 删除告警规则
app.delete('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params
    let alerts = await readJsonFile(join(DATA_DIR, 'alerts.json'), [])
    alerts = alerts.filter(a => a.id !== id)
    await writeJsonFile(join(DATA_DIR, 'alerts.json'), alerts)
    res.json({ code: 0, message: 'OK' })
  } catch (error) {
    console.error('Failed to delete alert:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 切换告警状态
app.put('/api/alerts/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params
    const { enabled } = req.body
    const alerts = await readJsonFile(join(DATA_DIR, 'alerts.json'), [])
    const alert = alerts.find(a => a.id === id)

    if (!alert) {
      return res.status(404).json({ code: 1, message: 'Alert not found' })
    }

    alert.enabled = enabled
    await writeJsonFile(join(DATA_DIR, 'alerts.json'), alerts)
    res.json({ code: 0, message: 'OK' })
  } catch (error) {
    console.error('Failed to toggle alert:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// ============================================
// Projects API
// ============================================

// 获取项目列表
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await readJsonFile(join(DATA_DIR, 'projects.json'), [
      { id: 'proj_default', name: '默认项目', dsn: `http://localhost:${PORT}/api/tracker` },
    ])
    res.json({ code: 0, data: projects })
  } catch (error) {
    console.error('Failed to get projects:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// ============================================
// SourceMap API
// ============================================

// 上传 SourceMap
app.post('/api/sourcemaps', upload.single('sourcemap'), async (req, res) => {
  try {
    const { release, appId, filename } = req.body
    const file = req.file

    if (!release || !appId || !filename || !file) {
      return res.status(400).json({ 
        code: 1, 
        message: 'Missing required fields: release, appId, filename, sourcemap' 
      })
    }

    // 解析 sourcemap 内容
    let sourcemap
    try {
      sourcemap = JSON.parse(file.buffer.toString('utf-8'))
    } catch (e) {
      return res.status(400).json({ code: 1, message: 'Invalid sourcemap JSON' })
    }

    // 保存 sourcemap
    const result = await sourceMapParser.saveSourceMap({
      release,
      appId,
      filename,
      sourcemap,
    })

    res.json({ code: 0, data: result })
  } catch (error) {
    console.error('Failed to upload sourcemap:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取版本列表
app.get('/api/sourcemaps/releases', async (req, res) => {
  try {
    const { appId } = req.query
    
    if (!appId) {
      return res.status(400).json({ code: 1, message: 'appId is required' })
    }

    const releases = await sourceMapParser.getReleases(appId)
    res.json({ code: 0, data: releases })
  } catch (error) {
    console.error('Failed to get releases:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 删除版本的 SourceMap
app.delete('/api/sourcemaps/releases/:release', async (req, res) => {
  try {
    const { release } = req.params
    const { appId } = req.query

    if (!appId) {
      return res.status(400).json({ code: 1, message: 'appId is required' })
    }

    const result = await sourceMapParser.deleteRelease(appId, release)
    res.json({ code: 0, data: result })
  } catch (error) {
    console.error('Failed to delete release:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 解析错误堆栈
app.post('/api/sourcemaps/parse', async (req, res) => {
  try {
    const { appId, release, frames } = req.body

    if (!appId || !release || !frames) {
      return res.status(400).json({ 
        code: 1, 
        message: 'Missing required fields: appId, release, frames' 
      })
    }

    const result = await sourceMapParser.parseStack({ appId, release, frames })
    res.json({ code: 0, data: result })
  } catch (error) {
    console.error('Failed to parse stack:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// ============================================
// Analytics API
// ============================================

// 获取分析统计数据
app.get('/api/analytics/stats', async (req, res) => {
  try {
    const { startDate, endDate, range = '7d' } = req.query
    const statsFile = join(DATA_DIR, 'analytics', 'stats.json')
    const stats = await readJsonFile(statsFile, {
      daily: {},
      visitors: {},
      pages: {},
      sources: {},
    })

    // 计算日期范围
    const end = endDate ? new Date(endDate) : new Date()
    let start
    if (startDate) {
      start = new Date(startDate)
    } else {
      const days = parseInt(range) || 7
      start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
    }

    // 筛选日期范围内的数据
    const dailyStats = []
    let totalPV = 0
    let totalUV = 0
    let totalSessions = 0

    const current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const dayData = stats.daily[dateStr] || { pv: 0, uv: 0, sessions: 0 }
      dailyStats.push({
        date: dateStr,
        ...dayData,
      })
      totalPV += dayData.pv
      totalUV += dayData.uv
      totalSessions += dayData.sessions
      current.setDate(current.getDate() + 1)
    }

    // 页面排行
    const topPages = Object.entries(stats.pages || {})
      .map(([path, data]) => ({ path, ...data }))
      .sort((a, b) => b.pv - a.pv)
      .slice(0, 10)

    // 来源统计
    const sourceStats = Object.entries(stats.sources || {})
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    res.json({
      code: 0,
      data: {
        summary: {
          totalPV,
          totalUV,
          totalSessions,
          avgPVPerDay: dailyStats.length > 0 ? Math.round(totalPV / dailyStats.length) : 0,
          totalVisitors: Object.keys(stats.visitors || {}).length,
        },
        daily: dailyStats,
        topPages,
        sources: sourceStats,
      },
    })
  } catch (error) {
    console.error('Failed to get analytics stats:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取实时在线用户
app.get('/api/analytics/realtime', async (req, res) => {
  try {
    const sessionsFile = join(DATA_DIR, 'sessions', 'active.json')
    const sessions = await readJsonFile(sessionsFile, {})

    // 过滤活跃会话（5分钟内有活动）
    const now = Date.now()
    const activeThreshold = 5 * 60 * 1000
    const activeSessions = Object.values(sessions).filter(
      s => now - s.lastActivity < activeThreshold
    )

    // 按页面分组
    const pageGroups = {}
    activeSessions.forEach(s => {
      const page = s.entryPage || '/'
      if (!pageGroups[page]) {
        pageGroups[page] = 0
      }
      pageGroups[page]++
    })

    res.json({
      code: 0,
      data: {
        activeUsers: activeSessions.length,
        totalSessions: Object.keys(sessions).length,
        pageDistribution: Object.entries(pageGroups)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count),
      },
    })
  } catch (error) {
    console.error('Failed to get realtime data:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 获取会话列表
app.get('/api/analytics/sessions', async (req, res) => {
  try {
    const { date, page = 1, pageSize = 20 } = req.query
    const dateStr = date || new Date().toISOString().split('T')[0]
    const historyFile = join(DATA_DIR, 'sessions', `${dateStr}.json`)
    let sessions = await readJsonFile(historyFile, [])

    // 排序（按开始时间倒序）
    sessions.sort((a, b) => b.startTime - a.startTime)

    // 分页
    const total = sessions.length
    const start = (page - 1) * pageSize
    const list = sessions.slice(start, start + parseInt(pageSize))

    res.json({
      code: 0,
      data: { list, total },
    })
  } catch (error) {
    console.error('Failed to get sessions:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// 解析单个位置
app.post('/api/sourcemaps/parse-position', async (req, res) => {
  try {
    const { appId, release, filename, line, column } = req.body

    if (!appId || !release || !filename || !line) {
      return res.status(400).json({ 
        code: 1, 
        message: 'Missing required fields: appId, release, filename, line' 
      })
    }

    const result = await sourceMapParser.parsePosition({
      appId,
      release,
      filename,
      line: parseInt(line, 10),
      column: parseInt(column || 0, 10),
    })
    res.json({ code: 0, data: result })
  } catch (error) {
    console.error('Failed to parse position:', error)
    res.status(500).json({ code: 1, message: 'Internal server error' })
  }
})

// ============================================
// 启动服务
// ============================================

async function start() {
  await ensureDataDir()
  
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Advance Monitor Log System Server                        ║
║                                                            ║
║   Server running at: http://localhost:${PORT}                ║
║   API endpoint: http://localhost:${PORT}/api                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `)
  })
}

start()
