/**
 * @fileoverview 事件构建器模块
 * @description 统一构建上报事件的数据结构
 */

import { contextManager } from './context.js'
import { breadcrumbManager } from './breadcrumb.js'
import { generateUUID } from '../utils/device.js'

// 事件类型
export const EventTypes = {
  ERROR: 'error',
  PERFORMANCE: 'performance',
  BEHAVIOR: 'behavior',
  NETWORK: 'network',
  RESOURCE: 'resource',
  CUSTOM: 'custom',
  LIFECYCLE: 'lifecycle',
}

// 错误类型
export const ErrorTypes = {
  JS_ERROR: 'js_error',
  PROMISE_ERROR: 'promise_error',
  RESOURCE_ERROR: 'resource_error',
  NETWORK_ERROR: 'network_error',
  CONSOLE_ERROR: 'console_error',
  VUE_ERROR: 'vue_error',
  REACT_ERROR: 'react_error',
  CUSTOM_ERROR: 'custom_error',
  UNKNOWN_ERROR: 'unknown_error',
}

// 错误级别
export const ErrorLevels = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
}

/**
 * 事件构建器
 */
class EventBuilder {
  /**
   * 构建基础事件
   * @param {string} type - 事件类型
   * @param {Object} data - 事件数据
   * @returns {Object} 完整事件对象
   */
  build(type, data = {}) {
    const context = contextManager.getContext()
    
    return {
      // 事件标识
      eventId: generateUUID(),
      type,
      timestamp: Date.now(),
      
      // 上下文信息
      context: {
        sdk: context.sdk,
        app: context.app,
        device: context.device,
        browser: context.browser,
        os: context.os,
        session: context.session,
        user: context.user,
        page: context.page,
        tags: context.tags,
        extra: context.extra,
      },
      
      // 事件数据
      data,
      
      // 面包屑
      breadcrumbs: breadcrumbManager.getAll(),
    }
  }

  /**
   * 构建错误事件
   * @param {Error|Object} error - 错误对象
   * @param {Object} options - 额外选项
   * @returns {Object} 错误事件对象
   */
  buildError(error, options = {}) {
    const errorData = this._normalizeError(error)
    
    return this.build(EventTypes.ERROR, {
      errorType: options.errorType || ErrorTypes.JS_ERROR,
      level: options.level || ErrorLevels.ERROR,
      message: errorData.message,
      name: errorData.name,
      stack: errorData.stack,
      filename: options.filename || errorData.filename,
      lineno: options.lineno || errorData.lineno,
      colno: options.colno || errorData.colno,
      mechanism: options.mechanism || 'onerror',
      handled: options.handled !== false,
      extra: options.extra || {},
    })
  }

  /**
   * 构建性能事件
   * @param {string} metricType - 指标类型
   * @param {Object} metrics - 性能指标
   * @returns {Object} 性能事件对象
   */
  buildPerformance(metricType, metrics) {
    return this.build(EventTypes.PERFORMANCE, {
      metricType,
      metrics,
    })
  }

  /**
   * 构建行为事件
   * @param {string} action - 行为类型
   * @param {Object} data - 行为数据
   * @returns {Object} 行为事件对象
   */
  buildBehavior(action, data = {}) {
    return this.build(EventTypes.BEHAVIOR, {
      action,
      ...data,
    })
  }

  /**
   * 构建网络请求事件
   * @param {Object} request - 请求信息
   * @param {Object} response - 响应信息
   * @returns {Object} 网络事件对象
   */
  buildNetwork(request, response) {
    return this.build(EventTypes.NETWORK, {
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
        timestamp: request.timestamp,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        timestamp: response.timestamp,
        duration: response.duration,
      },
    })
  }

  /**
   * 构建资源加载事件
   * @param {Object} resource - 资源信息
   * @returns {Object} 资源事件对象
   */
  buildResource(resource) {
    return this.build(EventTypes.RESOURCE, {
      resourceType: resource.type,
      url: resource.url,
      duration: resource.duration,
      size: resource.size,
      status: resource.status,
      timing: resource.timing,
    })
  }

  /**
   * 构建自定义事件
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   * @returns {Object} 自定义事件对象
   */
  buildCustom(eventName, data = {}) {
    return this.build(EventTypes.CUSTOM, {
      eventName,
      ...data,
    })
  }

  /**
   * 构建生命周期事件
   * @param {string} lifecycle - 生命周期类型
   * @param {Object} data - 事件数据
   * @returns {Object} 生命周期事件对象
   */
  buildLifecycle(lifecycle, data = {}) {
    return this.build(EventTypes.LIFECYCLE, {
      lifecycle,
      ...data,
    })
  }

  /**
   * 标准化错误对象
   * @private
   */
  _normalizeError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        filename: this._extractFilename(error.stack),
        lineno: this._extractLineno(error.stack),
        colno: this._extractColno(error.stack),
      }
    }

    if (typeof error === 'string') {
      return {
        name: 'Error',
        message: error,
        stack: '',
        filename: '',
        lineno: 0,
        colno: 0,
      }
    }

    if (typeof error === 'object' && error !== null) {
      return {
        name: error.name || 'Error',
        message: error.message || String(error),
        stack: error.stack || '',
        filename: error.filename || '',
        lineno: error.lineno || 0,
        colno: error.colno || 0,
      }
    }

    return {
      name: 'Error',
      message: String(error),
      stack: '',
      filename: '',
      lineno: 0,
      colno: 0,
    }
  }

  /**
   * 从堆栈中提取文件名
   * @private
   */
  _extractFilename(stack) {
    if (!stack) return ''
    const match = stack.match(/at\s+(?:\w+\s+)?\(?(.+?):\d+:\d+\)?/)
    return match ? match[1] : ''
  }

  /**
   * 从堆栈中提取行号
   * @private
   */
  _extractLineno(stack) {
    if (!stack) return 0
    const match = stack.match(/at\s+(?:\w+\s+)?\(?.*?:(\d+):\d+\)?/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * 从堆栈中提取列号
   * @private
   */
  _extractColno(stack) {
    if (!stack) return 0
    const match = stack.match(/at\s+(?:\w+\s+)?\(?.*?:\d+:(\d+)\)?/)
    return match ? parseInt(match[1], 10) : 0
  }
}

// 导出单例
export const eventBuilder = new EventBuilder()
