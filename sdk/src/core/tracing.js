/**
 * @fileoverview 链路追踪模块
 * @description 支持自定义 Span/Transaction，实现业务链路追踪
 */

import { configManager } from './config.js'
import { transport } from './transport.js'

/**
 * Span 状态
 */
export const SpanStatus = {
  OK: 'ok',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  UNKNOWN: 'unknown',
}

/**
 * 生成唯一 ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11)
}

/**
 * Span 类 - 表示一个操作的时间跨度
 */
export class Span {
  constructor(options = {}) {
    this.spanId = generateId()
    this.traceId = options.traceId || generateId()
    this.parentSpanId = options.parentSpanId || null
    this.name = options.name || 'unknown'
    this.op = options.op || 'default'
    this.description = options.description || ''
    this.startTime = Date.now()
    this.endTime = null
    this.duration = null
    this.status = SpanStatus.OK
    this.tags = options.tags || {}
    this.data = options.data || {}
    this.children = []
    this._finished = false
  }

  /**
   * 设置标签
   */
  setTag(key, value) {
    this.tags[key] = value
    return this
  }

  /**
   * 设置数据
   */
  setData(key, value) {
    this.data[key] = value
    return this
  }

  /**
   * 设置状态
   */
  setStatus(status) {
    this.status = status
    return this
  }

  /**
   * 设置 HTTP 状态
   */
  setHttpStatus(statusCode) {
    this.setTag('http.status_code', statusCode)
    if (statusCode >= 400) {
      this.setStatus(SpanStatus.ERROR)
    }
    return this
  }

  /**
   * 创建子 Span
   */
  startChild(options = {}) {
    const childSpan = new Span({
      ...options,
      traceId: this.traceId,
      parentSpanId: this.spanId,
    })
    this.children.push(childSpan)
    return childSpan
  }

  /**
   * 结束 Span
   */
  finish(endTime = Date.now()) {
    if (this._finished) return

    this._finished = true
    this.endTime = endTime
    this.duration = this.endTime - this.startTime

    // 如果是根 Span，上报整个 trace
    if (!this.parentSpanId) {
      this._report()
    }
  }

  /**
   * 上报 Span 数据
   */
  _report() {
    const spanData = this.toJSON()
    
    transport.send({
      type: 'transaction',
      data: spanData,
      timestamp: Date.now(),
    })
  }

  /**
   * 转换为 JSON
   */
  toJSON() {
    return {
      spanId: this.spanId,
      traceId: this.traceId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      op: this.op,
      description: this.description,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      status: this.status,
      tags: this.tags,
      data: this.data,
      children: this.children.map(child => child.toJSON()),
    }
  }
}

/**
 * Transaction 类 - 表示一个完整的业务操作
 */
export class Transaction extends Span {
  constructor(options = {}) {
    super(options)
    this.type = 'transaction'
    this.measurements = {}
    this.contexts = {}
  }

  /**
   * 设置度量值
   */
  setMeasurement(name, value, unit = '') {
    this.measurements[name] = { value, unit }
    return this
  }

  /**
   * 设置上下文
   */
  setContext(name, context) {
    this.contexts[name] = context
    return this
  }

  /**
   * 转换为 JSON
   */
  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
      measurements: this.measurements,
      contexts: this.contexts,
    }
  }
}

/**
 * 链路追踪管理器
 */
class TracingManager {
  constructor() {
    this._activeTransaction = null
    this._activeSpan = null
  }

  /**
   * 开始一个 Transaction
   */
  startTransaction(options = {}) {
    const transaction = new Transaction(options)
    this._activeTransaction = transaction
    this._activeSpan = transaction
    return transaction
  }

  /**
   * 获取当前活跃的 Transaction
   */
  getActiveTransaction() {
    return this._activeTransaction
  }

  /**
   * 获取当前活跃的 Span
   */
  getActiveSpan() {
    return this._activeSpan
  }

  /**
   * 设置当前活跃的 Span
   */
  setActiveSpan(span) {
    this._activeSpan = span
  }

  /**
   * 开始一个子 Span
   */
  startSpan(options = {}) {
    const parent = this._activeSpan || this._activeTransaction

    if (!parent) {
      // 如果没有父级，创建一个新的 Transaction
      return this.startTransaction(options)
    }

    const span = parent.startChild(options)
    this._activeSpan = span
    return span
  }

  /**
   * 包装函数，自动创建 Span
   */
  wrap(name, fn, options = {}) {
    return async (...args) => {
      const span = this.startSpan({ name, ...options })
      
      try {
        const result = await fn(...args)
        span.setStatus(SpanStatus.OK)
        return result
      } catch (error) {
        span.setStatus(SpanStatus.ERROR)
        span.setData('error', {
          message: error.message,
          stack: error.stack,
        })
        throw error
      } finally {
        span.finish()
        // 恢复父级 Span
        if (span.parentSpanId) {
          const parent = this._findSpanById(span.parentSpanId)
          if (parent) {
            this._activeSpan = parent
          }
        }
      }
    }
  }

  /**
   * 包装 fetch 请求
   */
  traceFetch(url, options = {}) {
    return this.wrap(`fetch ${url}`, async () => {
      const span = this.getActiveSpan()
      
      span.setTag('http.method', options.method || 'GET')
      span.setTag('http.url', url)
      span.setData('request', {
        url,
        method: options.method || 'GET',
        headers: options.headers,
      })

      const response = await fetch(url, options)
      
      span.setHttpStatus(response.status)
      span.setData('response', {
        status: response.status,
        statusText: response.statusText,
      })

      return response
    }, { op: 'http.client' })()
  }

  /**
   * 查找 Span
   */
  _findSpanById(spanId, root = this._activeTransaction) {
    if (!root) return null
    if (root.spanId === spanId) return root

    for (const child of root.children || []) {
      const found = this._findSpanById(spanId, child)
      if (found) return found
    }

    return null
  }

  /**
   * 清理
   */
  clear() {
    this._activeTransaction = null
    this._activeSpan = null
  }
}

// 导出单例
export const tracingManager = new TracingManager()

/**
 * 便捷方法
 */
export function startTransaction(options) {
  return tracingManager.startTransaction(options)
}

export function startSpan(options) {
  return tracingManager.startSpan(options)
}

export function getActiveTransaction() {
  return tracingManager.getActiveTransaction()
}

export function getActiveSpan() {
  return tracingManager.getActiveSpan()
}

/**
 * 装饰器 - 自动追踪方法
 * @usage
 * class MyService {
 *   @trace('fetchUser')
 *   async fetchUser(id) { ... }
 * }
 */
export function trace(name, options = {}) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args) {
      const span = tracingManager.startSpan({ name: name || propertyKey, ...options })
      
      try {
        const result = await originalMethod.apply(this, args)
        span.setStatus(SpanStatus.OK)
        return result
      } catch (error) {
        span.setStatus(SpanStatus.ERROR)
        span.setData('error', { message: error.message })
        throw error
      } finally {
        span.finish()
      }
    }

    return descriptor
  }
}
