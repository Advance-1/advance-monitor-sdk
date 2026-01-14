#!/usr/bin/env node

/**
 * @fileoverview SourceMap 上传 CLI 工具
 * @description 在构建流程中上传 SourceMap 文件到监控服务器
 * @usage npx advance-monitor-upload --release 1.0.0 --url http://localhost:8080/api/sourcemaps ./dist
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 解析命令行参数
function parseArgs(args) {
  const options = {
    release: '',
    appId: '',
    url: 'http://localhost:8080/api/sourcemaps',
    dir: './dist',
    include: ['**/*.js.map'],
    deleteAfterUpload: false,
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--release':
      case '-r':
        options.release = args[++i]
        break
      case '--app-id':
      case '-a':
        options.appId = args[++i]
        break
      case '--url':
      case '-u':
        options.url = args[++i]
        break
      case '--delete':
      case '-d':
        options.deleteAfterUpload = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
      default:
        if (!arg.startsWith('-')) {
          options.dir = arg
        }
    }
  }

  return options
}

function printHelp() {
  console.log(`
Advance Monitor SourceMap Upload CLI

Usage:
  npx advance-monitor-upload [options] <directory>

Options:
  -r, --release <version>   Release version (required)
  -a, --app-id <id>         Application ID (required)
  -u, --url <url>           Upload URL (default: http://localhost:8080/api/sourcemaps)
  -d, --delete              Delete sourcemap files after upload
  --dry-run                 Show what would be uploaded without uploading
  -h, --help                Show this help message

Examples:
  npx advance-monitor-upload -r 1.0.0 -a my-app ./dist
  npx advance-monitor-upload --release 1.0.0 --app-id my-app --delete ./dist
`)
}

// 递归查找 sourcemap 文件
function findSourceMaps(dir, pattern = '.map') {
  const files = []
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.name.endsWith(pattern)) {
        files.push(fullPath)
      }
    }
  }
  
  walk(dir)
  return files
}

// 上传单个文件
async function uploadFile(filePath, options) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const filename = path.basename(filePath).replace('.map', '')
  
  // 尝试解析 sourcemap 获取原始文件信息
  let sourceMapData
  try {
    sourceMapData = JSON.parse(content)
  } catch (e) {
    console.error(`  ✗ Invalid JSON in ${filePath}`)
    return false
  }

  const formData = new FormData()
  formData.append('release', options.release)
  formData.append('appId', options.appId)
  formData.append('filename', filename)
  formData.append('file', sourceMapData.file || filename)
  formData.append('sourcemap', new Blob([content], { type: 'application/json' }), path.basename(filePath))

  // 如果有 sources，也上传
  if (sourceMapData.sources) {
    formData.append('sources', JSON.stringify(sourceMapData.sources))
  }

  try {
    const response = await fetch(options.url, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`  ✗ Failed to upload ${filename}: ${text}`)
      return false
    }

    console.log(`  ✓ Uploaded ${filename}`)
    return true
  } catch (error) {
    console.error(`  ✗ Error uploading ${filename}: ${error.message}`)
    return false
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  // 验证必填参数
  if (!options.release) {
    console.error('Error: --release is required')
    printHelp()
    process.exit(1)
  }

  if (!options.appId) {
    console.error('Error: --app-id is required')
    printHelp()
    process.exit(1)
  }

  // 检查目录是否存在
  if (!fs.existsSync(options.dir)) {
    console.error(`Error: Directory not found: ${options.dir}`)
    process.exit(1)
  }

  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Advance Monitor SourceMap Upload                   ║
╚════════════════════════════════════════════════════════════╝

Release: ${options.release}
App ID:  ${options.appId}
URL:     ${options.url}
Dir:     ${options.dir}
`)

  // 查找 sourcemap 文件
  const files = findSourceMaps(options.dir)

  if (files.length === 0) {
    console.log('No sourcemap files found.')
    process.exit(0)
  }

  console.log(`Found ${files.length} sourcemap file(s):\n`)

  if (options.dryRun) {
    files.forEach(f => console.log(`  - ${path.relative(options.dir, f)}`))
    console.log('\n(Dry run - no files uploaded)')
    process.exit(0)
  }

  // 上传文件
  let successCount = 0
  let failCount = 0

  for (const file of files) {
    const relativePath = path.relative(options.dir, file)
    console.log(`Uploading: ${relativePath}`)
    
    const success = await uploadFile(file, options)
    
    if (success) {
      successCount++
      
      // 删除已上传的文件
      if (options.deleteAfterUpload) {
        fs.unlinkSync(file)
        console.log(`  ✓ Deleted ${relativePath}`)
      }
    } else {
      failCount++
    }
  }

  console.log(`
────────────────────────────────────────────────────────────
Upload complete: ${successCount} succeeded, ${failCount} failed
`)

  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
