/**
 * @fileoverview 上报去重工具
 * @description 防止短时间内重复上报相同的错误
 */

/**
 * 去重管理器
 */
class DedupManager {
  constructor() {
    this._cache = new Map()
    this._maxCacheSize = 100
    this._defaultTTL = 60000 // 1 分钟内相同错误不重复上报
  }

  /**
   * 配置去重器
   * @param {Object} options - 配置选项
   */
  configure(options = {}) {
    if (options.maxCacheSize) {
      this._maxCacheSize = options.maxCacheSize
    }
    if (options.ttl) {
      this._defaultTTL = options.ttl
    }
  }

  /**
   * 生成事件指纹
   * @param {Object} event - 事件对象
   * @returns {string} 指纹
   */
  generateFingerprint(event) {
    const parts = []

    if (event.type) {
      parts.push(event.type)
    }

    if (event.data) {
      // 错误类型
      if (event.data.errorType) {
        parts.push(event.data.errorType)
      }

      // 错误消息 (取前 100 字符)
      if (event.data.message) {
        parts.push(event.data.message.substring(0, 100))
      }

      // 文件名和行号
      if (event.data.filename) {
        parts.push(event.data.filename)
      }
      if (event.data.lineno) {
        parts.push(String(event.data.lineno))
      }

      // 堆栈的第一帧
      if (event.data.stack) {
        const firstFrame = this._extractFirstFrame(event.data.stack)
        if (firstFrame) {
          parts.push(firstFrame)
        }
      }
    }

    // 生成 hash
    return this._hash(parts.join('|'))
  }

  /**
   * 提取堆栈第一帧
   * @private
   */
  _extractFirstFrame(stack) {
    if (typeof stack === 'string') {
      const lines = stack.split('\n')
      for (const line of lines) {
        if (line.includes('at ')) {
          return line.trim()
        }
      }
    } else if (Array.isArray(stack)) {
      return stack[0]?.raw || ''
    }
    return ''
  }

  /**
   * 简单的字符串 hash
   * @private
   */
  _hash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * 检查是否应该上报
   * @param {Object} event - 事件对象
   * @param {number} ttl - 去重时间窗口 (毫秒)
   * @returns {boolean} 是否应该上报
   */
  shouldReport(event, ttl = this._defaultTTL) {
    const fingerprint = this.generateFingerprint(event)
    const now = Date.now()

    // 检查缓存
    const cached = this._cache.get(fingerprint)
    if (cached) {
      const { timestamp, count } = cached
      
      // 在时间窗口内
      if (now - timestamp < ttl) {
        // 更新计数
        this._cache.set(fingerprint, {
          timestamp,
          count: count + 1,
        })
        return false
      }
    }

    // 清理过期缓存
    this._cleanup()

    // 添加到缓存
    this._cache.set(fingerprint, {
      timestamp: now,
      count: 1,
    })

    return true
  }

  /**
   * 获取被去重的次数
   * @param {Object} event - 事件对象
   * @returns {number} 去重次数
   */
  getDedupCount(event) {
    const fingerprint = this.generateFingerprint(event)
    const cached = this._cache.get(fingerprint)
    return cached ? cached.count : 0
  }

  /**
   * 清理过期缓存
   * @private
   */
  _cleanup() {
    const now = Date.now()
    
    // 删除过期项
    for (const [key, value] of this._cache) {
      if (now - value.timestamp > this._defaultTTL * 2) {
        this._cache.delete(key)
      }
    }

    // 限制缓存大小
    if (this._cache.size > this._maxCacheSize) {
      const entries = Array.from(this._cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toDelete = entries.slice(0, entries.length - this._maxCacheSize)
      for (const [key] of toDelete) {
        this._cache.delete(key)
      }
    }
  }

  /**
   * 清空缓存
   */
  clear() {
    this._cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      cacheSize: this._cache.size,
      maxCacheSize: this._maxCacheSize,
      ttl: this._defaultTTL,
    }
  }
}

// 导出单例
export const dedupManager = new DedupManager()
