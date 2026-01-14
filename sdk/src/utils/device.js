/**
 * @fileoverview 设备信息工具模块
 * @description 获取设备、浏览器、操作系统等信息
 */

/**
 * 生成 UUID
 * @returns {string} UUID
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 获取设备信息
 * @returns {Object} 设备信息
 */
export function getDeviceInfo() {
  const ua = navigator.userAgent
  
  return {
    type: getDeviceType(ua),
    brand: getDeviceBrand(ua),
    model: getDeviceModel(ua),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen.colorDepth,
    orientation: getOrientation(),
    language: navigator.language || navigator.userLanguage,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: navigator.deviceMemory || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  }
}

/**
 * 获取设备类型
 * @param {string} ua - User Agent
 * @returns {string} 设备类型
 */
function getDeviceType(ua) {
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet'
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

/**
 * 获取设备品牌
 * @param {string} ua - User Agent
 * @returns {string} 设备品牌
 */
function getDeviceBrand(ua) {
  const brands = [
    { pattern: /iPhone/i, brand: 'Apple' },
    { pattern: /iPad/i, brand: 'Apple' },
    { pattern: /Macintosh/i, brand: 'Apple' },
    { pattern: /Samsung/i, brand: 'Samsung' },
    { pattern: /Huawei|Honor/i, brand: 'Huawei' },
    { pattern: /Xiaomi|MI |Redmi/i, brand: 'Xiaomi' },
    { pattern: /OPPO/i, brand: 'OPPO' },
    { pattern: /vivo/i, brand: 'vivo' },
    { pattern: /OnePlus/i, brand: 'OnePlus' },
    { pattern: /Google|Pixel/i, brand: 'Google' },
    { pattern: /Windows/i, brand: 'Microsoft' },
  ]
  
  for (const { pattern, brand } of brands) {
    if (pattern.test(ua)) {
      return brand
    }
  }
  
  return 'Unknown'
}

/**
 * 获取设备型号
 * @param {string} ua - User Agent
 * @returns {string} 设备型号
 */
function getDeviceModel(ua) {
  // iPhone
  const iphoneMatch = ua.match(/iPhone\s*(\d+)?/i)
  if (iphoneMatch) {
    return iphoneMatch[0]
  }
  
  // iPad
  if (/iPad/i.test(ua)) {
    return 'iPad'
  }
  
  // Android 设备
  const androidMatch = ua.match(/;\s*([^;]+)\s+Build/i)
  if (androidMatch) {
    return androidMatch[1].trim()
  }
  
  return 'Unknown'
}

/**
 * 获取屏幕方向
 * @returns {string} 屏幕方向
 */
function getOrientation() {
  if (window.screen.orientation) {
    return window.screen.orientation.type
  }
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
}

/**
 * 获取浏览器信息
 * @returns {Object} 浏览器信息
 */
export function getBrowserInfo() {
  const ua = navigator.userAgent
  const { name, version } = parseBrowser(ua)
  
  return {
    name,
    version,
    userAgent: ua,
    vendor: navigator.vendor || '',
    platform: navigator.platform || '',
    language: navigator.language,
    languages: navigator.languages ? [...navigator.languages] : [],
    doNotTrack: navigator.doNotTrack,
    webdriver: navigator.webdriver || false,
  }
}

/**
 * 解析浏览器名称和版本
 * @param {string} ua - User Agent
 * @returns {Object} { name, version }
 */
function parseBrowser(ua) {
  const browsers = [
    { pattern: /Edg\/(\d+[\.\d]*)/, name: 'Edge' },
    { pattern: /OPR\/(\d+[\.\d]*)/, name: 'Opera' },
    { pattern: /Chrome\/(\d+[\.\d]*)/, name: 'Chrome' },
    { pattern: /Firefox\/(\d+[\.\d]*)/, name: 'Firefox' },
    { pattern: /Safari\/(\d+[\.\d]*)/, name: 'Safari', versionPattern: /Version\/(\d+[\.\d]*)/ },
    { pattern: /MSIE\s(\d+[\.\d]*)/, name: 'IE' },
    { pattern: /Trident.*rv:(\d+[\.\d]*)/, name: 'IE' },
  ]
  
  for (const { pattern, name, versionPattern } of browsers) {
    if (pattern.test(ua)) {
      const versionMatch = ua.match(versionPattern || pattern)
      return {
        name,
        version: versionMatch ? versionMatch[1] : 'Unknown',
      }
    }
  }
  
  return { name: 'Unknown', version: 'Unknown' }
}

/**
 * 获取操作系统信息
 * @returns {Object} 操作系统信息
 */
export function getOSInfo() {
  const ua = navigator.userAgent
  const { name, version } = parseOS(ua)
  
  return {
    name,
    version,
  }
}

/**
 * 解析操作系统名称和版本
 * @param {string} ua - User Agent
 * @returns {Object} { name, version }
 */
function parseOS(ua) {
  const systems = [
    { pattern: /Windows NT (\d+[\.\d]*)/, name: 'Windows', versionMap: {
      '10.0': '10',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.1': 'XP',
    }},
    { pattern: /Mac OS X (\d+[_\.\d]*)/, name: 'macOS' },
    { pattern: /Android (\d+[\.\d]*)/, name: 'Android' },
    { pattern: /iPhone OS (\d+[_\.\d]*)/, name: 'iOS' },
    { pattern: /iPad.*OS (\d+[_\.\d]*)/, name: 'iPadOS' },
    { pattern: /Linux/, name: 'Linux', version: '' },
    { pattern: /CrOS/, name: 'Chrome OS', version: '' },
  ]
  
  for (const { pattern, name, versionMap } of systems) {
    const match = ua.match(pattern)
    if (match) {
      let version = match[1] || ''
      version = version.replace(/_/g, '.')
      
      if (versionMap && versionMap[version]) {
        version = versionMap[version]
      }
      
      return { name, version }
    }
  }
  
  return { name: 'Unknown', version: 'Unknown' }
}

/**
 * 获取网络信息
 * @returns {Object} 网络信息
 */
export function getNetworkInfo() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  
  if (!connection) {
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false,
    }
  }
  
  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false,
  }
}

/**
 * 获取性能信息
 * @returns {Object} 性能信息
 */
export function getPerformanceInfo() {
  if (!window.performance) {
    return null
  }
  
  const memory = window.performance.memory
  
  return {
    memory: memory ? {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
    } : null,
    navigation: {
      type: window.performance.navigation?.type,
      redirectCount: window.performance.navigation?.redirectCount,
    },
  }
}

/**
 * 获取页面可见性状态
 * @returns {string} 可见性状态
 */
export function getVisibilityState() {
  return document.visibilityState || 'visible'
}

/**
 * 检测是否为爬虫
 * @returns {boolean}
 */
export function isBot() {
  const botPatterns = [
    /bot/i,
    /spider/i,
    /crawl/i,
    /slurp/i,
    /mediapartners/i,
    /googlebot/i,
    /bingbot/i,
    /yandex/i,
    /baidu/i,
  ]
  
  const ua = navigator.userAgent
  return botPatterns.some(pattern => pattern.test(ua))
}

/**
 * 获取指纹信息（简化版）
 * @returns {string} 指纹哈希
 */
export function getFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    window.screen.width,
    window.screen.height,
    window.screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency,
    navigator.deviceMemory,
  ]
  
  const str = components.join('|')
  return hashCode(str)
}

/**
 * 简单哈希函数
 * @param {string} str - 输入字符串
 * @returns {string} 哈希值
 */
function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}
