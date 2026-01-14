/**
 * @fileoverview 网络请求监控插件
 * @description 监控 XMLHttpRequest 和 Fetch 请求
 */

import { configManager } from '../core/config.js'
import { breadcrumbManager, BreadcrumbTypes, BreadcrumbLevels } from '../core/breadcrumb.js'
import { eventBuilder, ErrorTypes, ErrorLevels } from '../core/eventBuilder.js'
import { transport } from '../core/transport.js'

/**
 * 网络请求监控插件
 */
class NetworkPlugin {
  constructor() {
    this._initialized = false
    this._originalXHROpen = null
    this._originalXHRSend = null
    this._originalFetch = null
  }

  /**
   * 初始化插件
   */
  init() {
    if (this._initialized) return
    
    const config = configManager.get()
    if (!config.enableNetwork) return

    this._setupXHRMonitor()
    this._setupFetchMonitor()

    this._initialized = true
  }

  /**
   * 设置 XMLHttpRequest 监控
   * @private
   */
  _setupXHRMonitor() {
    const self = this
    this._originalXHROpen = XMLHttpRequest.prototype.open
    this._originalXHRSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      this._monitorData = {
        method: method.toUpperCase(),
        url: self._normalizeUrl(url),
        startTime: 0,
      }
      return self._originalXHROpen.apply(this, [method, url, ...args])
    }

    XMLHttpRequest.prototype.send = function (body) {
      const xhr = this
      const monitorData = xhr._monitorData || {}
      
      // 检查是否应该忽略
      if (self._shouldIgnore(monitorData.url)) {
        return self._originalXHRSend.apply(this, [body])
      }

      monitorData.startTime = Date.now()
      monitorData.body = self._truncateBody(body)

      // 监听状态变化
      const originalOnReadyStateChange = xhr.onreadystatechange
      xhr.onreadystatechange = function (...args) {
        if (xhr.readyState === 4) {
          self._handleXHRComplete(xhr, monitorData)
        }
        if (originalOnReadyStateChange) {
          return originalOnReadyStateChange.apply(this, args)
        }
      }

      // 监听错误
      const originalOnError = xhr.onerror
      xhr.onerror = function (...args) {
        self._handleXHRError(xhr, monitorData)
        if (originalOnError) {
          return originalOnError.apply(this, args)
        }
      }

      // 监听超时
      const originalOnTimeout = xhr.ontimeout
      xhr.ontimeout = function (...args) {
        self._handleXHRTimeout(xhr, monitorData)
        if (originalOnTimeout) {
          return originalOnTimeout.apply(this, args)
        }
      }

      return self._originalXHRSend.apply(this, [body])
    }
  }

  /**
   * 处理 XHR 完成
   * @private
   */
  _handleXHRComplete(xhr, monitorData) {
    const endTime = Date.now()
    const duration = endTime - monitorData.startTime

    const requestInfo = {
      method: monitorData.method,
      url: monitorData.url,
      body: monitorData.body,
      timestamp: monitorData.startTime,
    }

    const responseInfo = {
      status: xhr.status,
      statusText: xhr.statusText,
      headers: this._parseResponseHeaders(xhr.getAllResponseHeaders()),
      body: this._truncateBody(xhr.responseText),
      timestamp: endTime,
      duration,
    }

    // 添加面包屑
    breadcrumbManager.addRequest(
      monitorData.method,
      monitorData.url,
      xhr.status,
      { duration }
    )

    // 发送网络事件
    const event = eventBuilder.buildNetwork(requestInfo, responseInfo)
    transport.send(event)

    // 如果是错误状态码，额外发送错误事件
    if (xhr.status >= 400) {
      this._reportNetworkError(requestInfo, responseInfo)
    }
  }

  /**
   * 处理 XHR 错误
   * @private
   */
  _handleXHRError(xhr, monitorData) {
    const endTime = Date.now()
    const duration = endTime - monitorData.startTime

    breadcrumbManager.add({
      type: BreadcrumbTypes.XHR,
      category: 'http',
      level: BreadcrumbLevels.ERROR,
      message: `${monitorData.method} ${monitorData.url} [Network Error]`,
      data: {
        method: monitorData.method,
        url: monitorData.url,
        duration,
        error: 'Network Error',
      },
    })

    this._reportNetworkError(
      { method: monitorData.method, url: monitorData.url, timestamp: monitorData.startTime },
      { status: 0, statusText: 'Network Error', duration, timestamp: endTime }
    )
  }

  /**
   * 处理 XHR 超时
   * @private
   */
  _handleXHRTimeout(xhr, monitorData) {
    const endTime = Date.now()
    const duration = endTime - monitorData.startTime

    breadcrumbManager.add({
      type: BreadcrumbTypes.XHR,
      category: 'http',
      level: BreadcrumbLevels.ERROR,
      message: `${monitorData.method} ${monitorData.url} [Timeout]`,
      data: {
        method: monitorData.method,
        url: monitorData.url,
        duration,
        error: 'Timeout',
      },
    })

    this._reportNetworkError(
      { method: monitorData.method, url: monitorData.url, timestamp: monitorData.startTime },
      { status: 0, statusText: 'Timeout', duration, timestamp: endTime }
    )
  }

  /**
   * 设置 Fetch 监控
   * @private
   */
  _setupFetchMonitor() {
    if (!window.fetch) return

    const self = this
    this._originalFetch = window.fetch

    window.fetch = function (input, init = {}) {
      const url = self._normalizeUrl(typeof input === 'string' ? input : input.url)
      const method = (init.method || 'GET').toUpperCase()

      // 检查是否应该忽略
      if (self._shouldIgnore(url)) {
        return self._originalFetch.apply(this, [input, init])
      }

      const startTime = Date.now()
      const requestInfo = {
        method,
        url,
        body: self._truncateBody(init.body),
        headers: init.headers,
        timestamp: startTime,
      }

      return self._originalFetch.apply(this, [input, init])
        .then(response => {
          const endTime = Date.now()
          const duration = endTime - startTime

          // 克隆响应以便读取 body
          const clonedResponse = response.clone()

          const responseInfo = {
            status: response.status,
            statusText: response.statusText,
            headers: self._headersToObject(response.headers),
            timestamp: endTime,
            duration,
          }

          // 添加面包屑
          breadcrumbManager.addRequest(method, url, response.status, { duration })

          // 尝试读取响应体
          clonedResponse.text().then(body => {
            responseInfo.body = self._truncateBody(body)
            
            // 发送网络事件
            const event = eventBuilder.buildNetwork(requestInfo, responseInfo)
            transport.send(event)

            // 如果是错误状态码，额外发送错误事件
            if (response.status >= 400) {
              self._reportNetworkError(requestInfo, responseInfo)
            }
          }).catch(() => {
            // 无法读取响应体，仍然发送事件
            const event = eventBuilder.buildNetwork(requestInfo, responseInfo)
            transport.send(event)
          })

          return response
        })
        .catch(error => {
          const endTime = Date.now()
          const duration = endTime - startTime

          breadcrumbManager.add({
            type: BreadcrumbTypes.FETCH,
            category: 'http',
            level: BreadcrumbLevels.ERROR,
            message: `${method} ${url} [${error.message}]`,
            data: {
              method,
              url,
              duration,
              error: error.message,
            },
          })

          self._reportNetworkError(
            requestInfo,
            { status: 0, statusText: error.message, duration, timestamp: endTime }
          )

          throw error
        })
    }
  }

  /**
   * 上报网络错误
   * @private
   */
  _reportNetworkError(request, response) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
    
    const event = eventBuilder.buildError(error, {
      errorType: ErrorTypes.NETWORK_ERROR,
      level: response.status >= 500 ? ErrorLevels.ERROR : ErrorLevels.WARNING,
      mechanism: 'fetch',
      extra: {
        request: {
          method: request.method,
          url: request.url,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          duration: response.duration,
        },
      },
    })

    transport.send(event)
  }

  /**
   * 检查是否应该忽略
   * @private
   */
  _shouldIgnore(url) {
    const config = configManager.get()
    
    // 忽略监控上报请求
    if (url.includes(config.dsn)) {
      return true
    }

    // 检查忽略的 URL
    if (config.ignoreUrls && config.ignoreUrls.length > 0) {
      for (const pattern of config.ignoreUrls) {
        if (pattern instanceof RegExp && pattern.test(url)) {
          return true
        }
        if (typeof pattern === 'string' && url.includes(pattern)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * 标准化 URL
   * @private
   */
  _normalizeUrl(url) {
    if (!url) return ''
    
    // 处理相对路径
    if (url.startsWith('/')) {
      return window.location.origin + url
    }
    
    return url
  }

  /**
   * 截断请求/响应体
   * @private
   */
  _truncateBody(body, maxLength = 1000) {
    if (!body) return ''
    
    let str = ''
    if (typeof body === 'string') {
      str = body
    } else if (body instanceof FormData) {
      str = '[FormData]'
    } else if (body instanceof Blob) {
      str = '[Blob]'
    } else if (body instanceof ArrayBuffer) {
      str = '[ArrayBuffer]'
    } else {
      try {
        str = JSON.stringify(body)
      } catch (e) {
        str = String(body)
      }
    }

    if (str.length > maxLength) {
      return str.slice(0, maxLength) + '...'
    }
    return str
  }

  /**
   * 解析响应头
   * @private
   */
  _parseResponseHeaders(headerStr) {
    const headers = {}
    if (!headerStr) return headers

    headerStr.split('\r\n').forEach(line => {
      const parts = line.split(': ')
      if (parts.length === 2) {
        headers[parts[0].toLowerCase()] = parts[1]
      }
    })

    return headers
  }

  /**
   * Headers 对象转普通对象
   * @private
   */
  _headersToObject(headers) {
    const obj = {}
    if (headers && headers.forEach) {
      headers.forEach((value, key) => {
        obj[key] = value
      })
    }
    return obj
  }

  /**
   * 销毁插件
   */
  destroy() {
    if (!this._initialized) return

    // 恢复原始方法
    if (this._originalXHROpen) {
      XMLHttpRequest.prototype.open = this._originalXHROpen
    }
    if (this._originalXHRSend) {
      XMLHttpRequest.prototype.send = this._originalXHRSend
    }
    if (this._originalFetch) {
      window.fetch = this._originalFetch
    }

    this._initialized = false
  }
}

// 导出单例
export const networkPlugin = new NetworkPlugin()
