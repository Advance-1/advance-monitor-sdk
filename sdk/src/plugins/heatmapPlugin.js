/**
 * @fileoverview 热力图插件
 * @description 记录用户点击行为，生成页面热力图数据
 */

/**
 * 热力图插件
 */
export function createHeatmapPlugin(options = {}) {
  const {
    sampleRate = 1,           // 采样率
    throttleMs = 100,         // 节流时间
    maxPoints = 1000,         // 最大点数
    trackMove = false,        // 是否追踪鼠标移动
    trackScroll = true,       // 是否追踪滚动
    ignoreSelectors = [],     // 忽略的选择器
  } = options

  let monitor = null
  let points = []
  let lastTime = 0
  let scrollDepth = 0
  let maxScrollDepth = 0

  /**
   * 获取元素的选择器路径
   */
  function getElementPath(element) {
    const path = []
    let current = element

    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase()

      if (current.id) {
        selector += `#${current.id}`
        path.unshift(selector)
        break
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).slice(0, 2).filter(Boolean)
        if (classes.length) {
          selector += `.${classes.join('.')}`
        }
      }

      path.unshift(selector)
      current = current.parentElement
    }

    return path.join(' > ')
  }

  /**
   * 检查是否应该忽略该元素
   */
  function shouldIgnore(element) {
    for (const selector of ignoreSelectors) {
      if (element.matches(selector)) {
        return true
      }
    }
    return false
  }

  /**
   * 处理点击事件
   */
  function handleClick(event) {
    // 采样
    if (Math.random() > sampleRate) return

    const target = event.target
    if (shouldIgnore(target)) return

    // 节流
    const now = Date.now()
    if (now - lastTime < throttleMs) return
    lastTime = now

    const point = {
      type: 'click',
      x: event.pageX,
      y: event.pageY,
      viewportX: event.clientX,
      viewportY: event.clientY,
      timestamp: now,
      path: getElementPath(target),
      tagName: target.tagName.toLowerCase(),
      text: target.textContent?.substring(0, 50),
      href: target.href || target.closest('a')?.href,
    }

    addPoint(point)
  }

  /**
   * 处理鼠标移动
   */
  function handleMouseMove(event) {
    if (!trackMove) return
    if (Math.random() > sampleRate * 0.1) return // 移动事件采样率更低

    const now = Date.now()
    if (now - lastTime < throttleMs * 2) return
    lastTime = now

    const point = {
      type: 'move',
      x: event.pageX,
      y: event.pageY,
      viewportX: event.clientX,
      viewportY: event.clientY,
      timestamp: now,
    }

    addPoint(point)
  }

  /**
   * 处理滚动
   */
  function handleScroll() {
    if (!trackScroll) return

    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = document.documentElement.clientHeight

    scrollDepth = Math.round((scrollTop + clientHeight) / scrollHeight * 100)
    maxScrollDepth = Math.max(maxScrollDepth, scrollDepth)
  }

  /**
   * 添加点
   */
  function addPoint(point) {
    points.push(point)

    // 限制点数
    if (points.length > maxPoints) {
      points.shift()
    }
  }

  /**
   * 获取页面区域统计
   */
  function getZoneStats(gridSize = 10) {
    const zones = {}
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    points.forEach(point => {
      if (point.type !== 'click') return

      const zoneX = Math.floor(point.viewportX / viewportWidth * gridSize)
      const zoneY = Math.floor(point.viewportY / viewportHeight * gridSize)
      const zoneKey = `${zoneX},${zoneY}`

      if (!zones[zoneKey]) {
        zones[zoneKey] = { x: zoneX, y: zoneY, count: 0 }
      }
      zones[zoneKey].count++
    })

    return Object.values(zones)
  }

  /**
   * 获取元素点击统计
   */
  function getElementStats() {
    const elements = {}

    points.forEach(point => {
      if (point.type !== 'click' || !point.path) return

      if (!elements[point.path]) {
        elements[point.path] = {
          path: point.path,
          tagName: point.tagName,
          text: point.text,
          href: point.href,
          count: 0,
        }
      }
      elements[point.path].count++
    })

    return Object.values(elements).sort((a, b) => b.count - a.count)
  }

  return {
    name: 'heatmap',

    /**
     * 初始化插件
     */
    init(monitorInstance) {
      monitor = monitorInstance

      document.addEventListener('click', handleClick, { capture: true })
      
      if (trackMove) {
        document.addEventListener('mousemove', handleMouseMove, { passive: true })
      }
      
      if (trackScroll) {
        window.addEventListener('scroll', handleScroll, { passive: true })
      }

      // 页面卸载时上报
      window.addEventListener('beforeunload', () => {
        this.flush()
      })
    },

    /**
     * 获取热力图数据
     */
    getData() {
      return {
        points: [...points],
        zoneStats: getZoneStats(),
        elementStats: getElementStats(),
        scrollDepth: {
          current: scrollDepth,
          max: maxScrollDepth,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        page: {
          url: window.location.href,
          title: document.title,
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        },
      }
    },

    /**
     * 上报数据
     */
    flush() {
      if (points.length === 0) return

      const data = this.getData()

      if (monitor) {
        monitor.captureEvent({
          type: 'heatmap',
          data,
          timestamp: Date.now(),
        })
      }

      // 清空点数据
      points = []
    },

    /**
     * 清空数据
     */
    clear() {
      points = []
      scrollDepth = 0
      maxScrollDepth = 0
    },

    /**
     * 销毁插件
     */
    destroy() {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
      points = []
      monitor = null
    },
  }
}

export default createHeatmapPlugin
