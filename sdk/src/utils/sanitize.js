/**
 * @fileoverview 数据脱敏工具
 * @description 自动脱敏敏感信息，保护用户隐私
 */

// 默认敏感字段
const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'apiKey',
  'api_key',
  'apiSecret',
  'api_secret',
  'authorization',
  'auth',
  'credential',
  'credentials',
  'privateKey',
  'private_key',
  'credit_card',
  'creditCard',
  'card_number',
  'cardNumber',
  'cvv',
  'cvc',
  'ssn',
  'social_security',
  'id_card',
  'idCard',
  'phone',
  'mobile',
  'telephone',
  'email',
  'address',
]

// 敏感数据正则
const SENSITIVE_PATTERNS = [
  // 邮箱
  { pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, replacement: '***@$2' },
  // 手机号 (中国)
  { pattern: /1[3-9]\d{9}/g, replacement: '1**********' },
  // 身份证号
  { pattern: /\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g, replacement: '******' },
  // 银行卡号
  { pattern: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, replacement: '****-****-****-****' },
  // IP 地址 (部分脱敏)
  { pattern: /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/g, replacement: '$1.$2.*.*' },
]

/**
 * 数据脱敏器
 */
class Sanitizer {
  constructor() {
    this._sensitiveKeys = new Set(DEFAULT_SENSITIVE_KEYS.map(k => k.toLowerCase()))
    this._customPatterns = []
    this._enabled = true
  }

  /**
   * 配置脱敏器
   * @param {Object} options - 配置选项
   */
  configure(options = {}) {
    if (options.enabled !== undefined) {
      this._enabled = options.enabled
    }

    if (options.sensitiveKeys) {
      options.sensitiveKeys.forEach(key => {
        this._sensitiveKeys.add(key.toLowerCase())
      })
    }

    if (options.patterns) {
      this._customPatterns = options.patterns
    }
  }

  /**
   * 脱敏对象
   * @param {any} data - 要脱敏的数据
   * @param {number} depth - 当前深度
   * @returns {any} 脱敏后的数据
   */
  sanitize(data, depth = 0) {
    if (!this._enabled) return data
    if (depth > 10) return data // 防止无限递归

    if (data === null || data === undefined) {
      return data
    }

    if (typeof data === 'string') {
      return this._sanitizeString(data)
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item, depth + 1))
    }

    if (typeof data === 'object') {
      return this._sanitizeObject(data, depth)
    }

    return data
  }

  /**
   * 脱敏字符串
   * @private
   */
  _sanitizeString(str) {
    let result = str

    // 应用内置模式
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      result = result.replace(pattern, replacement)
    }

    // 应用自定义模式
    for (const { pattern, replacement } of this._customPatterns) {
      result = result.replace(pattern, replacement)
    }

    return result
  }

  /**
   * 脱敏对象
   * @private
   */
  _sanitizeObject(obj, depth) {
    const result = {}

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase()

      // 检查是否是敏感字段
      if (this._isSensitiveKey(lowerKey)) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = this.sanitize(value, depth + 1)
      }
    }

    return result
  }

  /**
   * 检查是否是敏感字段
   * @private
   */
  _isSensitiveKey(key) {
    // 完全匹配
    if (this._sensitiveKeys.has(key)) {
      return true
    }

    // 部分匹配
    for (const sensitiveKey of this._sensitiveKeys) {
      if (key.includes(sensitiveKey)) {
        return true
      }
    }

    return false
  }

  /**
   * 脱敏 URL
   * @param {string} url - URL 字符串
   * @returns {string} 脱敏后的 URL
   */
  sanitizeUrl(url) {
    if (!url || !this._enabled) return url

    try {
      const urlObj = new URL(url)

      // 脱敏查询参数
      const params = new URLSearchParams(urlObj.search)
      for (const [key] of params) {
        if (this._isSensitiveKey(key.toLowerCase())) {
          params.set(key, '[REDACTED]')
        }
      }
      urlObj.search = params.toString()

      // 脱敏用户信息
      if (urlObj.username) {
        urlObj.username = '***'
      }
      if (urlObj.password) {
        urlObj.password = '***'
      }

      return urlObj.toString()
    } catch (e) {
      return url
    }
  }

  /**
   * 脱敏请求头
   * @param {Object} headers - 请求头对象
   * @returns {Object} 脱敏后的请求头
   */
  sanitizeHeaders(headers) {
    if (!headers || !this._enabled) return headers

    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
    ]

    const result = {}
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase()
      if (sensitiveHeaders.includes(lowerKey)) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * 脱敏错误堆栈中的路径
   * @param {string} stack - 错误堆栈
   * @returns {string} 脱敏后的堆栈
   */
  sanitizeStack(stack) {
    if (!stack || !this._enabled) return stack

    // 移除本地文件路径中的用户名
    return stack.replace(/\/Users\/[^/]+\//g, '/Users/***/').replace(/C:\\Users\\[^\\]+\\/g, 'C:\\Users\\***\\')
  }
}

// 导出单例
export const sanitizer = new Sanitizer()

/**
 * 快捷脱敏函数
 */
export function sanitize(data) {
  return sanitizer.sanitize(data)
}

export function sanitizeUrl(url) {
  return sanitizer.sanitizeUrl(url)
}

export function sanitizeHeaders(headers) {
  return sanitizer.sanitizeHeaders(headers)
}
