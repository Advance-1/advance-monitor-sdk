/**
 * @fileoverview SourceMap 解析服务
 * @description 服务端解析 SourceMap，还原压缩后的错误堆栈
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// SourceMap 存储目录
const SOURCEMAP_DIR = path.join(__dirname, 'data', 'sourcemaps')

/**
 * 简单的 SourceMap 解析器
 * 生产环境建议使用 source-map 库
 */
class SourceMapParser {
  constructor() {
    this._cache = new Map()
  }

  /**
   * 保存 SourceMap 文件
   * @param {Object} options - 保存选项
   */
  async saveSourceMap(options) {
    const { release, appId, filename, sourcemap } = options
    
    // 创建目录结构: sourcemaps/{appId}/{release}/
    const dir = path.join(SOURCEMAP_DIR, appId, release)
    await fs.mkdir(dir, { recursive: true })
    
    // 保存 sourcemap 文件
    const filePath = path.join(dir, `${filename}.map`)
    await fs.writeFile(filePath, JSON.stringify(sourcemap, null, 2))
    
    // 保存元数据
    const metaPath = path.join(dir, 'meta.json')
    let meta = {}
    try {
      const existing = await fs.readFile(metaPath, 'utf-8')
      meta = JSON.parse(existing)
    } catch (e) {
      // 文件不存在
    }
    
    meta[filename] = {
      uploadedAt: Date.now(),
      file: sourcemap.file,
      sources: sourcemap.sources,
    }
    
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))
    
    // 清除缓存
    this._cache.delete(`${appId}/${release}/${filename}`)
    
    return { success: true, path: filePath }
  }

  /**
   * 加载 SourceMap
   * @param {string} appId - 应用 ID
   * @param {string} release - 版本号
   * @param {string} filename - 文件名
   */
  async loadSourceMap(appId, release, filename) {
    const cacheKey = `${appId}/${release}/${filename}`
    
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey)
    }
    
    const filePath = path.join(SOURCEMAP_DIR, appId, release, `${filename}.map`)
    
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const sourcemap = JSON.parse(content)
      this._cache.set(cacheKey, sourcemap)
      return sourcemap
    } catch (e) {
      return null
    }
  }

  /**
   * 解析错误位置
   * @param {Object} options - 解析选项
   * @param {string} options.appId - 应用 ID
   * @param {string} options.release - 版本号
   * @param {string} options.filename - 文件名
   * @param {number} options.line - 行号
   * @param {number} options.column - 列号
   */
  async parsePosition(options) {
    const { appId, release, filename, line, column } = options
    
    // 从文件名中提取基础名
    const baseName = path.basename(filename).replace(/\?.*$/, '')
    
    const sourcemap = await this.loadSourceMap(appId, release, baseName)
    
    if (!sourcemap) {
      return {
        success: false,
        original: { filename, line, column },
        error: 'SourceMap not found',
      }
    }
    
    try {
      const position = this._findOriginalPosition(sourcemap, line, column)
      
      if (position) {
        return {
          success: true,
          original: { filename, line, column },
          source: position,
        }
      }
      
      return {
        success: false,
        original: { filename, line, column },
        error: 'Position not found in sourcemap',
      }
    } catch (e) {
      return {
        success: false,
        original: { filename, line, column },
        error: e.message,
      }
    }
  }

  /**
   * 解析完整的错误堆栈
   * @param {Object} options - 解析选项
   * @param {string} options.appId - 应用 ID
   * @param {string} options.release - 版本号
   * @param {Array} options.frames - 堆栈帧数组
   */
  async parseStack(options) {
    const { appId, release, frames } = options
    
    if (!frames || !Array.isArray(frames)) {
      return { success: false, frames: [], error: 'Invalid frames' }
    }
    
    const parsedFrames = []
    
    for (const frame of frames) {
      const result = await this.parsePosition({
        appId,
        release,
        filename: frame.filename,
        line: frame.lineno,
        column: frame.colno,
      })
      
      if (result.success) {
        parsedFrames.push({
          ...frame,
          original: result.source,
          parsed: true,
        })
      } else {
        parsedFrames.push({
          ...frame,
          parsed: false,
          parseError: result.error,
        })
      }
    }
    
    return {
      success: true,
      frames: parsedFrames,
    }
  }

  /**
   * VLQ 解码
   * @private
   */
  _decodeVLQ(encoded) {
    const charToInt = {}
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach((char, i) => {
      charToInt[char] = i
    })
    
    const decoded = []
    let shift = 0
    let value = 0
    
    for (const char of encoded) {
      const integer = charToInt[char]
      if (integer === undefined) continue
      
      const hasContinuation = integer & 32
      value += (integer & 31) << shift
      
      if (hasContinuation) {
        shift += 5
      } else {
        const shouldNegate = value & 1
        value >>= 1
        decoded.push(shouldNegate ? -value : value)
        value = 0
        shift = 0
      }
    }
    
    return decoded
  }

  /**
   * 解析 mappings 字符串
   * @private
   */
  _parseMappings(mappings, sources, names) {
    const lines = mappings.split(';')
    const result = []
    
    let generatedLine = 0
    let sourceIndex = 0
    let sourceLine = 0
    let sourceColumn = 0
    let nameIndex = 0
    
    for (const line of lines) {
      generatedLine++
      let generatedColumn = 0
      
      if (!line) continue
      
      const segments = line.split(',')
      
      for (const segment of segments) {
        if (!segment) continue
        
        const decoded = this._decodeVLQ(segment)
        
        if (decoded.length >= 1) {
          generatedColumn += decoded[0]
        }
        
        if (decoded.length >= 4) {
          sourceIndex += decoded[1]
          sourceLine += decoded[2]
          sourceColumn += decoded[3]
          
          result.push({
            generatedLine,
            generatedColumn,
            sourceIndex,
            sourceLine: sourceLine + 1, // 1-indexed
            sourceColumn,
            source: sources[sourceIndex],
            name: decoded.length >= 5 ? names[nameIndex += decoded[4]] : null,
          })
        }
      }
    }
    
    return result
  }

  /**
   * 查找原始位置
   * @private
   */
  _findOriginalPosition(sourcemap, line, column) {
    const { mappings, sources, names, sourcesContent } = sourcemap
    
    if (!mappings) return null
    
    const parsed = this._parseMappings(mappings, sources || [], names || [])
    
    // 查找最接近的映射
    let closest = null
    let closestDistance = Infinity
    
    for (const mapping of parsed) {
      if (mapping.generatedLine === line) {
        const distance = Math.abs(mapping.generatedColumn - column)
        if (distance < closestDistance) {
          closestDistance = distance
          closest = mapping
        }
      }
    }
    
    if (!closest) return null
    
    // 获取源代码上下文
    let sourceContext = null
    if (sourcesContent && sourcesContent[closest.sourceIndex]) {
      const content = sourcesContent[closest.sourceIndex]
      const lines = content.split('\n')
      const startLine = Math.max(0, closest.sourceLine - 4)
      const endLine = Math.min(lines.length, closest.sourceLine + 3)
      
      sourceContext = {
        lines: lines.slice(startLine, endLine).map((text, i) => ({
          lineNumber: startLine + i + 1,
          text,
          isTarget: startLine + i + 1 === closest.sourceLine,
        })),
      }
    }
    
    return {
      source: closest.source,
      line: closest.sourceLine,
      column: closest.sourceColumn,
      name: closest.name,
      context: sourceContext,
    }
  }

  /**
   * 获取版本列表
   * @param {string} appId - 应用 ID
   */
  async getReleases(appId) {
    const dir = path.join(SOURCEMAP_DIR, appId)
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      const releases = []
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metaPath = path.join(dir, entry.name, 'meta.json')
          try {
            const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
            releases.push({
              version: entry.name,
              files: Object.keys(meta),
              uploadedAt: Math.max(...Object.values(meta).map(m => m.uploadedAt)),
            })
          } catch (e) {
            releases.push({
              version: entry.name,
              files: [],
              uploadedAt: 0,
            })
          }
        }
      }
      
      return releases.sort((a, b) => b.uploadedAt - a.uploadedAt)
    } catch (e) {
      return []
    }
  }

  /**
   * 删除版本的 SourceMap
   * @param {string} appId - 应用 ID
   * @param {string} release - 版本号
   */
  async deleteRelease(appId, release) {
    const dir = path.join(SOURCEMAP_DIR, appId, release)
    
    try {
      await fs.rm(dir, { recursive: true })
      
      // 清除缓存
      for (const key of this._cache.keys()) {
        if (key.startsWith(`${appId}/${release}/`)) {
          this._cache.delete(key)
        }
      }
      
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }
}

// 导出单例
export const sourceMapParser = new SourceMapParser()
