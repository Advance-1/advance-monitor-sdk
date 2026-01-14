/**
 * @fileoverview 工具函数
 */

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 格式化时间
 */
export function formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!time) return '-'
  return dayjs(time).format(format)
}

/**
 * 相对时间
 */
export function fromNow(time) {
  if (!time) return '-'
  return dayjs(time).fromNow()
}

/**
 * 格式化数字
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * 格式化字节
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化毫秒
 */
export function formatMs(ms) {
  if (ms === null || ms === undefined) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60000).toFixed(2)}min`
}

/**
 * 获取错误级别颜色
 */
export function getLevelColor(level) {
  const colors = {
    debug: '#86909C',
    info: '#165DFF',
    warning: '#FF7D00',
    error: '#F53F3F',
    critical: '#CB2634',
  }
  return colors[level] || colors.info
}

/**
 * 获取错误级别背景色
 */
export function getLevelBgColor(level) {
  const colors = {
    debug: '#F7F8FA',
    info: '#E8F3FF',
    warning: '#FFF7E8',
    error: '#FFECE8',
    critical: '#FFECE8',
  }
  return colors[level] || colors.info
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status) {
  const colors = {
    unresolved: '#F53F3F',
    resolved: '#00B42A',
    ignored: '#86909C',
  }
  return colors[status] || '#86909C'
}

/**
 * 获取性能评级颜色
 */
export function getRatingColor(rating) {
  const colors = {
    good: '#00B42A',
    'needs-improvement': '#FF7D00',
    poor: '#F53F3F',
  }
  return colors[rating] || '#86909C'
}

/**
 * 截断字符串
 */
export function truncate(str, maxLength = 100) {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy:', error)
    return false
  }
}

/**
 * 防抖
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流
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
 * 解析错误堆栈
 */
export function parseStack(stack) {
  if (!stack) return []
  
  const lines = stack.split('\n')
  const frames = []
  
  for (const line of lines) {
    const match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/)
    if (match) {
      frames.push({
        function: match[1] || '<anonymous>',
        file: match[2],
        line: parseInt(match[3], 10),
        column: parseInt(match[4], 10),
      })
    }
  }
  
  return frames
}

/**
 * 生成唯一 ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * 深拷贝
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (obj instanceof Object) {
    const copy = {}
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone(obj[key])
    })
    return copy
  }
  return obj
}

/**
 * 获取 URL 参数
 */
export function getQueryParams(url) {
  const params = {}
  const queryString = url.split('?')[1]
  if (!queryString) return params
  
  queryString.split('&').forEach(pair => {
    const [key, value] = pair.split('=')
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
    }
  })
  
  return params
}
