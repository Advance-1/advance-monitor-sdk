/**
 * @fileoverview SDK 配置管理模块
 * @description 统一管理 SDK 配置，支持默认配置、用户配置合并、配置校验
 */

// 默认配置
const DEFAULT_CONFIG = {
  // 基础配置
  dsn: '',                          // 数据上报地址
  appId: '',                        // 应用唯一标识
  appVersion: '',                   // 应用版本号
  environment: 'production',        // 环境标识: development | staging | production
  release: '',                      // 发布版本
  
  // 用户信息
  userId: '',                       // 用户ID
  userInfo: null,                   // 用户扩展信息
  
  // 采样配置
  sampleRate: 1.0,                  // 全局采样率 0-1
  errorSampleRate: 1.0,             // 错误采样率
  performanceSampleRate: 0.1,       // 性能采样率
  behaviorSampleRate: 0.5,          // 行为采样率
  
  // 功能开关
  enableError: true,                // 错误监控
  enablePerformance: true,          // 性能监控
  enableBehavior: true,             // 用户行为监控
  enableNetwork: true,              // 网络请求监控
  enableResource: true,             // 资源加载监控
  enableBlankScreen: true,          // 白屏检测
  enableCrash: true,                // 崩溃检测
  enableLongTask: true,             // 长任务监控
  enableMemory: true,               // 内存监控
  
  // 上报配置
  maxBreadcrumbs: 100,              // 最大面包屑数量
  maxQueueSize: 100,                // 最大队列长度
  flushInterval: 5000,              // 批量上报间隔(ms)
  maxRetries: 3,                    // 最大重试次数
  retryDelay: 1000,                 // 重试延迟(ms)
  timeout: 10000,                   // 请求超时时间(ms)
  
  // 过滤配置
  ignoreErrors: [],                 // 忽略的错误信息正则
  ignoreUrls: [],                   // 忽略的URL正则
  denyUrls: [],                     // 拒绝上报的URL正则
  allowUrls: [],                    // 允许上报的URL正则
  
  // 钩子函数
  beforeSend: null,                 // 发送前钩子 (event) => event | null
  beforeBreadcrumb: null,           // 面包屑钩子 (breadcrumb) => breadcrumb | null
  onError: null,                    // 错误回调
  
  // 调试配置
  debug: false,                     // 调试模式
  silent: false,                    // 静默模式，不输出任何日志
  
  // SourceMap 配置
  sourceMapUrl: '',                 // SourceMap 服务地址
  enableSourceMap: true,            // 是否启用 SourceMap 解析
  
  // 扩展配置
  extra: {},                        // 自定义扩展数据
  tags: {},                         // 自定义标签
}

// 必填字段
const REQUIRED_FIELDS = ['dsn', 'appId']

// 配置校验规则
const CONFIG_VALIDATORS = {
  dsn: (value) => typeof value === 'string' && value.length > 0,
  appId: (value) => typeof value === 'string' && value.length > 0,
  sampleRate: (value) => typeof value === 'number' && value >= 0 && value <= 1,
  errorSampleRate: (value) => typeof value === 'number' && value >= 0 && value <= 1,
  performanceSampleRate: (value) => typeof value === 'number' && value >= 0 && value <= 1,
  behaviorSampleRate: (value) => typeof value === 'number' && value >= 0 && value <= 1,
  maxBreadcrumbs: (value) => typeof value === 'number' && value > 0,
  maxQueueSize: (value) => typeof value === 'number' && value > 0,
  flushInterval: (value) => typeof value === 'number' && value >= 0,
  maxRetries: (value) => typeof value === 'number' && value >= 0,
  timeout: (value) => typeof value === 'number' && value > 0,
  beforeSend: (value) => value === null || typeof value === 'function',
  beforeBreadcrumb: (value) => value === null || typeof value === 'function',
  onError: (value) => value === null || typeof value === 'function',
}

/**
 * 配置管理器
 */
class ConfigManager {
  constructor() {
    this._config = { ...DEFAULT_CONFIG }
    this._initialized = false
  }

  /**
   * 初始化配置
   * @param {Object} userConfig - 用户配置
   * @returns {Object} 合并后的配置
   */
  init(userConfig = {}) {
    // 合并配置
    this._config = this._mergeConfig(DEFAULT_CONFIG, userConfig)
    
    // 校验配置
    this._validateConfig(this._config)
    
    // 从本地存储恢复部分配置
    this._loadFromStorage()
    
    this._initialized = true
    
    return this._config
  }

  /**
   * 获取配置
   * @param {string} key - 配置键名，不传则返回全部配置
   * @returns {*} 配置值
   */
  get(key) {
    if (key) {
      return this._config[key]
    }
    return { ...this._config }
  }

  /**
   * 设置配置
   * @param {string|Object} key - 配置键名或配置对象
   * @param {*} value - 配置值
   */
  set(key, value) {
    if (typeof key === 'object') {
      Object.keys(key).forEach(k => {
        this._setConfigValue(k, key[k])
      })
    } else {
      this._setConfigValue(key, value)
    }
    
    // 持久化部分配置
    this._saveToStorage()
  }

  /**
   * 设置单个配置值
   * @private
   */
  _setConfigValue(key, value) {
    // 校验配置值
    if (CONFIG_VALIDATORS[key] && !CONFIG_VALIDATORS[key](value)) {
      console.warn(`[AdvanceMonitor] Invalid config value for "${key}":`, value)
      return
    }
    this._config[key] = value
  }

  /**
   * 深度合并配置
   * @private
   */
  _mergeConfig(defaultConfig, userConfig) {
    const result = { ...defaultConfig }
    
    Object.keys(userConfig).forEach(key => {
      const value = userConfig[key]
      
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          result[key] = this._mergeConfig(result[key] || {}, value)
        } else {
          result[key] = value
        }
      }
    })
    
    return result
  }

  /**
   * 校验配置
   * @private
   */
  _validateConfig(config) {
    // 检查必填字段
    REQUIRED_FIELDS.forEach(field => {
      if (!config[field]) {
        throw new Error(`[AdvanceMonitor] Missing required config: ${field}`)
      }
    })

    // 校验配置值
    Object.keys(CONFIG_VALIDATORS).forEach(key => {
      if (config[key] !== undefined && !CONFIG_VALIDATORS[key](config[key])) {
        throw new Error(`[AdvanceMonitor] Invalid config value for "${key}": ${config[key]}`)
      }
    })
  }

  /**
   * 从本地存储加载配置
   * @private
   */
  _loadFromStorage() {
    try {
      const stored = localStorage.getItem('__advance_monitor_config__')
      if (stored) {
        const parsed = JSON.parse(stored)
        // 只恢复部分配置
        if (parsed.userId) this._config.userId = parsed.userId
        if (parsed.userInfo) this._config.userInfo = parsed.userInfo
      }
    } catch (e) {
      // 忽略存储错误
    }
  }

  /**
   * 保存配置到本地存储
   * @private
   */
  _saveToStorage() {
    try {
      const toStore = {
        userId: this._config.userId,
        userInfo: this._config.userInfo,
      }
      localStorage.setItem('__advance_monitor_config__', JSON.stringify(toStore))
    } catch (e) {
      // 忽略存储错误
    }
  }

  /**
   * 重置配置
   */
  reset() {
    this._config = { ...DEFAULT_CONFIG }
    this._initialized = false
    try {
      localStorage.removeItem('__advance_monitor_config__')
    } catch (e) {
      // 忽略存储错误
    }
  }

  /**
   * 是否已初始化
   */
  isInitialized() {
    return this._initialized
  }
}

// 导出单例
export const configManager = new ConfigManager()

// 导出默认配置供参考
export { DEFAULT_CONFIG }
