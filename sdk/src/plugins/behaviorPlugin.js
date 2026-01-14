/**
 * @fileoverview 用户行为监控插件
 * @description 监控用户点击、输入、滚动、路由变化等行为
 */

import { configManager } from '../core/config.js'
import { breadcrumbManager, BreadcrumbTypes } from '../core/breadcrumb.js'
import { eventBuilder } from '../core/eventBuilder.js'
import { transport } from '../core/transport.js'
import { throttle, debounce } from '../utils/helpers.js'

// 行为类型
const BehaviorTypes = {
  CLICK: 'click',
  INPUT: 'input',
  SCROLL: 'scroll',
  ROUTE_CHANGE: 'route_change',
  PAGE_VIEW: 'page_view',
  PAGE_LEAVE: 'page_leave',
  VISIBILITY_CHANGE: 'visibility_change',
  COPY: 'copy',
  CUSTOM: 'custom',
}

/**
 * 用户行为监控插件
 */
class BehaviorPlugin {
  constructor() {
    this._initialized = false
    this._lastUrl = ''
    this._pageViewStartTime = 0
    this._scrollHandler = null
    this._clickHandler = null
    this._inputHandler = null
  }

  /**
   * 初始化插件
   */
  init() {
    if (this._initialized) return
    
    const config = configManager.get()
    if (!config.enableBehavior) return

    this._lastUrl = window.location.href
    this._pageViewStartTime = Date.now()

    this._setupClickMonitor()
    this._setupInputMonitor()
    this._setupScrollMonitor()
    this._setupRouteMonitor()
    this._setupVisibilityMonitor()
    this._setupCopyMonitor()

    // 发送初始页面访问
    this._trackPageView()

    this._initialized = true
  }

  /**
   * 设置点击监控
   * @private
   */
  _setupClickMonitor() {
    this._clickHandler = (event) => {
      const target = event.target
      if (!target) return

      // 获取元素信息
      const elementInfo = this._getElementInfo(target)
      
      // 添加面包屑
      breadcrumbManager.addClick(elementInfo.selector, {
        tagName: elementInfo.tagName,
        text: elementInfo.text,
        className: elementInfo.className,
        id: elementInfo.id,
        path: elementInfo.path,
        position: {
          x: event.clientX,
          y: event.clientY,
        },
      })

      // 构建行为事件
      const behaviorEvent = eventBuilder.buildBehavior(BehaviorTypes.CLICK, {
        element: elementInfo,
        position: {
          x: event.clientX,
          y: event.clientY,
          pageX: event.pageX,
          pageY: event.pageY,
        },
      })

      transport.send(behaviorEvent)
    }

    document.addEventListener('click', this._clickHandler, true)
  }

  /**
   * 设置输入监控
   * @private
   */
  _setupInputMonitor() {
    this._inputHandler = debounce((event) => {
      const target = event.target
      if (!target) return

      // 只监控输入元素
      const inputTags = ['input', 'textarea', 'select']
      if (!inputTags.includes(target.tagName?.toLowerCase())) return

      // 获取元素信息（不记录敏感数据）
      const elementInfo = this._getElementInfo(target)
      
      // 判断是否为敏感字段
      const sensitiveTypes = ['password', 'tel', 'email', 'credit-card']
      const isSensitive = sensitiveTypes.includes(target.type) ||
        /password|phone|mobile|email|card|secret|token/i.test(target.name || target.id || '')

      // 添加面包屑
      breadcrumbManager.add({
        type: BreadcrumbTypes.INPUT,
        category: 'ui',
        message: `Input on ${elementInfo.selector}`,
        data: {
          tagName: elementInfo.tagName,
          type: target.type,
          name: target.name,
          // 不记录敏感数据的值
          value: isSensitive ? '[FILTERED]' : this._truncateValue(target.value),
        },
      })
    }, 500)

    document.addEventListener('input', this._inputHandler, true)
  }

  /**
   * 设置滚动监控
   * @private
   */
  _setupScrollMonitor() {
    let lastScrollTop = 0
    let maxScrollTop = 0

    this._scrollHandler = throttle(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight
      
      // 计算滚动深度
      const scrollDepth = Math.round((scrollTop + clientHeight) / scrollHeight * 100)
      
      // 更新最大滚动位置
      if (scrollTop > maxScrollTop) {
        maxScrollTop = scrollTop
      }

      // 滚动方向
      const direction = scrollTop > lastScrollTop ? 'down' : 'up'
      lastScrollTop = scrollTop

      // 添加面包屑（只在滚动深度达到特定阈值时）
      const depthThresholds = [25, 50, 75, 100]
      depthThresholds.forEach(threshold => {
        if (scrollDepth >= threshold && !this[`_scrollDepth${threshold}Reached`]) {
          this[`_scrollDepth${threshold}Reached`] = true
          
          breadcrumbManager.add({
            type: BreadcrumbTypes.SCROLL,
            category: 'ui',
            message: `Scrolled to ${threshold}%`,
            data: {
              depth: threshold,
              scrollTop,
              direction,
            },
          })
        }
      })
    }, 200)

    window.addEventListener('scroll', this._scrollHandler, { passive: true })

    // 页面离开时发送滚动深度
    window.addEventListener('beforeunload', () => {
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight
      const maxScrollDepth = Math.round((maxScrollTop + clientHeight) / scrollHeight * 100)

      const behaviorEvent = eventBuilder.buildBehavior(BehaviorTypes.SCROLL, {
        maxScrollDepth: Math.min(maxScrollDepth, 100),
        maxScrollTop,
      })
      transport.send(behaviorEvent)
    })
  }

  /**
   * 设置路由监控
   * @private
   */
  _setupRouteMonitor() {
    // 监听 popstate 事件（浏览器前进/后退）
    window.addEventListener('popstate', () => {
      this._handleRouteChange()
    })

    // 重写 pushState 和 replaceState
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = (...args) => {
      originalPushState.apply(history, args)
      this._handleRouteChange()
    }

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args)
      this._handleRouteChange()
    }

    // 监听 hashchange 事件
    window.addEventListener('hashchange', () => {
      this._handleRouteChange()
    })
  }

  /**
   * 处理路由变化
   * @private
   */
  _handleRouteChange() {
    const currentUrl = window.location.href
    
    if (currentUrl === this._lastUrl) return

    // 计算上一页停留时间
    const stayDuration = Date.now() - this._pageViewStartTime

    // 添加导航面包屑
    breadcrumbManager.addNavigation(this._lastUrl, currentUrl, {
      stayDuration,
    })

    // 发送页面离开事件
    const leaveEvent = eventBuilder.buildBehavior(BehaviorTypes.PAGE_LEAVE, {
      url: this._lastUrl,
      stayDuration,
    })
    transport.send(leaveEvent)

    // 更新状态
    this._lastUrl = currentUrl
    this._pageViewStartTime = Date.now()

    // 重置滚动深度标记
    this._scrollDepth25Reached = false
    this._scrollDepth50Reached = false
    this._scrollDepth75Reached = false
    this._scrollDepth100Reached = false

    // 发送新页面访问事件
    this._trackPageView()
  }

  /**
   * 设置可见性监控
   * @private
   */
  _setupVisibilityMonitor() {
    document.addEventListener('visibilitychange', () => {
      const state = document.visibilityState
      
      breadcrumbManager.add({
        type: BreadcrumbTypes.LIFECYCLE,
        category: 'lifecycle',
        message: `Page ${state}`,
        data: {
          state,
        },
      })

      const behaviorEvent = eventBuilder.buildBehavior(BehaviorTypes.VISIBILITY_CHANGE, {
        state,
        timestamp: Date.now(),
      })
      transport.send(behaviorEvent)
    })
  }

  /**
   * 设置复制监控
   * @private
   */
  _setupCopyMonitor() {
    document.addEventListener('copy', (event) => {
      const selection = window.getSelection()
      const text = selection?.toString() || ''
      
      breadcrumbManager.add({
        type: BreadcrumbTypes.CUSTOM,
        category: 'ui',
        message: 'User copied text',
        data: {
          textLength: text.length,
          text: this._truncateValue(text, 100),
        },
      })
    })
  }

  /**
   * 记录页面访问
   * @private
   */
  _trackPageView() {
    const pageViewEvent = eventBuilder.buildBehavior(BehaviorTypes.PAGE_VIEW, {
      url: window.location.href,
      path: window.location.pathname,
      query: window.location.search,
      hash: window.location.hash,
      title: document.title,
      referrer: document.referrer,
    })
    transport.send(pageViewEvent)
  }

  /**
   * 获取元素信息
   * @private
   */
  _getElementInfo(element) {
    const tagName = element.tagName?.toLowerCase() || ''
    const id = element.id || ''
    const className = element.className || ''
    const text = this._getElementText(element)
    
    // 构建选择器
    let selector = tagName
    if (id) {
      selector += `#${id}`
    } else if (className && typeof className === 'string') {
      selector += `.${className.split(' ').filter(Boolean).join('.')}`
    }

    // 获取元素路径
    const path = this._getElementPath(element)

    return {
      tagName,
      id,
      className: typeof className === 'string' ? className : '',
      text,
      selector,
      path,
      href: element.href || '',
      src: element.src || '',
      type: element.type || '',
      name: element.name || '',
      value: element.value ? '[VALUE]' : '',
    }
  }

  /**
   * 获取元素文本
   * @private
   */
  _getElementText(element) {
    // 优先获取特定属性
    const text = element.innerText || 
                 element.textContent || 
                 element.value ||
                 element.alt ||
                 element.title ||
                 element.placeholder ||
                 ''
    
    return this._truncateValue(text.trim(), 50)
  }

  /**
   * 获取元素路径
   * @private
   */
  _getElementPath(element, maxDepth = 5) {
    const path = []
    let current = element
    let depth = 0

    while (current && current !== document.body && depth < maxDepth) {
      let selector = current.tagName?.toLowerCase() || ''
      
      if (current.id) {
        selector += `#${current.id}`
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(Boolean).slice(0, 2)
        if (classes.length) {
          selector += `.${classes.join('.')}`
        }
      }

      path.unshift(selector)
      current = current.parentElement
      depth++
    }

    return path.join(' > ')
  }

  /**
   * 截断值
   * @private
   */
  _truncateValue(value, maxLength = 100) {
    if (!value) return ''
    const str = String(value)
    if (str.length <= maxLength) return str
    return str.slice(0, maxLength) + '...'
  }

  /**
   * 手动记录行为
   * @param {string} action - 行为名称
   * @param {Object} data - 行为数据
   */
  track(action, data = {}) {
    const behaviorEvent = eventBuilder.buildBehavior(action, data)
    transport.send(behaviorEvent)
  }

  /**
   * 销毁插件
   */
  destroy() {
    if (!this._initialized) return

    if (this._clickHandler) {
      document.removeEventListener('click', this._clickHandler, true)
    }

    if (this._inputHandler) {
      document.removeEventListener('input', this._inputHandler, true)
    }

    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler)
    }

    this._initialized = false
  }
}

// 导出单例
export const behaviorPlugin = new BehaviorPlugin()
