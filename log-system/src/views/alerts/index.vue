<template>
  <div class="alerts-page">
    <!-- 头部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-subtitle">配置告警规则，及时发现问题</h2>
      </div>
      <button class="create-btn" @click="showCreateModal = true">
        + 创建告警规则
      </button>
    </div>

    <!-- 告警规则列表 -->
    <div class="alerts-list">
      <div class="alert-card" v-for="alert in alerts" :key="alert.id">
        <div class="alert-header">
          <div class="alert-info">
            <div class="alert-name">{{ alert.name }}</div>
            <div class="alert-desc">{{ alert.description }}</div>
          </div>
          <div class="alert-status">
            <label class="switch">
              <input type="checkbox" :checked="alert.enabled" @change="toggleAlert(alert.id, !alert.enabled)" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="alert-conditions">
          <div class="condition-item">
            <span class="condition-label">触发条件</span>
            <span class="condition-value">{{ formatCondition(alert.condition) }}</span>
          </div>
          <div class="condition-item">
            <span class="condition-label">时间窗口</span>
            <span class="condition-value">{{ alert.timeWindow }}</span>
          </div>
          <div class="condition-item">
            <span class="condition-label">通知方式</span>
            <span class="condition-value">{{ alert.notifyChannels.join(', ') }}</span>
          </div>
        </div>

        <div class="alert-footer">
          <div class="alert-stats">
            <span class="stat">
              <span class="stat-label">触发次数</span>
              <span class="stat-value">{{ alert.triggerCount }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">最后触发</span>
              <span class="stat-value">{{ alert.lastTriggered ? fromNow(alert.lastTriggered) : '从未' }}</span>
            </span>
          </div>
          <div class="alert-actions">
            <button class="action-btn edit" @click="editAlert(alert)">编辑</button>
            <button class="action-btn delete" @click="deleteAlert(alert.id)">删除</button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-if="alerts.length === 0">
        <div class="empty-icon">🔔</div>
        <div class="empty-title">暂无告警规则</div>
        <div class="empty-desc">创建告警规则，及时发现和处理问题</div>
        <button class="create-btn" @click="showCreateModal = true">创建告警规则</button>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <div class="modal-overlay" v-if="showCreateModal" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingAlert ? '编辑告警规则' : '创建告警规则' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">规则名称</label>
            <input type="text" v-model="formData.name" class="form-input" placeholder="输入规则名称" />
          </div>

          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="formData.description" class="form-textarea" placeholder="输入规则描述"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">告警类型</label>
            <select v-model="formData.type" class="form-select">
              <option value="error_count">错误数量</option>
              <option value="error_rate">错误率</option>
              <option value="performance">性能指标</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">阈值</label>
              <input type="number" v-model="formData.threshold" class="form-input" placeholder="阈值" />
            </div>
            <div class="form-group">
              <label class="form-label">时间窗口</label>
              <select v-model="formData.timeWindow" class="form-select">
                <option value="5m">5 分钟</option>
                <option value="15m">15 分钟</option>
                <option value="30m">30 分钟</option>
                <option value="1h">1 小时</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">通知方式</label>
            <div class="checkbox-group">
              <label class="checkbox-item">
                <input type="checkbox" v-model="formData.notifyChannels" value="email" />
                <span>邮件</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" v-model="formData.notifyChannels" value="webhook" />
                <span>Webhook</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" v-model="formData.notifyChannels" value="slack" />
                <span>Slack</span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModal">取消</button>
          <button class="submit-btn" @click="submitForm">{{ editingAlert ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { fromNow } from '@/utils'

// 状态
const alerts = ref([])
const showCreateModal = ref(false)
const editingAlert = ref(null)
const formData = ref({
  name: '',
  description: '',
  type: 'error_count',
  threshold: 10,
  timeWindow: '5m',
  notifyChannels: ['email'],
})

// 方法
function formatCondition(condition) {
  const typeLabels = {
    error_count: '错误数量',
    error_rate: '错误率',
    performance: '性能指标',
    custom: '自定义',
  }
  return `${typeLabels[condition.type] || condition.type} > ${condition.threshold}`
}

async function fetchAlerts() {
  try {
    const res = await api.alerts.getList()
    alerts.value = res.data || []
  } catch (error) {
    console.error('Failed to fetch alerts:', error)
  }
}

async function toggleAlert(id, enabled) {
  try {
    await api.alerts.toggle(id, enabled)
    const alert = alerts.value.find(a => a.id === id)
    if (alert) {
      alert.enabled = enabled
    }
  } catch (error) {
    console.error('Failed to toggle alert:', error)
  }
}

function editAlert(alert) {
  editingAlert.value = alert
  formData.value = {
    name: alert.name,
    description: alert.description,
    type: alert.condition.type,
    threshold: alert.condition.threshold,
    timeWindow: alert.timeWindow,
    notifyChannels: [...alert.notifyChannels],
  }
  showCreateModal.value = true
}

async function deleteAlert(id) {
  if (!confirm('确定要删除这个告警规则吗？')) return
  
  try {
    await api.alerts.delete(id)
    alerts.value = alerts.value.filter(a => a.id !== id)
  } catch (error) {
    console.error('Failed to delete alert:', error)
  }
}

function closeModal() {
  showCreateModal.value = false
  editingAlert.value = null
  formData.value = {
    name: '',
    description: '',
    type: 'error_count',
    threshold: 10,
    timeWindow: '5m',
    notifyChannels: ['email'],
  }
}

async function submitForm() {
  const data = {
    name: formData.value.name,
    description: formData.value.description,
    condition: {
      type: formData.value.type,
      threshold: formData.value.threshold,
    },
    timeWindow: formData.value.timeWindow,
    notifyChannels: formData.value.notifyChannels,
    enabled: true,
  }

  try {
    if (editingAlert.value) {
      await api.alerts.update(editingAlert.value.id, data)
    } else {
      await api.alerts.create(data)
    }
    closeModal()
    fetchAlerts()
  } catch (error) {
    console.error('Failed to save alert:', error)
  }
}

onMounted(() => {
  fetchAlerts()
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.alerts-page {
  max-width: $content-max-width;
  margin: 0 auto;
}

// 头部
.page-header {
  @include flex-between;
  margin-bottom: $spacing-xl;
}

.page-subtitle {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.create-btn {
  @include button-primary;
}

// 告警列表
.alerts-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.alert-card {
  @include card;
}

.alert-header {
  @include flex-between;
  margin-bottom: $spacing-lg;
}

.alert-name {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.alert-desc {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  margin-top: $spacing-xs;
}

// 开关
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: $color-border;
    transition: $transition-fast;
    border-radius: 24px;

    &::before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: $transition-fast;
      border-radius: 50%;
    }
  }

  input:checked + .slider {
    background-color: $color-primary;
  }

  input:checked + .slider::before {
    transform: translateX(20px);
  }
}

// 条件
.alert-conditions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-lg;
  padding: $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
  margin-bottom: $spacing-lg;
}

.condition-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.condition-label {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.condition-value {
  font-size: $font-size-sm;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

// 底部
.alert-footer {
  @include flex-between;
}

.alert-stats {
  @include flex-start;
  gap: $spacing-xl;
}

.stat {
  @include flex-start;
  gap: $spacing-sm;
}

.stat-label {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.stat-value {
  font-size: $font-size-sm;
  color: $color-text-primary;
}

.alert-actions {
  @include flex-start;
  gap: $spacing-sm;
}

.action-btn {
  @include button-ghost;
  padding: $spacing-xs $spacing-md;
  font-size: $font-size-sm;

  &.edit {
    color: $color-primary;

    &:hover {
      background: $color-primary-bg;
    }
  }

  &.delete {
    color: $color-error;

    &:hover {
      background: $color-error-bg;
    }
  }
}

// 空状态
.empty-state {
  @include flex-center;
  flex-direction: column;
  padding: $spacing-4xl;
  background: $color-bg-container;
  border-radius: $radius-lg;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: $spacing-md;
}

.empty-title {
  font-size: $font-size-md;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.empty-desc {
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  margin-bottom: $spacing-lg;
}

// 弹窗
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  @include flex-center;
  z-index: $z-index-modal;
}

.modal {
  width: 500px;
  max-width: 90vw;
  background: $color-bg-container;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
}

.modal-header {
  @include flex-between;
  padding: $spacing-lg;
  border-bottom: 1px solid $color-border-light;
}

.modal-title {
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: $font-size-xl;
  color: $color-text-tertiary;
  cursor: pointer;
  border-radius: $radius-md;

  &:hover {
    background: $color-bg-hover;
  }
}

.modal-body {
  padding: $spacing-lg;
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

.form-input,
.form-select,
.form-textarea {
  @include input-base;
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-lg;
}

.checkbox-group {
  @include flex-start;
  gap: $spacing-lg;
}

.checkbox-item {
  @include flex-start;
  gap: $spacing-sm;
  cursor: pointer;
  font-size: $font-size-sm;
  color: $color-text-secondary;

  input {
    width: 16px;
    height: 16px;
  }
}

.modal-footer {
  @include flex-end;
  gap: $spacing-md;
  padding: $spacing-lg;
  border-top: 1px solid $color-border-light;
}

.cancel-btn {
  @include button-secondary;
}

.submit-btn {
  @include button-primary;
}
</style>
