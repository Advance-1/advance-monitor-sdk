/**
 * @fileoverview SourceMap 管理模块
 * @description 支持 SourceMap 上传、存储和错误堆栈解析
 */

import { configManager } from './config.js'

/**
 * SourceMap 管理器
 */
class SourceMapManager {
  constructor() {
    this._cache = new Map() // 缓存已加载的 sourcemap
  }

  /**
   * 上传 SourceMap 文件
   * @param {Object} options - 上传选项
   * @param {string} options.release - 发布版本号
   * @param {File|Blob|string} options.sourceMap - SourceMap 内容
   * @param {string} options.filename - 原始文件名
   * @param {string} options.url - 原始文件 URL
   * @returns {Promise<Object>} 上传结果
   */
  async upload(options) {
    const config = configManager.get()
    const { release, sourceMap, filename, url } = options

    if (!release) {
      throw new Error('[AdvanceMonitor] Release version is required for sourcemap upload')
    }

    const uploadUrl = config.sourceMapUploadUrl || `${config.dsn.replace('/tracker', '')}/sourcemaps`

    const formData = new FormData()
    formData.append('release', release)
    formData.append('appId', config.appId)
    formData.append('filename', filename)
    formData.append('url', url || filename)

    // 处理 sourceMap 内容
    if (typeof sourceMap === 'string') {
      formData.append('sourcemap', new Blob([sourceMap], { type: 'application/json' }), `${filename}.map`)
    } else {
      formData.append('sourcemap', sourceMap, `${filename}.map`)
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`[AdvanceMonitor] Failed to upload sourcemap: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * 批量上传 SourceMap
   * @param {Object} options - 上传选项
   * @param {string} options.release - 发布版本号
   * @param {Array<{filename: string, sourceMap: string|Blob}>} options.files - 文件列表
   * @returns {Promise<Array>} 上传结果
   */
  async uploadBatch(options) {
    const { release, files } = options
    const results = []

    for (const file of files) {
      try {
        const result = await this.upload({
          release,
          sourceMap: file.sourceMap,
          filename: file.filename,
          url: file.url,
        })
        results.push({ filename: file.filename, success: true, result })
      } catch (error) {
        results.push({ filename: file.filename, success: false, error: error.message })
      }
    }

    return results
  }

  /**
   * 解析错误堆栈（客户端简单解析，完整解析在服务端）
   * @param {Error} error - 错误对象
   * @returns {Object} 解析后的堆栈信息
   */
  parseStack(error) {
    if (!error || !error.stack) {
      return { frames: [], raw: '' }
    }

    const stack = error.stack
    const frames = []
    const lines = stack.split('\n')

    for (const line of lines) {
      // 匹配标准格式: at functionName (filename:line:column)
      const match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/)
      if (match) {
        frames.push({
          function: match[1] || '<anonymous>',
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
          raw: line.trim(),
        })
      }
    }

    return {
      frames,
      raw: stack,
      message: error.message,
      name: error.name,
    }
  }

  /**
   * 创建错误报告（包含位置信息，供服务端解析）
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 错误报告
   */
  createErrorReport(error, context = {}) {
    const config = configManager.get()
    const parsed = this.parseStack(error)

    return {
      message: error.message,
      name: error.name,
      stack: parsed,
      release: config.release || config.appVersion,
      appId: config.appId,
      environment: config.environment,
      context,
      timestamp: Date.now(),
    }
  }
}

// 导出单例
export const sourceMapManager = new SourceMapManager()
