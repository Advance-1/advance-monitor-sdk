/**
 * @fileoverview Vite 插件 - 自动上传 SourceMap
 * @description 在构建完成后自动上传 SourceMap 到监控服务器
 * @usage
 * // vite.config.js
 * import { advanceMonitorPlugin } from 'advance-monitor-sdk/plugins/vite-plugin'
 * 
 * export default {
 *   plugins: [
 *     advanceMonitorPlugin({
 *       release: '1.0.0',
 *       appId: 'my-app',
 *       uploadUrl: 'http://localhost:8080/api/sourcemaps',
 *     })
 *   ]
 * }
 */

import fs from 'fs'
import path from 'path'

/**
 * Advance Monitor Vite 插件
 * @param {Object} options - 插件选项
 * @param {string} options.release - 发布版本号
 * @param {string} options.appId - 应用 ID
 * @param {string} options.uploadUrl - SourceMap 上传地址
 * @param {boolean} options.deleteAfterUpload - 上传后删除 sourcemap 文件
 * @param {boolean} options.silent - 静默模式
 * @param {string[]} options.include - 包含的文件模式
 * @param {string[]} options.exclude - 排除的文件模式
 */
export function advanceMonitorPlugin(options = {}) {
  const {
    release,
    appId,
    uploadUrl = 'http://localhost:8080/api/sourcemaps',
    deleteAfterUpload = true,
    silent = false,
    include = ['**/*.js.map'],
    exclude = ['**/node_modules/**'],
  } = options

  let outputDir = ''

  const log = (message) => {
    if (!silent) {
      console.log(`[AdvanceMonitor] ${message}`)
    }
  }

  const error = (message) => {
    console.error(`[AdvanceMonitor] ${message}`)
  }

  return {
    name: 'advance-monitor-sourcemap-upload',
    apply: 'build',

    configResolved(config) {
      outputDir = config.build.outDir
    },

    async closeBundle() {
      if (!release) {
        error('Missing required option: release')
        return
      }

      if (!appId) {
        error('Missing required option: appId')
        return
      }

      log(`Starting sourcemap upload for release: ${release}`)

      const sourcemapFiles = findSourceMaps(outputDir, include, exclude)

      if (sourcemapFiles.length === 0) {
        log('No sourcemap files found')
        return
      }

      log(`Found ${sourcemapFiles.length} sourcemap file(s)`)

      let successCount = 0
      let failCount = 0

      for (const filePath of sourcemapFiles) {
        const filename = path.basename(filePath).replace('.map', '')
        
        try {
          await uploadSourceMap({
            filePath,
            filename,
            release,
            appId,
            uploadUrl,
          })
          
          successCount++
          log(`✓ Uploaded: ${filename}`)

          if (deleteAfterUpload) {
            fs.unlinkSync(filePath)
            log(`  Deleted: ${path.basename(filePath)}`)
          }
        } catch (err) {
          failCount++
          error(`✗ Failed to upload ${filename}: ${err.message}`)
        }
      }

      log(`Upload complete: ${successCount} succeeded, ${failCount} failed`)
    },
  }
}

/**
 * 查找 SourceMap 文件
 */
function findSourceMaps(dir, include, exclude) {
  const files = []

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return

    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      const relativePath = path.relative(dir, fullPath)

      // 检查排除模式
      if (exclude.some(pattern => matchPattern(relativePath, pattern))) {
        continue
      }

      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.name.endsWith('.map')) {
        // 检查包含模式
        if (include.some(pattern => matchPattern(relativePath, pattern))) {
          files.push(fullPath)
        }
      }
    }
  }

  walk(dir)
  return files
}

/**
 * 简单的 glob 模式匹配
 */
function matchPattern(filepath, pattern) {
  // 简化的 glob 匹配
  const regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{GLOBSTAR}}/g, '.*')
    .replace(/\?/g, '.')

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(filepath)
}

/**
 * 上传 SourceMap 文件
 */
async function uploadSourceMap({ filePath, filename, release, appId, uploadUrl }) {
  const content = fs.readFileSync(filePath, 'utf-8')

  // 验证 JSON 格式
  let sourcemap
  try {
    sourcemap = JSON.parse(content)
  } catch (e) {
    throw new Error('Invalid sourcemap JSON')
  }

  const formData = new FormData()
  formData.append('release', release)
  formData.append('appId', appId)
  formData.append('filename', filename)
  formData.append('sourcemap', new Blob([content], { type: 'application/json' }), `${filename}.map`)

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  return response.json()
}

export default advanceMonitorPlugin
