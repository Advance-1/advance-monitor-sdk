/**
 * @fileoverview 会话回放插件
 * @description 记录用户操作，支持错误发生时的会话回放
 */

/**
 * 会话回放插件
 * 简化版实现，记录关键用户操作用于错误复现
 */
export function createSessionReplayPlugin(options = {}) {
  const {
    maxEvents = 100,           // 最大事件数
    recordMouse = true,        // 记录鼠标移动
    recordScroll = true,       // 记录滚动
    recordInput = true,        // 记录输入
    recordClick = true,        // 记录点击
    recordNavigation = true,   // 记录路由变化
    mouseMoveThrottle = 100,   // 鼠标移动节流 (ms)
    scrollThrottle = 200,      // 滚动节流 (ms)
  } = options

  let monitor = null
  let events = []
  let startTime = Date.now()
  let lastMouseMove = 0
  let lastScroll = 0

  // 事件类型
  const EventType = {
    MOUSE_MOVE: 'mouse_move',
    MOUSE_CLICK: 'mouse_click',
    SCROLL: 'scroll',
    INPUT: 'input',
    NAVIGATION: 'navigation',
    RESIZE: 'resize',
    VISIBILITY: 'visibility',
    DOM_MUTATION: 'dom_mutation',
  }

  /**
   * 添加事件
   */
  function addEvent(type, data) {
    const event = {
      type,
      timestamp: Date.now() - startTime,
      data,
    }

    events.push(event)

    // 限制事件数量
    if (events.length > maxEvents) {
      events.shift()
    }
  }

  /**
   * 获取元素选择器
   */
  function getSelector(element) {
    if (!element || element === document.body) return 'body'
    if (!element.tagName) return ''

    const parts = []
    let current = element

    while (current && current !== document.body && parts.length < 5) {
      let selector = current.tagName.toLowerCase()

      if (current.id) {
        selector += `#${current.id}`
        parts.unshift(selector)
        break
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).slice(0, 2)
        if (classes.length > 0 && classes[0]) {
          selector += `.${classes.join('.')}`
        }
      }

      // 添加索引
      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName)
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1
          selector += `:nth-child(${index})`
        }
      }

      parts.unshift(selector)
      current = current.parentElement
    }

    return parts.join(' > ')
  }

  /**
   * 处理鼠标移动
   */
  function handleMouseMove(e) {
    if (!recordMouse) return

    const now = Date.now()
    if (now - lastMouseMove < mouseMoveThrottle) return
    lastMouseMove = now

    addEvent(EventType.MOUSE_MOVE, {
      x: e.clientX,
      y: e.clientY,
    })
  }

  /**
   * 处理点击
   */
  function handleClick(e) {
    if (!recordClick) return

    const target = e.target
    addEvent(EventType.MOUSE_CLICK, {
      x: e.clientX,
      y: e.clientY,
      selector: getSelector(target),
      tagName: target.tagName?.toLowerCase(),
      text: target.textContent?.substring(0, 50),
    })
  }

  /**
   * 处理滚动
   */
  function handleScroll() {
    if (!recordScroll) return

    const now = Date.now()
    if (now - lastScroll < scrollThrottle) return
    lastScroll = now

    addEvent(EventType.SCROLL, {
      x: window.scrollX,
      y: window.scrollY,
    })
  }

  /**
   * 处理输入
   */
  function handleInput(e) {
    if (!recordInput) return

    const target = e.target
    const tagName = target.tagName?.toLowerCase()

    // 只记录表单元素
    if (!['input', 'textarea', 'select'].includes(tagName)) return

    // 不记录密码等敏感字段
    const sensitiveTypes = ['password', 'credit-card', 'cvv']
    if (sensitiveTypes.includes(target.type) || target.name?.toLowerCase().includes('password')) {
      addEvent(EventType.INPUT, {
        selector: getSelector(target),
        tagName,
        type: target.type,
        value: '[REDACTED]',
      })
      return
    }

    addEvent(EventType.INPUT, {
      selector: getSelector(target),
      tagName,
      type: target.type,
      value: target.value?.substring(0, 100),
    })
  }

  /**
   * 处理路由变化
   */
  function handleNavigation() {
    if (!recordNavigation) return

    addEvent(EventType.NAVIGATION, {
      url: window.location.href,
      title: document.title,
    })
  }

  /**
   * 处理窗口大小变化
   */
  function handleResize() {
    addEvent(EventType.RESIZE, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
  }

  /**
   * 处理页面可见性变化
   */
  function handleVisibility() {
    addEvent(EventType.VISIBILITY, {
      hidden: document.hidden,
    })
  }

  return {
    name: 'sessionReplay',

    /**
     * 初始化插件
     */
    init(monitorInstance) {
      monitor = monitorInstance
      startTime = Date.now()

      // 记录初始状态
      addEvent(EventType.NAVIGATION, {
        url: window.location.href,
        title: document.title,
      })

      addEvent(EventType.RESIZE, {
        width: window.innerWidth,
        height: window.innerHeight,
      })

      // 绑定事件
      if (recordMouse) {
        document.addEventListener('mousemove', handleMouseMove, { passive: true })
      }
      if (recordClick) {
        document.addEventListener('click', handleClick, { capture: true })
      }
      if (recordScroll) {
        window.addEventListener('scroll', handleScroll, { passive: true })
      }
      if (recordInput) {
        document.addEventListener('input', handleInput, { capture: true })
      }

      window.addEventListener('resize', handleResize)
      document.addEventListener('visibilitychange', handleVisibility)

      // 监听路由变化
      if (recordNavigation) {
        window.addEventListener('popstate', handleNavigation)
        
        // 拦截 pushState 和 replaceState
        const originalPushState = history.pushState
        const originalReplaceState = history.replaceState

        history.pushState = function (...args) {
          originalPushState.apply(this, args)
          handleNavigation()
        }

        history.replaceState = function (...args) {
          originalReplaceState.apply(this, args)
          handleNavigation()
        }
      }
    },

    /**
     * 获取会话回放数据
     * @returns {Array} 事件列表
     */
    getEvents() {
      return [...events]
    },

    /**
     * 获取最近 N 个事件
     * @param {number} count - 事件数量
     */
    getRecentEvents(count = 50) {
      return events.slice(-count)
    },

    /**
     * 清空事件
     */
    clearEvents() {
      events = []
      startTime = Date.now()
    },

    /**
     * 导出回放数据
     */
    exportReplay() {
      return {
        startTime,
        duration: Date.now() - startTime,
        events: [...events],
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        url: window.location.href,
        userAgent: navigator.userAgent,
      }
    },

    /**
     * 在错误发生时附加回放数据
     */
    attachToError(errorEvent) {
      return {
        ...errorEvent,
        replay: {
          events: this.getRecentEvents(30),
          duration: Date.now() - startTime,
        },
      }
    },

    /**
     * 销毁插件
     */
    destroy() {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('input', handleInput)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('popstate', handleNavigation)

      events = []
      monitor = null
    },
  }
}

export default createSessionReplayPlugin
