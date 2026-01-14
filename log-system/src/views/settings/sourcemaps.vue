<template>
  <div class="sourcemaps-page">
    <!-- 上传区域 -->
    <div class="upload-section">
      <h3 class="section-title">上传 SourceMap</h3>
      <div class="upload-card">
        <div class="upload-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">版本号 *</label>
              <input type="text" v-model="uploadForm.release" class="form-input" placeholder="如: 1.0.0" />
            </div>
            <div class="form-group">
              <label class="form-label">文件名 *</label>
              <input type="text" v-model="uploadForm.filename" class="form-input" placeholder="如: main.js" />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">SourceMap 文件 *</label>
            <div 
              class="upload-dropzone"
              :class="{ dragover: isDragover }"
              @dragover.prevent="isDragover = true"
              @dragleave="isDragover = false"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
            >
              <input 
                ref="fileInput" 
                type="file" 
                accept=".map,application/json" 
                @change="handleFileSelect"
                style="display: none"
              />
              <div class="dropzone-content">
                <div class="dropzone-icon">📁</div>
                <div class="dropzone-text" v-if="!selectedFile">
                  拖拽文件到此处，或点击选择文件
                </div>
                <div class="dropzone-file" v-else>
                  <span class="file-name">{{ selectedFile.name }}</span>
                  <span class="file-size">({{ formatBytes(selectedFile.size) }})</span>
                  <button class="remove-btn" @click.stop="selectedFile = null">×</button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button class="upload-btn" @click="handleUpload" :disabled="uploading || !canUpload">
              {{ uploading ? '上传中...' : '上传' }}
            </button>
          </div>
        </div>

        <div class="upload-guide">
          <h4>CLI 上传方式</h4>
          <div class="code-block">
            <pre><code>npx advance-monitor-upload \
  --release {{ uploadForm.release || '1.0.0' }} \
  --app-id {{ projectId }} \
  --url {{ uploadUrl }} \
  ./dist</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 版本列表 -->
    <div class="releases-section">
      <h3 class="section-title">已上传版本</h3>
      <div class="releases-list" v-if="releases.length > 0">
        <div class="release-item" v-for="release in releases" :key="release.version">
          <div class="release-info">
            <div class="release-version">{{ release.version }}</div>
            <div class="release-meta">
              <span>{{ release.files.length }} 个文件</span>
              <span>上传于 {{ formatTime(release.uploadedAt) }}</span>
            </div>
          </div>
          <div class="release-files">
            <span class="file-tag" v-for="file in release.files.slice(0, 5)" :key="file">
              {{ file }}
            </span>
            <span class="file-more" v-if="release.files.length > 5">
              +{{ release.files.length - 5 }} 更多
            </span>
          </div>
          <div class="release-actions">
            <button class="action-btn delete" @click="handleDeleteRelease(release.version)">
              删除
            </button>
          </div>
        </div>
      </div>
      <div class="empty-state" v-else>
        <div class="empty-icon">📦</div>
        <div class="empty-text">暂无已上传的 SourceMap</div>
      </div>
    </div>

    <!-- 测试解析 -->
    <div class="test-section">
      <h3 class="section-title">测试堆栈解析</h3>
      <div class="test-card">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">版本号</label>
            <input type="text" v-model="testForm.release" class="form-input" placeholder="1.0.0" />
          </div>
          <div class="form-group">
            <label class="form-label">文件名</label>
            <input type="text" v-model="testForm.filename" class="form-input" placeholder="main.js" />
          </div>
          <div class="form-group">
            <label class="form-label">行号</label>
            <input type="number" v-model="testForm.line" class="form-input" placeholder="1" />
          </div>
          <div class="form-group">
            <label class="form-label">列号</label>
            <input type="number" v-model="testForm.column" class="form-input" placeholder="1" />
          </div>
        </div>
        <div class="form-actions">
          <button class="test-btn" @click="handleTestParse" :disabled="testing">
            {{ testing ? '解析中...' : '测试解析' }}
          </button>
        </div>

        <div class="parse-result" v-if="parseResult">
          <div class="result-header" :class="parseResult.success ? 'success' : 'error'">
            {{ parseResult.success ? '✓ 解析成功' : '✗ 解析失败' }}
          </div>
          <div class="result-content" v-if="parseResult.success">
            <div class="result-item">
              <span class="result-label">源文件:</span>
              <span class="result-value">{{ parseResult.source.source }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">行号:</span>
              <span class="result-value">{{ parseResult.source.line }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">列号:</span>
              <span class="result-value">{{ parseResult.source.column }}</span>
            </div>
            <div class="result-item" v-if="parseResult.source.name">
              <span class="result-label">函数名:</span>
              <span class="result-value">{{ parseResult.source.name }}</span>
            </div>
            <div class="source-context" v-if="parseResult.source.context">
              <div class="context-title">源代码上下文:</div>
              <pre class="context-code"><code><template v-for="line in parseResult.source.context.lines" :key="line.lineNumber"><span :class="{ 'highlight-line': line.isTarget }">{{ line.lineNumber.toString().padStart(4) }} | {{ line.text }}</span>
</template></code></pre>
            </div>
          </div>
          <div class="result-error" v-else>
            {{ parseResult.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
import { formatBytes, formatTime } from '@/utils'

// 状态
const projectId = ref('proj_default')
const uploadUrl = ref('http://localhost:8080/api/sourcemaps')
const releases = ref([])
const selectedFile = ref(null)
const isDragover = ref(false)
const uploading = ref(false)
const testing = ref(false)
const parseResult = ref(null)
const fileInput = ref(null)

const uploadForm = ref({
  release: '',
  filename: '',
})

const testForm = ref({
  release: '',
  filename: '',
  line: 1,
  column: 1,
})

// 计算属性
const canUpload = computed(() => {
  return uploadForm.value.release && uploadForm.value.filename && selectedFile.value
})

// 方法
function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    // 自动填充文件名
    if (!uploadForm.value.filename) {
      uploadForm.value.filename = file.name.replace('.map', '')
    }
  }
}

function handleDrop(event) {
  isDragover.value = false
  const file = event.dataTransfer.files[0]
  if (file && (file.name.endsWith('.map') || file.type === 'application/json')) {
    selectedFile.value = file
    if (!uploadForm.value.filename) {
      uploadForm.value.filename = file.name.replace('.map', '')
    }
  }
}

async function handleUpload() {
  if (!canUpload.value) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('release', uploadForm.value.release)
    formData.append('appId', projectId.value)
    formData.append('filename', uploadForm.value.filename)
    formData.append('sourcemap', selectedFile.value)

    const response = await fetch(uploadUrl.value, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    alert('上传成功')
    selectedFile.value = null
    uploadForm.value.filename = ''
    fetchReleases()
  } catch (error) {
    alert('上传失败: ' + error.message)
  } finally {
    uploading.value = false
  }
}

async function fetchReleases() {
  try {
    const res = await fetch(`${uploadUrl.value}/releases?appId=${projectId.value}`)
    const data = await res.json()
    releases.value = data.data || []
  } catch (error) {
    console.error('Failed to fetch releases:', error)
  }
}

async function handleDeleteRelease(version) {
  if (!confirm(`确定要删除版本 ${version} 的所有 SourceMap 吗？`)) return

  try {
    await fetch(`${uploadUrl.value}/releases/${version}?appId=${projectId.value}`, {
      method: 'DELETE',
    })
    fetchReleases()
  } catch (error) {
    alert('删除失败: ' + error.message)
  }
}

async function handleTestParse() {
  testing.value = true
  parseResult.value = null

  try {
    const res = await fetch(`${uploadUrl.value.replace('/sourcemaps', '')}/sourcemaps/parse-position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: projectId.value,
        release: testForm.value.release,
        filename: testForm.value.filename,
        line: parseInt(testForm.value.line, 10),
        column: parseInt(testForm.value.column, 10),
      }),
    })

    const data = await res.json()
    parseResult.value = data.data
  } catch (error) {
    parseResult.value = { success: false, error: error.message }
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  fetchReleases()
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.sourcemaps-page {
  max-width: 900px;
  margin: 0 auto;
}

.section-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-lg;
}

// 上传区域
.upload-section {
  margin-bottom: $spacing-2xl;
}

.upload-card {
  @include card;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-xl;

  @media (max-width: $breakpoint-md) {
    grid-template-columns: 1fr;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-lg;
}

.form-group {
  margin-bottom: $spacing-lg;
}

.form-label {
  display: block;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin-bottom: $spacing-sm;
}

.form-input {
  @include input-base;
}

.upload-dropzone {
  border: 2px dashed $color-border;
  border-radius: $radius-lg;
  padding: $spacing-xl;
  text-align: center;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover,
  &.dragover {
    border-color: $color-primary;
    background: $color-primary-bg;
  }
}

.dropzone-icon {
  font-size: 32px;
  margin-bottom: $spacing-md;
}

.dropzone-text {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.dropzone-file {
  @include flex-center;
  gap: $spacing-sm;
}

.file-name {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.file-size {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: $color-error-bg;
  color: $color-error;
  border-radius: 50%;
  cursor: pointer;
  @include flex-center;
}

.form-actions {
  margin-top: $spacing-lg;
}

.upload-btn,
.test-btn {
  @include button-primary;
  width: 100%;
}

.upload-guide {
  h4 {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    margin-bottom: $spacing-md;
  }
}

.code-block {
  background: #1E1E1E;
  border-radius: $radius-md;
  padding: $spacing-md;
  overflow-x: auto;

  pre {
    margin: 0;
  }

  code {
    font-family: $font-family-mono;
    font-size: $font-size-xs;
    color: #D4D4D4;
  }
}

// 版本列表
.releases-section {
  margin-bottom: $spacing-2xl;
}

.releases-list {
  @include card($padding: 0);
}

.release-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: $spacing-lg;
  align-items: center;
  padding: $spacing-lg;
  border-bottom: 1px solid $color-border-light;

  &:last-child {
    border-bottom: none;
  }
}

.release-version {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.release-meta {
  @include flex-start;
  gap: $spacing-md;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: $spacing-xs;
}

.release-files {
  @include flex-start;
  gap: $spacing-xs;
  flex-wrap: wrap;
}

.file-tag {
  font-size: $font-size-xs;
  padding: 2px $spacing-sm;
  background: $color-bg-hover;
  border-radius: $radius-sm;
  color: $color-text-secondary;
}

.file-more {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.action-btn {
  @include button-ghost;
  padding: $spacing-xs $spacing-md;
  font-size: $font-size-sm;

  &.delete {
    color: $color-error;

    &:hover {
      background: $color-error-bg;
    }
  }
}

.empty-state {
  @include card;
  @include flex-center;
  flex-direction: column;
  padding: $spacing-3xl;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: $spacing-md;
}

.empty-text {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

// 测试解析
.test-section {
  margin-bottom: $spacing-2xl;
}

.test-card {
  @include card;

  .form-row {
    grid-template-columns: repeat(4, 1fr);

    @media (max-width: $breakpoint-md) {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

.parse-result {
  margin-top: $spacing-lg;
  border: 1px solid $color-border-light;
  border-radius: $radius-md;
  overflow: hidden;
}

.result-header {
  padding: $spacing-md;
  font-weight: $font-weight-medium;

  &.success {
    background: $color-success-bg;
    color: $color-success;
  }

  &.error {
    background: $color-error-bg;
    color: $color-error;
  }
}

.result-content {
  padding: $spacing-md;
}

.result-item {
  @include flex-start;
  gap: $spacing-md;
  margin-bottom: $spacing-sm;

  &:last-child {
    margin-bottom: 0;
  }
}

.result-label {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  min-width: 60px;
}

.result-value {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-family: $font-family-mono;
}

.result-error {
  padding: $spacing-md;
  font-size: $font-size-sm;
  color: $color-error;
}

.source-context {
  margin-top: $spacing-lg;
}

.context-title {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
}

.context-code {
  background: #1E1E1E;
  border-radius: $radius-md;
  padding: $spacing-md;
  overflow-x: auto;
  margin: 0;

  code {
    font-family: $font-family-mono;
    font-size: $font-size-xs;
    color: #D4D4D4;
    white-space: pre;
  }

  .highlight-line {
    display: block;
    background: rgba(255, 255, 0, 0.2);
    color: #fff;
  }
}
</style>
