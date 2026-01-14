/**
 * @fileoverview 数据分析插件
 * @description UV/PV 统计、用户识别、会话管理
 */

/**
 * 数据分析插件
 */
export function createAnalyticsPlugin(options = {}) {
  const {
    enablePV = true,              // 启用 PV 统计
    enableUV = true,              // 启用 UV 统计
    enableSession = true,         // 启用会话统计
    sessionTimeout = 30 * 60 * 1000, // 会话超时 30 分钟
    trackSPA = true,              // 追踪 SPA 路由变化
    trackReferrer = true,         // 追踪来源
    trackUTM = true,              // 追踪 UTM 参数
    heartbeatInterval = 30 * 1000, // 心跳间隔 30 秒
  } = options

  let monitor = null
  let sessionId = null
  let sessionStartTime = null
  let lastActivityTime = null
  let pageViewCount = 0
  let heartbeatTimer = null
  let visitorId = null

  // ==================== 访客识别 ====================

  /**
   * 获取或生成访客 ID (UV 标识)
   */
  function getVisitorId() {
    if (visitorId) return visitorId

    const storageKey = '__advance_monitor_visitor_id__'
    
    try {
      visitorId = localStorage.getItem(storageKey)
      
      if (!visitorId) {
        visitorId = generateVisitorId()
        localStorage.setItem(storageKey, visitorId)
      }
    } catch (e) {
      // localStorage 不可用时使用内存
      visitorId = generateVisitorId()
    }

    return visitorId
  }

  /**
   * 生成访客 ID
   * 基于浏览器指纹 + 随机数
   */
  function generateVisitorId() {
    const fingerprint = getBrowserFingerprint()
    const random = Math.random().toString(36).substring(2, 10)
    const timestamp = Date.now().toString(36)
    return `${fingerprint}_${random}_${timestamp}`
  }

  /**
   * 获取简单的浏览器指纹
   */
  function getBrowserFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
    ]
    
    // 简单 hash
    let hash = 0
    const str = components.join('|')
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  // ==================== 会话管理 ====================

  /**
   * 获取或创建会话
   */
  function getOrCreateSession() {
    const storageKey = '__advance_monitor_session__'
    const now = Date.now()

    try {
      const stored = sessionStorage.getItem(storageKey)
      
      if (stored) {
        const session = JSON.parse(stored)
        
        // 检查会话是否过期
        if (now - session.lastActivity < sessionTimeout) {
          sessionId = session.id
          sessionStartTime = session.startTime
          lastActivityTime = now
          pageViewCount = session.pageViewCount || 0
          
          // 更新最后活动时间
          session.lastActivity = now
          sessionStorage.setItem(storageKey, JSON.stringify(session))
          
          return sessionId
        }
      }
    } catch (e) {
      // 忽略存储错误
    }

    // 创建新会话
    return createNewSession()
  }

  /**
   * 创建新会话
   */
  function createNewSession() {
    const storageKey = '__advance_monitor_session__'
    const now = Date.now()

    sessionId = `session_${now.toString(36)}_${Math.random().toString(36).substring(2, 8)}`
    sessionStartTime = now
    lastActivityTime = now
    pageViewCount = 0

    const session = {
      id: sessionId,
      startTime: sessionStartTime,
      lastActivity: now,
      pageViewCount: 0,
    }

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(session))
    } catch (e) {
      // 忽略存储错误
    }

    // 上报新会话开始
    reportSessionStart()

    return sessionId
  }

  /**
   * 更新会话活动
   */
  function updateSessionActivity() {
    const storageKey = '__advance_monitor_session__'
    lastActivityTime = Date.now()

    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        const session = JSON.parse(stored)
        session.lastActivity = lastActivityTime
        session.pageViewCount = pageViewCount
        sessionStorage.setItem(storageKey, JSON.stringify(session))
      }
    } catch (e) {
      // 忽略存储错误
    }
  }

  // ==================== PV/UV 统计 ====================

  /**
   * 记录页面访问 (PV)
   */
  function trackPageView(url = window.location.href) {
    if (!enablePV) return

    pageViewCount++
    updateSessionActivity()

    const pageViewData = {
      type: 'pageview',
      data: {
        url,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        visitorId: getVisitorId(),
        sessionId,
        pageViewCount,
        // 页面性能
        timing: getPageTiming(),
        // UTM 参数
        utm: trackUTM ? getUTMParams() : null,
        // 来源信息
        source: trackReferrer ? getTrafficSource() : null,
      },
      timestamp: Date.now(),
    }

    if (monitor) {
      monitor.captureEvent(pageViewData)
    }
  }

  /**
   * 记录独立访客 (UV)
   * 每天首次访问时上报
   */
  function trackUniqueVisitor() {
    if (!enableUV) return

    const storageKey = '__advance_monitor_uv_date__'
    const today = new Date().toDateString()

    try {
      const lastDate = localStorage.getItem(storageKey)
      
      if (lastDate !== today) {
        localStorage.setItem(storageKey, today)
        
        const uvData = {
          type: 'uv',
          data: {
            visitorId: getVisitorId(),
            date: today,
            isNewVisitor: !lastDate,
            // 设备信息
            device: getDeviceInfo(),
            // 地理位置 (需要后端解析 IP)
            ip: null,
          },
          timestamp: Date.now(),
        }

        if (monitor) {
          monitor.captureEvent(uvData)
        }
      }
    } catch (e) {
      // 忽略存储错误
    }
  }

  // ==================== 辅助函数 ====================

  /**
   * 获取页面加载时间
   */
  function getPageTiming() {
    if (!performance?.timing) return null

    const timing = performance.timing
    return {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      ttfb: timing.responseStart - timing.requestStart,
      download: timing.responseEnd - timing.responseStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      load: timing.loadEventEnd - timing.navigationStart,
    }
  }

  /**
   * 获取 UTM 参数
   */
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search)
    const utm = {}
    
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    utmKeys.forEach(key => {
      const value = params.get(key)
      if (value) {
        utm[key.replace('utm_', '')] = value
      }
    })

    return Object.keys(utm).length > 0 ? utm : null
  }

  /**
   * 获取流量来源
   */
  function getTrafficSource() {
    const referrer = document.referrer
    
    if (!referrer) {
      return { type: 'direct', source: null }
    }

    try {
      const url = new URL(referrer)
      const hostname = url.hostname

      // 搜索引擎
      const searchEngines = {
        'google': /google\./,
        'baidu': /baidu\./,
        'bing': /bing\./,
        'sogou': /sogou\./,
        '360': /so\.com/,
        'yahoo': /yahoo\./,
      }

      for (const [name, pattern] of Object.entries(searchEngines)) {
        if (pattern.test(hostname)) {
          return { type: 'search', source: name, referrer }
        }
      }

      // 社交媒体
      const socialMedia = {
        'weibo': /weibo\./,
        'wechat': /weixin\.|wx\./,
        'zhihu': /zhihu\./,
        'douyin': /douyin\./,
        'xiaohongshu': /xiaohongshu\.|xhslink\./,
        'twitter': /twitter\.|x\.com/,
        'facebook': /facebook\./,
      }

      for (const [name, pattern] of Object.entries(socialMedia)) {
        if (pattern.test(hostname)) {
          return { type: 'social', source: name, referrer }
        }
      }

      // 其他外链
      return { type: 'referral', source: hostname, referrer }
    } catch (e) {
      return { type: 'unknown', source: null, referrer }
    }
  }

  /**
   * 获取设备信息
   */
  function getDeviceInfo() {
    const ua = navigator.userAgent

    return {
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      devicePixelRatio: window.devicePixelRatio,
      touchSupport: 'ontouchstart' in window,
    }
  }

  // ==================== 会话事件 ====================

  /**
   * 上报会话开始
   */
  function reportSessionStart() {
    if (!enableSession) return

    const sessionData = {
      type: 'session_start',
      data: {
        sessionId,
        visitorId: getVisitorId(),
        startTime: sessionStartTime,
        entryPage: window.location.href,
        referrer: document.referrer,
        device: getDeviceInfo(),
        utm: trackUTM ? getUTMParams() : null,
      },
      timestamp: Date.now(),
    }

    if (monitor) {
      monitor.captureEvent(sessionData)
    }
  }

  /**
   * 上报会话结束
   */
  function reportSessionEnd() {
    if (!enableSession || !sessionId) return

    const sessionData = {
      type: 'session_end',
      data: {
        sessionId,
        visitorId: getVisitorId(),
        duration: Date.now() - sessionStartTime,
        pageViewCount,
        exitPage: window.location.href,
      },
      timestamp: Date.now(),
    }

    if (monitor) {
      monitor.captureEvent(sessionData)
    }
  }

  /**
   * 心跳上报 (用于计算停留时间)
   */
  function sendHeartbeat() {
    if (!sessionId) return

    const heartbeatData = {
      type: 'heartbeat',
      data: {
        sessionId,
        visitorId: getVisitorId(),
        currentPage: window.location.href,
        duration: Date.now() - sessionStartTime,
        pageViewCount,
      },
      timestamp: Date.now(),
    }

    if (monitor) {
      monitor.captureEvent(heartbeatData)
    }
  }

  /**
   * 启动心跳
   */
  function startHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
    }

    heartbeatTimer = setInterval(sendHeartbeat, heartbeatInterval)
  }

  /**
   * 停止心跳
   */
  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  // ==================== SPA 路由追踪 ====================

  /**
   * 监听 SPA 路由变化
   */
  function setupSPATracking() {
    if (!trackSPA) return

    // 监听 popstate
    window.addEventListener('popstate', () => {
      trackPageView()
    })

    // 拦截 pushState 和 replaceState
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function (...args) {
      originalPushState.apply(this, args)
      trackPageView()
    }

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args)
      trackPageView()
    }
  }

  return {
    name: 'analytics',

    /**
     * 初始化插件
     */
    init(monitorInstance) {
      monitor = monitorInstance

      // 获取访客 ID
      getVisitorId()

      // 获取或创建会话
      getOrCreateSession()

      // 记录 UV
      trackUniqueVisitor()

      // 记录首次 PV
      trackPageView()

      // 设置 SPA 追踪
      setupSPATracking()

      // 启动心跳
      startHeartbeat()

      // 页面可见性变化
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          stopHeartbeat()
        } else {
          updateSessionActivity()
          startHeartbeat()
        }
      })

      // 页面卸载
      window.addEventListener('beforeunload', () => {
        reportSessionEnd()
      })

      // 用户活动监听
      const activityEvents = ['click', 'scroll', 'keydown', 'mousemove']
      const throttledUpdate = throttle(updateSessionActivity, 5000)
      
      activityEvents.forEach(event => {
        document.addEventListener(event, throttledUpdate, { passive: true })
      })
    },

    /**
     * 手动记录 PV
     */
    trackPageView,

    /**
     * 获取访客 ID
     */
    getVisitorId,

    /**
     * 获取会话 ID
     */
    getSessionId() {
      return sessionId
    },

    /**
     * 获取统计数据
     */
    getStats() {
      return {
        visitorId: getVisitorId(),
        sessionId,
        sessionDuration: sessionStartTime ? Date.now() - sessionStartTime : 0,
        pageViewCount,
      }
    },

    /**
     * 销毁插件
     */
    destroy() {
      stopHeartbeat()
      reportSessionEnd()
      monitor = null
    },
  }
}

/**
 * 节流函数
 */
function throttle(fn, delay) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn.apply(this, args)
    }
  }
}

export default createAnalyticsPlugin
