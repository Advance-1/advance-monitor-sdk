/**
 * @fileoverview 数据传输模块
 * @description 负责数据上报，支持批量上报、重试机制、离线缓存、数据压缩、去重、脱敏
 */

import { configManager } from './config.js'
import { compress, isCompressionSupported } from '../utils/compress.js'
import { sanitizer } from '../utils/sanitize.js'
import { dedupManager } from '../utils/dedup.js'

// 传输状态
const TransportStatus = {
  IDLE: 'idle',
  SENDING: 'sending',
  OFFLINE: 'offline',
}

/**
 * 数据传输器
 */
class Transport {
  constructor() {
    this._queue = []
    this._status = TransportStatus.IDLE
    this._flushTimer = null
    this._retryCount = 0
    this._offlineQueue = []
  }

  /**
   * 初始化传输器
   * @param {Object} config - SDK 配置
   */
  init(config) {
    this._loadOfflineQueue()
    this._startFlushTimer()
    this._setupOnlineListener()
  }

  /**
   * 发送数据
   * @param {Object} data - 要发送的数据
   * @returns {Promise}
   */
  send(data) {
    const config = configManager.get()
    
    // 去重检查
    if (config.enableDedup !== false && data.type === 'error') {
      if (!dedupManager.shouldReport(data, config.dedupTTL)) {
        return Promise.resolve()
      }
    }

    // 数据脱敏
    if (config.enableSanitize !== false) {
      data = sanitizer.sanitize(data)
    }

    // 执行 beforeSend 钩子
    if (config.beforeSend) {
      const processed = config.beforeSend(data)
      if (processed === null || processed === false) {
        return Promise.resolve()
      }
      data = processed
    }

    // 采样判断
    if (!this._shouldSample(data)) {
      return Promise.resolve()
    }

    // 添加到队列
    this._queue.push({
      data,
      timestamp: Date.now(),
      retries: 0,
    })

    // 限制队列长度
    if (this._queue.length > config.maxQueueSize) {
      this._queue.shift()
    }

    // 如果是错误类型，立即发送
    if (data.type === 'error' || data.level === 'error') {
      return this.flush()
    }

    return Promise.resolve()
  }

  /**
   * 立即发送队列中的数据
   * @returns {Promise}
   */
  async flush() {
    if (this._status === TransportStatus.SENDING) {
      return
    }

    if (this._queue.length === 0 && this._offlineQueue.length === 0) {
      return
    }

    this._status = TransportStatus.SENDING

    try {
      // 先发送离线队列
      if (this._offlineQueue.length > 0) {
        await this._sendBatch(this._offlineQueue)
        this._offlineQueue = []
        this._clearOfflineQueue()
      }

      // 发送当前队列
      if (this._queue.length > 0) {
        const batch = [...this._queue]
        this._queue = []
        await this._sendBatch(batch)
      }

      this._retryCount = 0
    } catch (error) {
      this._handleSendError(error)
    } finally {
      this._status = TransportStatus.IDLE
    }
  }

  /**
   * 批量发送数据
   * @private
   */
  async _sendBatch(batch) {
    const config = configManager.get()
    const dsn = config.dsn

    if (!dsn) {
      console.warn('[AdvanceMonitor] DSN not configured')
      return
    }

    const payload = {
      events: batch.map(item => item.data),
      meta: {
        sdk: 'advance-monitor-sdk',
        version: '__SDK_VERSION__',
        timestamp: Date.now(),
        release: config.release || config.appVersion,
        appId: config.appId,
        environment: config.environment,
      },
    }

    const jsonPayload = JSON.stringify(payload)

    // 尝试压缩数据
    let body = jsonPayload
    let contentType = 'application/json'
    let contentEncoding = null

    if (config.enableCompression !== false && jsonPayload.length > 1024) {
      try {
        const compressed = await compress(jsonPayload)
        if (compressed.encoding !== 'none') {
          body = compressed.data
          contentEncoding = compressed.encoding
        }
      } catch (e) {
        // 压缩失败，使用原始数据
      }
    }

    // 优先使用 sendBeacon (不支持压缩)
    if (this._canUseSendBeacon() && !contentEncoding) {
      const success = navigator.sendBeacon(dsn, jsonPayload)
      if (success) {
        return
      }
    }

    // 使用 fetch
    const headers = {
      'Content-Type': contentType,
    }

    if (contentEncoding) {
      headers['Content-Encoding'] = contentEncoding
    }

    // 添加签名 (简单的 HMAC 签名)
    if (config.secretKey) {
      const signature = await this._generateSignature(jsonPayload, config.secretKey)
      headers['X-Signature'] = signature
    }

    const response = await this._fetchWithTimeout(dsn, {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    }, config.timeout)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  /**
   * 生成请求签名
   * @private
   */
  async _generateSignature(payload, secretKey) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secretKey),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
        return btoa(String.fromCharCode(...new Uint8Array(signature)))
      } catch (e) {
        return ''
      }
    }
    return ''
  }

  /**
   * 带超时的 fetch
   * @private
   */
  _fetchWithTimeout(url, options, timeout) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      }),
    ])
  }

  /**
   * 是否可以使用 sendBeacon
   * @private
   */
  _canUseSendBeacon() {
    return typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
  }

  /**
   * 采样判断
   * @private
   */
  _shouldSample(data) {
    const config = configManager.get()
    
    // 根据数据类型获取采样率
    let sampleRate = config.sampleRate
    
    if (data.type === 'error') {
      sampleRate = config.errorSampleRate
    } else if (data.type === 'performance') {
      sampleRate = config.performanceSampleRate
    } else if (data.type === 'behavior') {
      sampleRate = config.behaviorSampleRate
    }

    return Math.random() < sampleRate
  }

  /**
   * 处理发送错误
   * @private
   */
  _handleSendError(error) {
    const config = configManager.get()

    this._retryCount++

    if (this._retryCount <= config.maxRetries) {
      // 将数据放回队列
      setTimeout(() => {
        this.flush()
      }, config.retryDelay * this._retryCount)
    } else {
      // 超过重试次数，保存到离线队列
      this._saveToOfflineQueue()
      this._retryCount = 0
      
      if (!config.silent) {
        console.warn('[AdvanceMonitor] Failed to send data after retries:', error)
      }
    }
  }

  /**
   * 启动定时刷新
   * @private
   */
  _startFlushTimer() {
    const config = configManager.get()
    
    if (this._flushTimer) {
      clearInterval(this._flushTimer)
    }

    if (config.flushInterval > 0) {
      this._flushTimer = setInterval(() => {
        this.flush()
      }, config.flushInterval)
    }
  }

  /**
   * 停止定时刷新
   * @private
   */
  _stopFlushTimer() {
    if (this._flushTimer) {
      clearInterval(this._flushTimer)
      this._flushTimer = null
    }
  }

  /**
   * 设置在线状态监听
   * @private
   */
  _setupOnlineListener() {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      this._status = TransportStatus.IDLE
      this.flush()
    })

    window.addEventListener('offline', () => {
      this._status = TransportStatus.OFFLINE
    })

    // 页面卸载时发送数据
    window.addEventListener('beforeunload', () => {
      this.flush()
    })

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush()
      }
    })
  }

  /**
   * 保存到离线队列
   * @private
   */
  _saveToOfflineQueue() {
    this._offlineQueue.push(...this._queue)
    this._queue = []

    try {
      const maxOffline = 50
      if (this._offlineQueue.length > maxOffline) {
        this._offlineQueue = this._offlineQueue.slice(-maxOffline)
      }
      localStorage.setItem('__advance_monitor_offline__', JSON.stringify(this._offlineQueue))
    } catch (e) {
      // 忽略存储错误
    }
  }

  /**
   * 加载离线队列
   * @private
   */
  _loadOfflineQueue() {
    try {
      const stored = localStorage.getItem('__advance_monitor_offline__')
      if (stored) {
        this._offlineQueue = JSON.parse(stored)
      }
    } catch (e) {
      // 忽略存储错误
    }
  }

  /**
   * 清空离线队列
   * @private
   */
  _clearOfflineQueue() {
    try {
      localStorage.removeItem('__advance_monitor_offline__')
    } catch (e) {
      // 忽略存储错误
    }
  }

  /**
   * 获取队列长度
   */
  getQueueSize() {
    return this._queue.length + this._offlineQueue.length
  }

  /**
   * 销毁传输器
   */
  destroy() {
    this._stopFlushTimer()
    this.flush()
    this._queue = []
    this._offlineQueue = []
  }
}

// 导出单例
export const transport = new Transport()
