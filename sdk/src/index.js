/**
 * @fileoverview Advance Monitor SDK 主入口
 * @description 企业级前端监控 SDK，支持错误监控、性能监控、用户行为监控等
 * @version 1.0.0
 */

import { configManager, contextManager, breadcrumbManager, transport, eventBuilder, ErrorTypes, ErrorLevels } from './core/index.js'
import { errorPlugin, performancePlugin, behaviorPlugin, networkPlugin, frameworkPlugin } from './plugins/index.js'

// SDK 版本
const SDK_VERSION = '1.0.0'

/**
 * Advance Monitor SDK 主类
 */
class AdvanceMonitor {
  constructor() {
    this._initialized = false
    this._plugins = []
  }

  /**
   * 初始化 SDK
   * @param {Object} options - 配置选项
   * @returns {AdvanceMonitor} SDK 实例
   */
  init(options = {}) {
    if (this._initialized) {
      console.warn('[AdvanceMonitor] SDK already initialized')
      return this
    }

    try {
      // 初始化配置
      configManager.init(options)
      
      // 初始化上下文
      contextManager.init(configManager.get())
      
      // 初始化面包屑
      breadcrumbManager.init(configManager.get())
      
      // 初始化传输器
      transport.init(configManager.get())

      // 初始化插件
      this._initPlugins()

      this._initialized = true

      // 发送初始化事件
      const initEvent = eventBuilder.buildLifecycle('init', {
        sdkVersion: SDK_VERSION,
        config: this._getSafeConfig(),
      })
      transport.send(initEvent)

      if (!configManager.get('silent')) {
        console.log(`[AdvanceMonitor] SDK initialized (v${SDK_VERSION})`)
      }
    } catch (error) {
      console.error('[AdvanceMonitor] Failed to initialize:', error)
      throw error
    }

    return this
  }

  /**
   * 初始化插件
   * @private
   */
  _initPlugins() {
    const plugins = [
      errorPlugin,
      performancePlugin,
      behaviorPlugin,
      networkPlugin,
      frameworkPlugin,
    ]

    plugins.forEach(plugin => {
      try {
        plugin.init()
        this._plugins.push(plugin)
      } catch (error) {
        console.warn('[AdvanceMonitor] Failed to init plugin:', error)
      }
    })
  }

  /**
   * 获取安全的配置（移除敏感信息）
   * @private
   */
  _getSafeConfig() {
    const config = configManager.get()
    return {
      appId: config.appId,
      appVersion: config.appVersion,
      environment: config.environment,
      enableError: config.enableError,
      enablePerformance: config.enablePerformance,
      enableBehavior: config.enableBehavior,
      enableNetwork: config.enableNetwork,
    }
  }

  /**
   * 设置用户信息
   * @param {Object} user - 用户信息
   * @returns {AdvanceMonitor} SDK 实例
   */
  setUser(user) {
    if (!this._initialized) {
      console.warn('[AdvanceMonitor] SDK not initialized')
      return this
    }

    contextManager.setUser(user)
    configManager.set('userId', user.id || user.userId)
    configManager.set('userInfo', user)

    // 发送用户识别事件
    const userEvent = eventBuilder.buildLifecycle('user_identify', { user })
    transport.send(userEvent)

    return this
  }

  /**
   * 设置自定义标签
   * @param {string|Object} key - 标签键名或标签对象
   * @param {*} value - 标签值
   * @returns {AdvanceMonitor} SDK 实例
   */
  setTag(key, value) {
    if (!this._initialized) {
      console.warn('[AdvanceMonitor] SDK not initialized')
      return this
    }

    contextManager.setTag(key, value)
    return this
  }

  /**
   * 设置扩展数据
   * @param {string|Object} key - 扩展键名或扩展对象
   * @param {*} value - 扩展值
   * @returns {AdvanceMonitor} SDK 实例
   */
  setExtra(key, value) {
    if (!this._initialized) {
      console.warn('[AdvanceMonitor] SDK not initialized')
      return this
    }

    contextManager.setExtra(key, value)
    return this
  }

  /**
   * 手动捕获错误
   * @param {Error|string} error - 错误对象或错误信息
   * @param {Object} options - 额外选项
   * @returns {AdvanceMonitor} SDK 实例
   */
  captureError(error, options = {}) {
    if (!this._initialized) {
      console.warn('[AdvanceMonitor] SDK not initialized')
      return this
    }

    errorPlugin.captureError(error, options)
    return this
  }

  /**
   * 手动捕获消息
   * @param {string} message - 消息内容
   * @param {Object} options - 额外选项
   * @returns {AdvanceMonitor} SDK 实例
   */
  captureMessage(message, options = {}) {
    if (!this._initialized) {
      console.warn('[AdvanceMonitor] SDK not initialized')
      return this
    }

    errorPlugin.captureMessage(message, options)
    return this
  }

  /**
   * 手动记录事件
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   * @returns {AdvanceMonitor} SDK 实例
   */
  track(eventName, data = {}) {
    if (!this._initialized) {
      console.warn('[AdvanceMonitor] SDK not initialized')
      return this
    }

    const event = eventBuilder.buildCustom(eventName, data)
    transport.send(event)
    return this
  }

  /**
   * 添加面包屑
   * @param {Object} breadcrumb - 面包屑数据
   * @returns {AdvanceMonitor} SDK 实例
   */
  addBreadcrumb(breadcrumb) {
    if (!this._initialized) {
      console.warn('[AdvanceMonitor] SDK not initialized')
      return this
    }

    breadcrumbManager.add(breadcrumb)
    return this
  }

  /**
   * 集成 Vue 2.x
   * @param {Object} Vue - Vue 构造函数
   * @returns {AdvanceMonitor} SDK 实例
   */
  setupVue2(Vue) {
    frameworkPlugin.setupVue2(Vue)
    return this
  }

  /**
   * 集成 Vue 3.x
   * @param {Object} app - Vue 应用实例
   * @returns {AdvanceMonitor} SDK 实例
   */
  setupVue3(app) {
    frameworkPlugin.setupVue3(app)
    return this
  }

  /**
   * 捕获 React 错误（在 ErrorBoundary 中调用）
   * @param {Error} error - 错误对象
   * @param {Object} errorInfo - React 错误信息
   * @returns {AdvanceMonitor} SDK 实例
   */
  captureReactError(error, errorInfo) {
    frameworkPlugin.captureReactError(error, errorInfo)
    return this
  }

  /**
   * 创建 React ErrorBoundary 组件
   * @param {Object} React - React 模块
   * @returns {Class} ErrorBoundary 组件
   */
  createReactErrorBoundary(React) {
    return frameworkPlugin.createReactErrorBoundary(React)
  }

  /**
   * 获取当前配置
   * @returns {Object} 配置对象
   */
  getConfig() {
    return configManager.get()
  }

  /**
   * 更新配置
   * @param {Object} options - 配置选项
   * @returns {AdvanceMonitor} SDK 实例
   */
  setConfig(options) {
    configManager.set(options)
    return this
  }

  /**
   * 获取性能指标
   * @returns {Object} 性能指标
   */
  getPerformanceMetrics() {
    return performancePlugin.getMetrics()
  }

  /**
   * 获取面包屑
   * @returns {Array} 面包屑数组
   */
  getBreadcrumbs() {
    return breadcrumbManager.getAll()
  }

  /**
   * 获取会话 ID
   * @returns {string} 会话 ID
   */
  getSessionId() {
    return contextManager.getSessionId()
  }

  /**
   * 立即发送队列中的数据
   * @returns {Promise}
   */
  flush() {
    return transport.flush()
  }

  /**
   * 销毁 SDK
   */
  destroy() {
    if (!this._initialized) return

    // 发送销毁事件
    const destroyEvent = eventBuilder.buildLifecycle('destroy', {
      sessionDuration: Date.now() - contextManager.getPageLoadTime(),
    })
    transport.send(destroyEvent)

    // 立即发送所有数据
    transport.flush()

    // 销毁所有插件
    this._plugins.forEach(plugin => {
      try {
        plugin.destroy()
      } catch (error) {
        // 忽略销毁错误
      }
    })
    this._plugins = []

    // 销毁传输器
    transport.destroy()

    // 重置状态
    configManager.reset()
    contextManager.reset()
    breadcrumbManager.clear()

    this._initialized = false

    console.log('[AdvanceMonitor] SDK destroyed')
  }

  /**
   * 检查是否已初始化
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized
  }

  /**
   * 获取 SDK 版本
   * @returns {string}
   */
  getVersion() {
    return SDK_VERSION
  }
}

// 创建单例
const monitor = new AdvanceMonitor()

// 导出
export default monitor

// 命名导出
export {
  monitor as AdvanceMonitor,
  ErrorTypes,
  ErrorLevels,
  SDK_VERSION,
}
