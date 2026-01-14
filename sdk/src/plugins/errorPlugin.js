/**
 * @fileoverview 错误监控插件
 * @description 捕获 JS 运行时错误、Promise 错误、资源加载错误等
 */

import { configManager } from '../core/config.js'
import { breadcrumbManager, BreadcrumbTypes, BreadcrumbLevels } from '../core/breadcrumb.js'
import { eventBuilder, ErrorTypes, ErrorLevels } from '../core/eventBuilder.js'
import { transport } from '../core/transport.js'

/**
 * 错误监控插件
 */
class ErrorPlugin {
  constructor() {
    this._initialized = false
    this._originalOnError = null
    this._originalOnUnhandledRejection = null
    this._originalConsoleError = null
  }

  /**
   * 初始化插件
   */
  init() {
    if (this._initialized) return
    
    const config = configManager.get()
    if (!config.enableError) return

    this._setupGlobalErrorHandler()
    this._setupUnhandledRejectionHandler()
    this._setupResourceErrorHandler()
    this._setupConsoleErrorHandler()
    
    this._initialized = true
  }

  /**
   * 设置全局错误处理器
   * @private
   */
  _setupGlobalErrorHandler() {
    this._originalOnError = window.onerror

    window.onerror = (message, source, lineno, colno, error) => {
      this._handleError({
        type: ErrorTypes.JS_ERROR,
        message,
        source,
        lineno,
        colno,
        error,
      })

      // 调用原始处理器
      if (this._originalOnError) {
        return this._originalOnError.call(window, message, source, lineno, colno, error)
      }
      return false
    }

    // 使用 addEventListener 捕获更多错误
    window.addEventListener('error', (event) => {
      // 资源加载错误由 _setupResourceErrorHandler 处理
      if (event.target !== window) return

      this._handleError({
        type: ErrorTypes.JS_ERROR,
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      })
    }, true)
  }

  /**
   * 设置未处理 Promise 错误处理器
   * @private
   */
  _setupUnhandledRejectionHandler() {
    this._originalOnUnhandledRejection = window.onunhandledrejection

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      
      let error
      let message
      
      if (reason instanceof Error) {
        error = reason
        message = reason.message
      } else if (typeof reason === 'string') {
        message = reason
        error = new Error(reason)
      } else {
        message = 'Unhandled Promise rejection'
        error = new Error(message)
        try {
          error.reason = JSON.stringify(reason)
        } catch (e) {
          error.reason = String(reason)
        }
      }

      this._handleError({
        type: ErrorTypes.PROMISE_ERROR,
        message,
        error,
        extra: {
          reason: reason,
          promiseRejectionEvent: true,
        },
      })
    })
  }

  /**
   * 设置资源加载错误处理器
   * @private
   */
  _setupResourceErrorHandler() {
    window.addEventListener('error', (event) => {
      const target = event.target

      // 只处理资源加载错误
      if (target === window) return
      if (!(target instanceof HTMLElement)) return

      const tagName = target.tagName?.toLowerCase()
      const resourceTags = ['script', 'link', 'img', 'video', 'audio', 'source', 'iframe']
      
      if (!resourceTags.includes(tagName)) return

      const resourceUrl = target.src || target.href || ''
      
      this._handleError({
        type: ErrorTypes.RESOURCE_ERROR,
        message: `Failed to load ${tagName}: ${resourceUrl}`,
        error: new Error(`Resource load failed: ${resourceUrl}`),
        extra: {
          tagName,
          resourceUrl,
          outerHTML: target.outerHTML?.slice(0, 200),
        },
        level: ErrorLevels.WARNING,
      })
    }, true)
  }

  /**
   * 设置 console.error 处理器
   * @private
   */
  _setupConsoleErrorHandler() {
    this._originalConsoleError = console.error

    console.error = (...args) => {
      // 添加面包屑
      breadcrumbManager.addConsole('error', args.map(arg => String(arg)).join(' '))

      // 调用原始方法
      this._originalConsoleError.apply(console, args)
    }
  }

  /**
   * 处理错误
   * @private
   */
  _handleError(errorInfo) {
    const config = configManager.get()

    // 检查是否应该忽略
    if (this._shouldIgnore(errorInfo)) {
      return
    }

    // 添加错误面包屑
    breadcrumbManager.add({
      type: BreadcrumbTypes.ERROR,
      category: 'error',
      level: BreadcrumbLevels.ERROR,
      message: errorInfo.message,
      data: {
        type: errorInfo.type,
        source: errorInfo.source,
        lineno: errorInfo.lineno,
        colno: errorInfo.colno,
      },
    })

    // 构建错误事件
    const event = eventBuilder.buildError(errorInfo.error || new Error(errorInfo.message), {
      errorType: errorInfo.type,
      level: errorInfo.level || ErrorLevels.ERROR,
      filename: errorInfo.source,
      lineno: errorInfo.lineno,
      colno: errorInfo.colno,
      mechanism: this._getMechanism(errorInfo.type),
      extra: errorInfo.extra,
    })

    // 发送错误
    transport.send(event)

    // 触发错误回调
    if (config.onError) {
      try {
        config.onError(event)
      } catch (e) {
        // 忽略回调错误
      }
    }
  }

  /**
   * 检查是否应该忽略错误
   * @private
   */
  _shouldIgnore(errorInfo) {
    const config = configManager.get()
    const message = errorInfo.message || ''
    const source = errorInfo.source || ''

    // 检查忽略的错误信息
    if (config.ignoreErrors && config.ignoreErrors.length > 0) {
      for (const pattern of config.ignoreErrors) {
        if (pattern instanceof RegExp && pattern.test(message)) {
          return true
        }
        if (typeof pattern === 'string' && message.includes(pattern)) {
          return true
        }
      }
    }

    // 检查忽略的 URL
    if (config.ignoreUrls && config.ignoreUrls.length > 0) {
      for (const pattern of config.ignoreUrls) {
        if (pattern instanceof RegExp && pattern.test(source)) {
          return true
        }
        if (typeof pattern === 'string' && source.includes(pattern)) {
          return true
        }
      }
    }

    // 检查拒绝的 URL
    if (config.denyUrls && config.denyUrls.length > 0) {
      for (const pattern of config.denyUrls) {
        if (pattern instanceof RegExp && pattern.test(source)) {
          return true
        }
        if (typeof pattern === 'string' && source.includes(pattern)) {
          return true
        }
      }
    }

    // 检查允许的 URL（如果配置了，则只允许匹配的）
    if (config.allowUrls && config.allowUrls.length > 0) {
      let allowed = false
      for (const pattern of config.allowUrls) {
        if (pattern instanceof RegExp && pattern.test(source)) {
          allowed = true
          break
        }
        if (typeof pattern === 'string' && source.includes(pattern)) {
          allowed = true
          break
        }
      }
      if (!allowed) {
        return true
      }
    }

    // 忽略跨域脚本错误（Script error.）
    if (message === 'Script error.' && !source) {
      return true
    }

    return false
  }

  /**
   * 获取错误机制
   * @private
   */
  _getMechanism(type) {
    const mechanisms = {
      [ErrorTypes.JS_ERROR]: 'onerror',
      [ErrorTypes.PROMISE_ERROR]: 'onunhandledrejection',
      [ErrorTypes.RESOURCE_ERROR]: 'onerror',
      [ErrorTypes.CONSOLE_ERROR]: 'console.error',
    }
    return mechanisms[type] || 'unknown'
  }

  /**
   * 手动捕获错误
   * @param {Error|string} error - 错误对象或错误信息
   * @param {Object} options - 额外选项
   */
  captureError(error, options = {}) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    
    this._handleError({
      type: options.type || ErrorTypes.CUSTOM_ERROR,
      message: errorObj.message,
      error: errorObj,
      extra: options.extra,
      level: options.level || ErrorLevels.ERROR,
    })
  }

  /**
   * 手动捕获消息
   * @param {string} message - 消息
   * @param {Object} options - 额外选项
   */
  captureMessage(message, options = {}) {
    const event = eventBuilder.buildError(new Error(message), {
      errorType: ErrorTypes.CUSTOM_ERROR,
      level: options.level || ErrorLevels.INFO,
      extra: options.extra,
    })

    transport.send(event)
  }

  /**
   * 销毁插件
   */
  destroy() {
    if (!this._initialized) return

    // 恢复原始处理器
    if (this._originalOnError) {
      window.onerror = this._originalOnError
    }

    if (this._originalConsoleError) {
      console.error = this._originalConsoleError
    }

    this._initialized = false
  }
}

// 导出单例
export const errorPlugin = new ErrorPlugin()
