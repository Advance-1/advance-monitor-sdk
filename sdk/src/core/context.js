/**
 * @fileoverview 上下文管理模块
 * @description 收集和管理运行时上下文信息，包括设备、浏览器、页面等
 */

import { generateUUID, getDeviceInfo, getBrowserInfo, getOSInfo } from '../utils/device.js'

/**
 * 上下文管理器
 */
class ContextManager {
  constructor() {
    this._context = {}
    this._sessionId = null
    this._pageLoadTime = null
  }

  /**
   * 初始化上下文
   * @param {Object} config - SDK 配置
   */
  init(config) {
    this._sessionId = this._getOrCreateSessionId()
    this._pageLoadTime = Date.now()
    
    this._context = {
      // SDK 信息
      sdk: {
        name: 'advance-monitor-sdk',
        version: '__SDK_VERSION__',
      },
      
      // 应用信息
      app: {
        id: config.appId,
        version: config.appVersion,
        environment: config.environment,
        release: config.release,
      },
      
      // 设备信息
      device: getDeviceInfo(),
      
      // 浏览器信息
      browser: getBrowserInfo(),
      
      // 操作系统信息
      os: getOSInfo(),
      
      // 会话信息
      session: {
        id: this._sessionId,
        startTime: this._pageLoadTime,
      },
      
      // 用户信息
      user: {
        id: config.userId || '',
        info: config.userInfo || null,
      },
      
      // 页面信息（动态获取）
      page: null,
      
      // 自定义标签和扩展
      tags: config.tags || {},
      extra: config.extra || {},
    }
  }

  /**
   * 获取完整上下文
   * @returns {Object} 上下文对象
   */
  getContext() {
    return {
      ...this._context,
      page: this._getPageContext(),
      timestamp: Date.now(),
    }
  }

  /**
   * 获取页面上下文
   * @private
   */
  _getPageContext() {
    return {
      url: window.location.href,
      path: window.location.pathname,
      query: window.location.search,
      hash: window.location.hash,
      title: document.title,
      referrer: document.referrer,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    }
  }

  /**
   * 获取或创建会话ID
   * @private
   */
  _getOrCreateSessionId() {
    const SESSION_KEY = '__advance_monitor_session__'
    const SESSION_TIMEOUT = 30 * 60 * 1000 // 30分钟
    
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) {
        const { id, timestamp } = JSON.parse(stored)
        // 检查会话是否过期
        if (Date.now() - timestamp < SESSION_TIMEOUT) {
          // 更新时间戳
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            id,
            timestamp: Date.now(),
          }))
          return id
        }
      }
    } catch (e) {
      // 忽略存储错误
    }
    
    // 创建新会话
    const newId = generateUUID()
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        id: newId,
        timestamp: Date.now(),
      }))
    } catch (e) {
      // 忽略存储错误
    }
    
    return newId
  }

  /**
   * 设置用户信息
   * @param {Object} user - 用户信息
   */
  setUser(user) {
    this._context.user = {
      id: user.id || user.userId || '',
      info: user,
    }
  }

  /**
   * 设置自定义标签
   * @param {string|Object} key - 标签键名或标签对象
   * @param {*} value - 标签值
   */
  setTag(key, value) {
    if (typeof key === 'object') {
      this._context.tags = { ...this._context.tags, ...key }
    } else {
      this._context.tags[key] = value
    }
  }

  /**
   * 设置扩展数据
   * @param {string|Object} key - 扩展键名或扩展对象
   * @param {*} value - 扩展值
   */
  setExtra(key, value) {
    if (typeof key === 'object') {
      this._context.extra = { ...this._context.extra, ...key }
    } else {
      this._context.extra[key] = value
    }
  }

  /**
   * 获取会话ID
   */
  getSessionId() {
    return this._sessionId
  }

  /**
   * 获取页面加载时间
   */
  getPageLoadTime() {
    return this._pageLoadTime
  }

  /**
   * 重置上下文
   */
  reset() {
    this._context = {}
    this._sessionId = null
    this._pageLoadTime = null
  }
}

// 导出单例
export const contextManager = new ContextManager()
