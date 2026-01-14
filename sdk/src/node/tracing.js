/**
 * @fileoverview Node.js 后端链路追踪
 * @description 轻量级 APM 实现，支持 HTTP、数据库、Redis 等自动埋点
 */

const { AsyncLocalStorage } = require('async_hooks')

// 使用 AsyncLocalStorage 在异步调用链中传递 context
const asyncLocalStorage = new AsyncLocalStorage()

/**
 * Span 状态
 */
const SpanStatus = {
  OK: 'ok',
  ERROR: 'error',
  CANCELLED: 'cancelled',
}

/**
 * 生成唯一 ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11)
}

/**
 * Span 类
 */
class Span {
  constructor(options = {}) {
    this.spanId = generateId()
    this.traceId = options.traceId || generateId()
    this.parentSpanId = options.parentSpanId || null
    this.name = options.name || 'unknown'
    this.op = options.op || 'default'
    this.startTime = Date.now()
    this.endTime = null
    this.duration = null
    this.status = SpanStatus.OK
    this.tags = options.tags || {}
    this.data = options.data || {}
    this.children = []
  }

  setTag(key, value) {
    this.tags[key] = value
    return this
  }

  setData(key, value) {
    this.data[key] = value
    return this
  }

  setStatus(status) {
    this.status = status
    return this
  }

  setHttpStatus(statusCode) {
    this.setTag('http.status_code', statusCode)
    if (statusCode >= 400) {
      this.setStatus(SpanStatus.ERROR)
    }
    return this
  }

  startChild(options = {}) {
    const childSpan = new Span({
      ...options,
      traceId: this.traceId,
      parentSpanId: this.spanId,
    })
    this.children.push(childSpan)
    return childSpan
  }

  finish() {
    this.endTime = Date.now()
    this.duration = this.endTime - this.startTime
  }

  toJSON() {
    return {
      spanId: this.spanId,
      traceId: this.traceId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      op: this.op,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      status: this.status,
      tags: this.tags,
      data: this.data,
      children: this.children.map(c => c.toJSON()),
    }
  }
}

/**
 * Transaction 类 - 代表一个完整的请求
 */
class Transaction extends Span {
  constructor(options = {}) {
    super(options)
    this.type = 'transaction'
    this.request = options.request || null
    this.response = options.response || null
  }

  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
    }
  }
}

/**
 * 链路追踪管理器
 */
class NodeTracing {
  constructor() {
    this._config = {
      dsn: null,
      serviceName: 'unknown-service',
      environment: 'development',
      sampleRate: 1,
      enabled: true,
    }
    this._transactions = []
  }

  /**
   * 初始化
   */
  init(config = {}) {
    Object.assign(this._config, config)
    return this
  }

  /**
   * 获取当前 context
   */
  getCurrentContext() {
    return asyncLocalStorage.getStore() || {}
  }

  /**
   * 获取当前 Transaction
   */
  getCurrentTransaction() {
    const context = this.getCurrentContext()
    return context.transaction
  }

  /**
   * 获取当前 Span
   */
  getCurrentSpan() {
    const context = this.getCurrentContext()
    return context.span || context.transaction
  }

  /**
   * 开始一个 Transaction
   */
  startTransaction(options = {}) {
    // 采样
    if (Math.random() > this._config.sampleRate) {
      return null
    }

    const transaction = new Transaction({
      ...options,
      // 从请求头中提取 trace context
      traceId: options.traceId || this._extractTraceId(options.request),
      parentSpanId: options.parentSpanId || this._extractParentSpanId(options.request),
    })

    return transaction
  }

  /**
   * 在 Transaction 上下文中执行函数
   */
  runWithTransaction(transaction, fn) {
    if (!transaction) {
      return fn()
    }

    return asyncLocalStorage.run({ transaction, span: transaction }, fn)
  }

  /**
   * 开始一个子 Span
   */
  startSpan(options = {}) {
    const parent = this.getCurrentSpan()
    
    if (!parent) {
      // 没有父级，创建独立 span
      return new Span(options)
    }

    const span = parent.startChild(options)
    
    // 更新当前 span
    const context = this.getCurrentContext()
    context.span = span

    return span
  }

  /**
   * 结束 Span
   */
  finishSpan(span) {
    if (!span) return

    span.finish()

    // 恢复父级 span
    const context = this.getCurrentContext()
    if (context.span === span && span.parentSpanId) {
      // 找到父级
      const parent = this._findSpanById(span.parentSpanId, context.transaction)
      context.span = parent || context.transaction
    }
  }

  /**
   * 结束 Transaction 并上报
   */
  finishTransaction(transaction) {
    if (!transaction) return

    transaction.finish()
    this._report(transaction)
  }

  /**
   * 从请求头提取 traceId
   */
  _extractTraceId(request) {
    if (!request?.headers) return null

    // W3C Trace Context
    const traceparent = request.headers['traceparent']
    if (traceparent) {
      const parts = traceparent.split('-')
      return parts[1] // version-traceId-parentId-flags
    }

    // B3 Propagation
    return request.headers['x-b3-traceid'] || null
  }

  /**
   * 从请求头提取 parentSpanId
   */
  _extractParentSpanId(request) {
    if (!request?.headers) return null

    // W3C Trace Context
    const traceparent = request.headers['traceparent']
    if (traceparent) {
      const parts = traceparent.split('-')
      return parts[2]
    }

    // B3 Propagation
    return request.headers['x-b3-spanid'] || null
  }

  /**
   * 生成传播头
   */
  getTraceHeaders() {
    const span = this.getCurrentSpan()
    if (!span) return {}

    return {
      // W3C Trace Context
      'traceparent': `00-${span.traceId}-${span.spanId}-01`,
      // B3 Propagation (兼容)
      'x-b3-traceid': span.traceId,
      'x-b3-spanid': span.spanId,
      'x-b3-sampled': '1',
    }
  }

  /**
   * 查找 Span
   */
  _findSpanById(spanId, root) {
    if (!root) return null
    if (root.spanId === spanId) return root

    for (const child of root.children || []) {
      const found = this._findSpanById(spanId, child)
      if (found) return found
    }

    return null
  }

  /**
   * 上报数据
   */
  async _report(transaction) {
    if (!this._config.dsn || !this._config.enabled) return

    try {
      const payload = {
        type: 'transaction',
        data: transaction.toJSON(),
        meta: {
          service: this._config.serviceName,
          environment: this._config.environment,
          timestamp: Date.now(),
        },
      }

      await fetch(this._config.dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('[NodeTracing] Report failed:', error.message)
    }
  }
}

// 导出单例
const nodeTracing = new NodeTracing()

/**
 * Express 中间件
 */
function expressMiddleware(options = {}) {
  return (req, res, next) => {
    const transaction = nodeTracing.startTransaction({
      name: `${req.method} ${req.path}`,
      op: 'http.server',
      request: req,
      tags: {
        'http.method': req.method,
        'http.url': req.originalUrl,
        'http.route': req.route?.path,
      },
    })

    if (!transaction) {
      return next()
    }

    // 监听响应结束
    res.on('finish', () => {
      transaction.setHttpStatus(res.statusCode)
      transaction.setTag('http.status_code', res.statusCode)
      nodeTracing.finishTransaction(transaction)
    })

    // 在 transaction 上下文中执行后续中间件
    nodeTracing.runWithTransaction(transaction, () => {
      next()
    })
  }
}

/**
 * Koa 中间件
 */
function koaMiddleware(options = {}) {
  return async (ctx, next) => {
    const transaction = nodeTracing.startTransaction({
      name: `${ctx.method} ${ctx.path}`,
      op: 'http.server',
      request: ctx.request,
      tags: {
        'http.method': ctx.method,
        'http.url': ctx.originalUrl,
      },
    })

    if (!transaction) {
      return next()
    }

    try {
      await nodeTracing.runWithTransaction(transaction, next)
      transaction.setHttpStatus(ctx.status)
    } catch (error) {
      transaction.setStatus(SpanStatus.ERROR)
      transaction.setData('error', { message: error.message })
      throw error
    } finally {
      nodeTracing.finishTransaction(transaction)
    }
  }
}

/**
 * 包装数据库查询
 */
function wrapDatabaseQuery(queryFn, options = {}) {
  return async function (...args) {
    const span = nodeTracing.startSpan({
      name: options.name || 'db.query',
      op: options.op || 'db',
      data: {
        query: args[0]?.substring?.(0, 1000), // 截断长查询
      },
    })

    try {
      const result = await queryFn.apply(this, args)
      span?.setStatus(SpanStatus.OK)
      return result
    } catch (error) {
      span?.setStatus(SpanStatus.ERROR)
      span?.setData('error', { message: error.message })
      throw error
    } finally {
      nodeTracing.finishSpan(span)
    }
  }
}

/**
 * 包装 Redis 操作
 */
function wrapRedisCommand(commandFn, commandName) {
  return async function (...args) {
    const span = nodeTracing.startSpan({
      name: `redis.${commandName}`,
      op: 'cache',
      data: {
        command: commandName,
        key: args[0],
      },
    })

    try {
      const result = await commandFn.apply(this, args)
      span?.setStatus(SpanStatus.OK)
      return result
    } catch (error) {
      span?.setStatus(SpanStatus.ERROR)
      span?.setData('error', { message: error.message })
      throw error
    } finally {
      nodeTracing.finishSpan(span)
    }
  }
}

/**
 * 包装 HTTP 客户端请求
 */
function wrapHttpRequest(requestFn) {
  return async function (url, options = {}) {
    const span = nodeTracing.startSpan({
      name: `HTTP ${options.method || 'GET'} ${url}`,
      op: 'http.client',
      tags: {
        'http.method': options.method || 'GET',
        'http.url': url,
      },
    })

    // 注入 trace headers
    const headers = {
      ...options.headers,
      ...nodeTracing.getTraceHeaders(),
    }

    try {
      const result = await requestFn.call(this, url, { ...options, headers })
      span?.setHttpStatus(result.status || result.statusCode)
      return result
    } catch (error) {
      span?.setStatus(SpanStatus.ERROR)
      span?.setData('error', { message: error.message })
      throw error
    } finally {
      nodeTracing.finishSpan(span)
    }
  }
}

module.exports = {
  nodeTracing,
  Span,
  Transaction,
  SpanStatus,
  expressMiddleware,
  koaMiddleware,
  wrapDatabaseQuery,
  wrapRedisCommand,
  wrapHttpRequest,
}
