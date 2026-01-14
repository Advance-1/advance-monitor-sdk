/**
 * @fileoverview 通用工具函数模块
 */

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间(ms)
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} limit - 时间限制(ms)
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, limit = 300) {
  let inThrottle = false
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * 深拷贝
 * @param {*} obj - 要拷贝的对象
 * @param {WeakMap} cache - 缓存（用于处理循环引用）
 * @returns {*} 拷贝后的对象
 */
export function deepClone(obj, cache = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (cache.has(obj)) {
    return cache.get(obj)
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags)
  }
  
  if (obj instanceof Error) {
    const error = new obj.constructor(obj.message)
    error.stack = obj.stack
    return error
  }
  
  const clone = Array.isArray(obj) ? [] : {}
  cache.set(obj, clone)
  
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key], cache)
  }
  
  return clone
}

/**
 * 安全的 JSON 序列化
 * @param {*} obj - 要序列化的对象
 * @param {number} maxDepth - 最大深度
 * @returns {string} JSON 字符串
 */
export function safeStringify(obj, maxDepth = 10) {
  const seen = new WeakSet()
  
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]'
      }
      seen.add(value)
    }
    
    // 处理特殊类型
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      }
    }
    
    if (value instanceof RegExp) {
      return value.toString()
    }
    
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`
    }
    
    if (typeof value === 'symbol') {
      return value.toString()
    }
    
    if (typeof value === 'undefined') {
      return '[undefined]'
    }
    
    return value
  })
}

/**
 * 安全的 JSON 解析
 * @param {string} str - JSON 字符串
 * @param {*} defaultValue - 默认值
 * @returns {*} 解析后的对象
 */
export function safeParse(str, defaultValue = null) {
  try {
    return JSON.parse(str)
  } catch (e) {
    return defaultValue
  }
}

/**
 * 获取对象的指定路径的值
 * @param {Object} obj - 对象
 * @param {string} path - 路径，如 'a.b.c'
 * @param {*} defaultValue - 默认值
 * @returns {*} 值
 */
export function get(obj, path, defaultValue = undefined) {
  if (!obj || !path) {
    return defaultValue
  }
  
  const keys = path.split('.')
  let result = obj
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue
    }
    result = result[key]
  }
  
  return result === undefined ? defaultValue : result
}

/**
 * 设置对象的指定路径的值
 * @param {Object} obj - 对象
 * @param {string} path - 路径，如 'a.b.c'
 * @param {*} value - 值
 * @returns {Object} 修改后的对象
 */
export function set(obj, path, value) {
  if (!obj || !path) {
    return obj
  }
  
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
  return obj
}

/**
 * 截断字符串
 * @param {string} str - 字符串
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀
 * @returns {string} 截断后的字符串
 */
export function truncate(str, maxLength = 100, suffix = '...') {
  if (!str || str.length <= maxLength) {
    return str
  }
  return str.slice(0, maxLength - suffix.length) + suffix
}

/**
 * 格式化字节大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化时间
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化后的字符串
 */
export function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  if (ms < 3600000) {
    return `${(ms / 60000).toFixed(2)}min`
  }
  return `${(ms / 3600000).toFixed(2)}h`
}

/**
 * 格式化日期
 * @param {Date|number} date - 日期对象或时间戳
 * @param {string} format - 格式化模板
 * @returns {string} 格式化后的字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = date instanceof Date ? date : new Date(date)
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  const milliseconds = String(d.getMilliseconds()).padStart(3, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
    .replace('SSS', milliseconds)
}

/**
 * 生成随机字符串
 * @param {number} length - 长度
 * @returns {string} 随机字符串
 */
export function randomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 检查是否为空值
 * @param {*} value - 值
 * @returns {boolean}
 */
export function isEmpty(value) {
  if (value === null || value === undefined) {
    return true
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true
  }
  if (Array.isArray(value) && value.length === 0) {
    return true
  }
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return true
  }
  return false
}

/**
 * 合并对象（深度合并）
 * @param {Object} target - 目标对象
 * @param {...Object} sources - 源对象
 * @returns {Object} 合并后的对象
 */
export function merge(target, ...sources) {
  if (!sources.length) {
    return target
  }
  
  const source = sources.shift()
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} })
        }
        merge(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }
  
  return merge(target, ...sources)
}

/**
 * 检查是否为对象
 * @param {*} item - 值
 * @returns {boolean}
 */
export function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * 延迟执行
 * @param {number} ms - 毫秒数
 * @returns {Promise}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试函数
 * @param {Function} fn - 要重试的函数
 * @param {number} retries - 重试次数
 * @param {number} delay - 重试延迟(ms)
 * @returns {Promise}
 */
export async function retry(fn, retries = 3, delay = 1000) {
  let lastError
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < retries - 1) {
        await sleep(delay * (i + 1))
      }
    }
  }
  
  throw lastError
}

/**
 * 获取 URL 参数
 * @param {string} url - URL
 * @returns {Object} 参数对象
 */
export function parseQueryString(url) {
  const params = {}
  const queryString = url.split('?')[1]
  
  if (!queryString) {
    return params
  }
  
  queryString.split('&').forEach(pair => {
    const [key, value] = pair.split('=')
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
    }
  })
  
  return params
}

/**
 * 构建 URL 参数
 * @param {Object} params - 参数对象
 * @returns {string} 查询字符串
 */
export function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}
