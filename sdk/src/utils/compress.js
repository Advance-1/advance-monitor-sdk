/**
 * @fileoverview 数据压缩工具
 * @description 支持 gzip 压缩以减少上报数据体积
 */

/**
 * 使用 CompressionStream API 压缩数据 (现代浏览器)
 * @param {string} data - 要压缩的字符串
 * @returns {Promise<Blob>} 压缩后的 Blob
 */
export async function compressWithStream(data) {
  if (typeof CompressionStream === 'undefined') {
    return null
  }

  try {
    const blob = new Blob([data])
    const stream = blob.stream().pipeThrough(new CompressionStream('gzip'))
    return new Response(stream).blob()
  } catch (e) {
    console.warn('[AdvanceMonitor] Compression failed:', e)
    return null
  }
}

/**
 * 简单的 LZ 压缩算法 (兼容旧浏览器)
 * @param {string} data - 要压缩的字符串
 * @returns {string} 压缩后的字符串
 */
export function compressLZ(data) {
  if (!data) return ''
  
  const dict = {}
  const out = []
  let phrase = data[0]
  let code = 256
  
  for (let i = 1; i < data.length; i++) {
    const char = data[i]
    const combined = phrase + char
    
    if (dict[combined] !== undefined) {
      phrase = combined
    } else {
      out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0))
      dict[combined] = code++
      phrase = char
    }
  }
  
  out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0))
  
  return String.fromCharCode(...out)
}

/**
 * LZ 解压缩
 * @param {string} compressed - 压缩后的字符串
 * @returns {string} 解压后的字符串
 */
export function decompressLZ(compressed) {
  if (!compressed) return ''
  
  const dict = {}
  let phrase = String.fromCharCode(compressed.charCodeAt(0))
  let out = phrase
  let code = 256
  let currCode, currChar
  
  for (let i = 1; i < compressed.length; i++) {
    currCode = compressed.charCodeAt(i)
    
    if (currCode < 256) {
      currChar = String.fromCharCode(currCode)
    } else if (dict[currCode] !== undefined) {
      currChar = dict[currCode]
    } else {
      currChar = phrase + phrase[0]
    }
    
    out += currChar
    dict[code++] = phrase + currChar[0]
    phrase = currChar
  }
  
  return out
}

/**
 * 自动选择最佳压缩方式
 * @param {string} data - 要压缩的数据
 * @returns {Promise<{data: Blob|string, encoding: string}>}
 */
export async function compress(data) {
  // 数据太小不压缩
  if (data.length < 1024) {
    return { data, encoding: 'none' }
  }

  // 优先使用原生 gzip
  const gzipped = await compressWithStream(data)
  if (gzipped && gzipped.size < data.length * 0.9) {
    return { data: gzipped, encoding: 'gzip' }
  }

  // 降级使用 LZ 压缩
  const lzCompressed = compressLZ(data)
  if (lzCompressed.length < data.length * 0.9) {
    return { data: lzCompressed, encoding: 'lz' }
  }

  // 压缩效果不好，不压缩
  return { data, encoding: 'none' }
}

/**
 * 检查是否支持压缩
 * @returns {boolean}
 */
export function isCompressionSupported() {
  return typeof CompressionStream !== 'undefined'
}
