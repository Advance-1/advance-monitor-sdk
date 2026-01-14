/**
 * @fileoverview 性能监控插件
 * @description 监控页面加载性能、Web Vitals、长任务、内存等
 */

import { configManager } from '../core/config.js'
import { eventBuilder } from '../core/eventBuilder.js'
import { transport } from '../core/transport.js'

// 性能指标类型
const MetricTypes = {
  NAVIGATION: 'navigation',
  RESOURCE: 'resource',
  PAINT: 'paint',
  WEB_VITALS: 'web_vitals',
  LONG_TASK: 'long_task',
  MEMORY: 'memory',
  FPS: 'fps',
}

/**
 * 性能监控插件
 */
class PerformancePlugin {
  constructor() {
    this._initialized = false
    this._observers = []
    this._metrics = {}
    this._fpsMonitor = null
  }

  /**
   * 初始化插件
   */
  init() {
    if (this._initialized) return
    
    const config = configManager.get()
    if (!config.enablePerformance) return

    // 等待页面加载完成后收集性能数据
    if (document.readyState === 'complete') {
      this._collectNavigationTiming()
    } else {
      window.addEventListener('load', () => {
        // 延迟收集，确保所有资源都加载完成
        setTimeout(() => {
          this._collectNavigationTiming()
        }, 0)
      })
    }

    this._observePaint()
    this._observeWebVitals()
    
    if (config.enableLongTask) {
      this._observeLongTasks()
    }
    
    if (config.enableResource) {
      this._observeResources()
    }
    
    if (config.enableMemory) {
      this._startMemoryMonitor()
    }

    this._initialized = true
  }

  /**
   * 收集导航性能数据
   * @private
   */
  _collectNavigationTiming() {
    if (!window.performance || !window.performance.timing) return

    const timing = window.performance.timing
    const navigationStart = timing.navigationStart

    const metrics = {
      // DNS 查询时间
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      // TCP 连接时间
      tcp: timing.connectEnd - timing.connectStart,
      // SSL 握手时间
      ssl: timing.secureConnectionStart > 0 
        ? timing.connectEnd - timing.secureConnectionStart 
        : 0,
      // TTFB (Time To First Byte)
      ttfb: timing.responseStart - timing.requestStart,
      // 响应时间
      response: timing.responseEnd - timing.responseStart,
      // DOM 解析时间
      domParse: timing.domInteractive - timing.responseEnd,
      // DOM 内容加载时间
      domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
      // 页面完全加载时间
      load: timing.loadEventEnd - navigationStart,
      // 首次渲染时间
      firstPaint: this._getFirstPaint(),
      // 首次内容渲染时间
      firstContentfulPaint: this._getFirstContentfulPaint(),
      // 重定向时间
      redirect: timing.redirectEnd - timing.redirectStart,
      // 卸载时间
      unload: timing.unloadEventEnd - timing.unloadEventStart,
      // 白屏时间
      whiteScreen: timing.domLoading - navigationStart,
    }

    this._metrics.navigation = metrics

    // 发送性能事件
    const event = eventBuilder.buildPerformance(MetricTypes.NAVIGATION, metrics)
    transport.send(event)
  }

  /**
   * 获取首次渲染时间
   * @private
   */
  _getFirstPaint() {
    if (window.performance && window.performance.getEntriesByType) {
      const paintEntries = window.performance.getEntriesByType('paint')
      const fpEntry = paintEntries.find(entry => entry.name === 'first-paint')
      return fpEntry ? Math.round(fpEntry.startTime) : 0
    }
    return 0
  }

  /**
   * 获取首次内容渲染时间
   * @private
   */
  _getFirstContentfulPaint() {
    if (window.performance && window.performance.getEntriesByType) {
      const paintEntries = window.performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      return fcpEntry ? Math.round(fcpEntry.startTime) : 0
    }
    return 0
  }

  /**
   * 观察绘制性能
   * @private
   */
  _observePaint() {
    if (!window.PerformanceObserver) return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const paintMetrics = {}

        entries.forEach(entry => {
          if (entry.name === 'first-paint') {
            paintMetrics.fp = Math.round(entry.startTime)
          }
          if (entry.name === 'first-contentful-paint') {
            paintMetrics.fcp = Math.round(entry.startTime)
          }
        })

        if (Object.keys(paintMetrics).length > 0) {
          this._metrics.paint = paintMetrics
          const event = eventBuilder.buildPerformance(MetricTypes.PAINT, paintMetrics)
          transport.send(event)
        }
      })

      observer.observe({ type: 'paint', buffered: true })
      this._observers.push(observer)
    } catch (e) {
      // 忽略不支持的浏览器
    }
  }

  /**
   * 观察 Web Vitals
   * @private
   */
  _observeWebVitals() {
    this._observeLCP()
    this._observeFID()
    this._observeCLS()
    this._observeINP()
  }

  /**
   * 观察 LCP (Largest Contentful Paint)
   * @private
   */
  _observeLCP() {
    if (!window.PerformanceObserver) return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        
        if (lastEntry) {
          const lcp = Math.round(lastEntry.startTime)
          this._metrics.lcp = lcp
          
          const event = eventBuilder.buildPerformance(MetricTypes.WEB_VITALS, {
            name: 'LCP',
            value: lcp,
            rating: this._getLCPRating(lcp),
            element: lastEntry.element?.tagName,
            url: lastEntry.url,
          })
          transport.send(event)
        }
      })

      observer.observe({ type: 'largest-contentful-paint', buffered: true })
      this._observers.push(observer)
    } catch (e) {
      // 忽略不支持的浏览器
    }
  }

  /**
   * 观察 FID (First Input Delay)
   * @private
   */
  _observeFID() {
    if (!window.PerformanceObserver) return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const firstEntry = entries[0]
        
        if (firstEntry) {
          const fid = Math.round(firstEntry.processingStart - firstEntry.startTime)
          this._metrics.fid = fid
          
          const event = eventBuilder.buildPerformance(MetricTypes.WEB_VITALS, {
            name: 'FID',
            value: fid,
            rating: this._getFIDRating(fid),
            eventType: firstEntry.name,
          })
          transport.send(event)
        }
      })

      observer.observe({ type: 'first-input', buffered: true })
      this._observers.push(observer)
    } catch (e) {
      // 忽略不支持的浏览器
    }
  }

  /**
   * 观察 CLS (Cumulative Layout Shift)
   * @private
   */
  _observeCLS() {
    if (!window.PerformanceObserver) return

    try {
      let clsValue = 0
      let clsEntries = []

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            clsEntries.push({
              value: entry.value,
              sources: entry.sources?.map(s => s.node?.tagName),
            })
          }
        })
      })

      observer.observe({ type: 'layout-shift', buffered: true })
      this._observers.push(observer)

      // 页面隐藏时发送 CLS
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this._metrics.cls = clsValue
          
          const event = eventBuilder.buildPerformance(MetricTypes.WEB_VITALS, {
            name: 'CLS',
            value: clsValue,
            rating: this._getCLSRating(clsValue),
            entries: clsEntries.slice(-5),
          })
          transport.send(event)
        }
      })
    } catch (e) {
      // 忽略不支持的浏览器
    }
  }

  /**
   * 观察 INP (Interaction to Next Paint)
   * @private
   */
  _observeINP() {
    if (!window.PerformanceObserver) return

    try {
      let maxINP = 0
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach(entry => {
          const duration = entry.duration
          if (duration > maxINP) {
            maxINP = duration
          }
        })
      })

      observer.observe({ type: 'event', buffered: true, durationThreshold: 16 })
      this._observers.push(observer)

      // 页面隐藏时发送 INP
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && maxINP > 0) {
          this._metrics.inp = maxINP
          
          const event = eventBuilder.buildPerformance(MetricTypes.WEB_VITALS, {
            name: 'INP',
            value: maxINP,
            rating: this._getINPRating(maxINP),
          })
          transport.send(event)
        }
      })
    } catch (e) {
      // 忽略不支持的浏览器
    }
  }

  /**
   * 观察长任务
   * @private
   */
  _observeLongTasks() {
    if (!window.PerformanceObserver) return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach(entry => {
          const event = eventBuilder.buildPerformance(MetricTypes.LONG_TASK, {
            duration: Math.round(entry.duration),
            startTime: Math.round(entry.startTime),
            attribution: entry.attribution?.map(attr => ({
              name: attr.name,
              containerType: attr.containerType,
              containerSrc: attr.containerSrc,
            })),
          })
          transport.send(event)
        })
      })

      observer.observe({ type: 'longtask', buffered: true })
      this._observers.push(observer)
    } catch (e) {
      // 忽略不支持的浏览器
    }
  }

  /**
   * 观察资源加载
   * @private
   */
  _observeResources() {
    if (!window.PerformanceObserver) return

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach(entry => {
          // 过滤掉监控请求本身
          const config = configManager.get()
          if (entry.name.includes(config.dsn)) return

          const event = eventBuilder.buildResource({
            type: entry.initiatorType,
            url: entry.name,
            duration: Math.round(entry.duration),
            size: entry.transferSize || 0,
            status: entry.responseStatus,
            timing: {
              dns: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
              tcp: Math.round(entry.connectEnd - entry.connectStart),
              ttfb: Math.round(entry.responseStart - entry.requestStart),
              download: Math.round(entry.responseEnd - entry.responseStart),
            },
          })
          transport.send(event)
        })
      })

      observer.observe({ type: 'resource', buffered: true })
      this._observers.push(observer)
    } catch (e) {
      // 忽略不支持的浏览器
    }
  }

  /**
   * 启动内存监控
   * @private
   */
  _startMemoryMonitor() {
    if (!window.performance || !window.performance.memory) return

    // 每 30 秒采集一次内存数据
    const interval = setInterval(() => {
      const memory = window.performance.memory
      
      const event = eventBuilder.buildPerformance(MetricTypes.MEMORY, {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        usageRatio: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2),
      })
      transport.send(event)
    }, 30000)

    this._memoryInterval = interval
  }

  /**
   * 获取 LCP 评级
   * @private
   */
  _getLCPRating(value) {
    if (value <= 2500) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
  }

  /**
   * 获取 FID 评级
   * @private
   */
  _getFIDRating(value) {
    if (value <= 100) return 'good'
    if (value <= 300) return 'needs-improvement'
    return 'poor'
  }

  /**
   * 获取 CLS 评级
   * @private
   */
  _getCLSRating(value) {
    if (value <= 0.1) return 'good'
    if (value <= 0.25) return 'needs-improvement'
    return 'poor'
  }

  /**
   * 获取 INP 评级
   * @private
   */
  _getINPRating(value) {
    if (value <= 200) return 'good'
    if (value <= 500) return 'needs-improvement'
    return 'poor'
  }

  /**
   * 获取当前性能指标
   */
  getMetrics() {
    return { ...this._metrics }
  }

  /**
   * 销毁插件
   */
  destroy() {
    if (!this._initialized) return

    // 断开所有观察者
    this._observers.forEach(observer => {
      observer.disconnect()
    })
    this._observers = []

    // 清除内存监控定时器
    if (this._memoryInterval) {
      clearInterval(this._memoryInterval)
    }

    this._initialized = false
  }
}

// 导出单例
export const performancePlugin = new PerformancePlugin()
