/**
 * @fileoverview 面包屑管理模块
 * @description 记录用户操作轨迹，用于错误追溯和行为分析
 */

import { configManager } from './config.js'

// 面包屑类型
export const BreadcrumbTypes = {
  // 用户交互
  CLICK: 'click',
  INPUT: 'input',
  SCROLL: 'scroll',
  TOUCH: 'touch',
  KEYBOARD: 'keyboard',
  
  // 导航
  NAVIGATION: 'navigation',
  ROUTE_CHANGE: 'route_change',
  
  // 网络请求
  XHR: 'xhr',
  FETCH: 'fetch',
  
  // 控制台
  CONSOLE: 'console',
  
  // 错误
  ERROR: 'error',
  UNHANDLED_REJECTION: 'unhandled_rejection',
  
  // 资源
  RESOURCE: 'resource',
  
  // 自定义
  CUSTOM: 'custom',
  
  // 生命周期
  LIFECYCLE: 'lifecycle',
}

// 面包屑级别
export const BreadcrumbLevels = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
}

/**
 * 面包屑管理器
 */
class BreadcrumbManager {
  constructor() {
    this._breadcrumbs = []
    this._maxBreadcrumbs = 100
  }

  /**
   * 初始化
   * @param {Object} config - SDK 配置
   */
  init(config) {
    this._maxBreadcrumbs = config.maxBreadcrumbs || 100
    this._breadcrumbs = []
  }

  /**
   * 添加面包屑
   * @param {Object} breadcrumb - 面包屑数据
   * @returns {Object|null} 添加的面包屑或 null
   */
  add(breadcrumb) {
    const config = configManager.get()
    
    // 构建完整的面包屑
    const fullBreadcrumb = {
      type: breadcrumb.type || BreadcrumbTypes.CUSTOM,
      category: breadcrumb.category || 'default',
      level: breadcrumb.level || BreadcrumbLevels.INFO,
      message: breadcrumb.message || '',
      data: breadcrumb.data || null,
      timestamp: breadcrumb.timestamp || Date.now(),
    }

    // 执行钩子函数
    if (config.beforeBreadcrumb) {
      const processed = config.beforeBreadcrumb(fullBreadcrumb)
      if (processed === null || processed === false) {
        return null
      }
      Object.assign(fullBreadcrumb, processed)
    }

    // 添加到队列
    this._breadcrumbs.push(fullBreadcrumb)

    // 限制队列长度
    if (this._breadcrumbs.length > this._maxBreadcrumbs) {
      this._breadcrumbs.shift()
    }

    return fullBreadcrumb
  }

  /**
   * 获取所有面包屑
   * @returns {Array} 面包屑数组
   */
  getAll() {
    return [...this._breadcrumbs]
  }

  /**
   * 获取最近 N 条面包屑
   * @param {number} count - 数量
   * @returns {Array} 面包屑数组
   */
  getLast(count) {
    return this._breadcrumbs.slice(-count)
  }

  /**
   * 清空面包屑
   */
  clear() {
    this._breadcrumbs = []
  }

  /**
   * 获取面包屑数量
   */
  count() {
    return this._breadcrumbs.length
  }

  /**
   * 添加点击面包屑
   */
  addClick(target, data = {}) {
    return this.add({
      type: BreadcrumbTypes.CLICK,
      category: 'ui',
      level: BreadcrumbLevels.INFO,
      message: `Click on ${target}`,
      data: {
        target,
        ...data,
      },
    })
  }

  /**
   * 添加导航面包屑
   */
  addNavigation(from, to, data = {}) {
    return this.add({
      type: BreadcrumbTypes.NAVIGATION,
      category: 'navigation',
      level: BreadcrumbLevels.INFO,
      message: `Navigate from ${from} to ${to}`,
      data: {
        from,
        to,
        ...data,
      },
    })
  }

  /**
   * 添加网络请求面包屑
   */
  addRequest(method, url, status, data = {}) {
    const level = status >= 400 ? BreadcrumbLevels.ERROR : BreadcrumbLevels.INFO
    return this.add({
      type: BreadcrumbTypes.XHR,
      category: 'http',
      level,
      message: `${method} ${url} [${status}]`,
      data: {
        method,
        url,
        status,
        ...data,
      },
    })
  }

  /**
   * 添加控制台面包屑
   */
  addConsole(level, message, data = {}) {
    const breadcrumbLevel = {
      log: BreadcrumbLevels.DEBUG,
      info: BreadcrumbLevels.INFO,
      warn: BreadcrumbLevels.WARNING,
      error: BreadcrumbLevels.ERROR,
    }[level] || BreadcrumbLevels.INFO

    return this.add({
      type: BreadcrumbTypes.CONSOLE,
      category: 'console',
      level: breadcrumbLevel,
      message: String(message),
      data: {
        level,
        ...data,
      },
    })
  }

  /**
   * 添加错误面包屑
   */
  addError(error, data = {}) {
    return this.add({
      type: BreadcrumbTypes.ERROR,
      category: 'error',
      level: BreadcrumbLevels.ERROR,
      message: error.message || String(error),
      data: {
        name: error.name,
        stack: error.stack,
        ...data,
      },
    })
  }

  /**
   * 添加自定义面包屑
   */
  addCustom(message, data = {}, level = BreadcrumbLevels.INFO) {
    return this.add({
      type: BreadcrumbTypes.CUSTOM,
      category: 'custom',
      level,
      message,
      data,
    })
  }
}

// 导出单例
export const breadcrumbManager = new BreadcrumbManager()
