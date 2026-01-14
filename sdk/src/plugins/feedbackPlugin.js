/**
 * @fileoverview 用户反馈插件
 * @description 收集用户反馈，支持截图、描述等
 */

/**
 * 用户反馈插件
 */
export function createFeedbackPlugin() {
  let monitor = null
  let feedbackDialog = null

  return {
    name: 'feedback',

    /**
     * 初始化插件
     */
    init(monitorInstance) {
      monitor = monitorInstance
    },

    /**
     * 显示反馈对话框
     * @param {Object} options - 选项
     */
    showFeedbackDialog(options = {}) {
      if (feedbackDialog) {
        feedbackDialog.remove()
      }

      feedbackDialog = createFeedbackDialog({
        ...options,
        onSubmit: (feedback) => this.submitFeedback(feedback),
        onCancel: () => this.hideFeedbackDialog(),
      })

      document.body.appendChild(feedbackDialog)
    },

    /**
     * 隐藏反馈对话框
     */
    hideFeedbackDialog() {
      if (feedbackDialog) {
        feedbackDialog.remove()
        feedbackDialog = null
      }
    },

    /**
     * 提交反馈
     * @param {Object} feedback - 反馈内容
     */
    async submitFeedback(feedback) {
      const event = {
        type: 'feedback',
        data: {
          name: feedback.name || '',
          email: feedback.email || '',
          message: feedback.message,
          category: feedback.category || 'general',
          screenshot: feedback.screenshot || null,
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
        timestamp: Date.now(),
      }

      // 添加当前的面包屑
      if (monitor) {
        event.breadcrumbs = monitor.getBreadcrumbs()
      }

      // 发送反馈
      if (monitor) {
        await monitor.captureEvent(event)
      }

      this.hideFeedbackDialog()

      // 显示感谢提示
      showToast('感谢您的反馈！')

      return event
    },

    /**
     * 截取当前页面截图
     * @returns {Promise<string>} base64 图片
     */
    async captureScreenshot() {
      // 使用 html2canvas 或原生 API
      if (typeof html2canvas !== 'undefined') {
        try {
          const canvas = await html2canvas(document.body, {
            logging: false,
            useCORS: true,
            scale: 0.5, // 降低分辨率减小体积
          })
          return canvas.toDataURL('image/jpeg', 0.6)
        } catch (e) {
          console.warn('[AdvanceMonitor] Screenshot capture failed:', e)
          return null
        }
      }
      return null
    },

    /**
     * 销毁插件
     */
    destroy() {
      this.hideFeedbackDialog()
      monitor = null
    },
  }
}

/**
 * 创建反馈对话框 DOM
 */
function createFeedbackDialog(options) {
  const { onSubmit, onCancel, title = '提交反馈', placeholder = '请描述您遇到的问题...' } = options

  const dialog = document.createElement('div')
  dialog.className = 'advance-monitor-feedback-dialog'
  dialog.innerHTML = `
    <style>
      .advance-monitor-feedback-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .feedback-modal {
        background: #fff;
        border-radius: 12px;
        width: 420px;
        max-width: 90vw;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        overflow: hidden;
      }
      .feedback-header {
        padding: 16px 20px;
        border-bottom: 1px solid #E5E6EB;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .feedback-title {
        font-size: 16px;
        font-weight: 600;
        color: #1D2129;
        margin: 0;
      }
      .feedback-close {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 20px;
        color: #86909C;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .feedback-close:hover {
        background: #F2F3F5;
        color: #1D2129;
      }
      .feedback-body {
        padding: 20px;
      }
      .feedback-group {
        margin-bottom: 16px;
      }
      .feedback-label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #4E5969;
        margin-bottom: 6px;
      }
      .feedback-input,
      .feedback-textarea,
      .feedback-select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #E5E6EB;
        border-radius: 8px;
        font-size: 14px;
        color: #1D2129;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .feedback-input:focus,
      .feedback-textarea:focus,
      .feedback-select:focus {
        border-color: #165DFF;
      }
      .feedback-textarea {
        min-height: 100px;
        resize: vertical;
      }
      .feedback-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .feedback-screenshot {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .feedback-screenshot-btn {
        padding: 8px 12px;
        border: 1px dashed #E5E6EB;
        border-radius: 8px;
        background: #F7F8FA;
        cursor: pointer;
        font-size: 13px;
        color: #4E5969;
        transition: all 0.2s;
      }
      .feedback-screenshot-btn:hover {
        border-color: #165DFF;
        color: #165DFF;
      }
      .feedback-screenshot-preview {
        width: 60px;
        height: 40px;
        border-radius: 4px;
        object-fit: cover;
        border: 1px solid #E5E6EB;
      }
      .feedback-footer {
        padding: 16px 20px;
        border-top: 1px solid #E5E6EB;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .feedback-btn {
        padding: 8px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .feedback-btn-cancel {
        border: 1px solid #E5E6EB;
        background: #fff;
        color: #4E5969;
      }
      .feedback-btn-cancel:hover {
        background: #F7F8FA;
      }
      .feedback-btn-submit {
        border: none;
        background: #165DFF;
        color: #fff;
      }
      .feedback-btn-submit:hover {
        background: #4080FF;
      }
      .feedback-btn-submit:disabled {
        background: #94BFFF;
        cursor: not-allowed;
      }
    </style>
    <div class="feedback-modal">
      <div class="feedback-header">
        <h3 class="feedback-title">${title}</h3>
        <button class="feedback-close" data-action="cancel">×</button>
      </div>
      <div class="feedback-body">
        <div class="feedback-row">
          <div class="feedback-group">
            <label class="feedback-label">姓名 (可选)</label>
            <input type="text" class="feedback-input" data-field="name" placeholder="您的姓名">
          </div>
          <div class="feedback-group">
            <label class="feedback-label">邮箱 (可选)</label>
            <input type="email" class="feedback-input" data-field="email" placeholder="您的邮箱">
          </div>
        </div>
        <div class="feedback-group">
          <label class="feedback-label">问题类型</label>
          <select class="feedback-select" data-field="category">
            <option value="bug">Bug / 错误</option>
            <option value="feature">功能建议</option>
            <option value="performance">性能问题</option>
            <option value="ui">界面问题</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="feedback-group">
          <label class="feedback-label">问题描述 *</label>
          <textarea class="feedback-textarea" data-field="message" placeholder="${placeholder}"></textarea>
        </div>
        <div class="feedback-group">
          <label class="feedback-label">截图 (可选)</label>
          <div class="feedback-screenshot">
            <button class="feedback-screenshot-btn" data-action="screenshot">📷 截取当前页面</button>
            <img class="feedback-screenshot-preview" data-preview style="display: none;">
          </div>
        </div>
      </div>
      <div class="feedback-footer">
        <button class="feedback-btn feedback-btn-cancel" data-action="cancel">取消</button>
        <button class="feedback-btn feedback-btn-submit" data-action="submit">提交反馈</button>
      </div>
    </div>
  `

  // 绑定事件
  let screenshot = null

  dialog.querySelector('[data-action="cancel"]').addEventListener('click', onCancel)
  dialog.querySelector('.feedback-close').addEventListener('click', onCancel)

  dialog.querySelector('[data-action="submit"]').addEventListener('click', () => {
    const message = dialog.querySelector('[data-field="message"]').value.trim()
    if (!message) {
      dialog.querySelector('[data-field="message"]').focus()
      return
    }

    onSubmit({
      name: dialog.querySelector('[data-field="name"]').value.trim(),
      email: dialog.querySelector('[data-field="email"]').value.trim(),
      category: dialog.querySelector('[data-field="category"]').value,
      message,
      screenshot,
    })
  })

  dialog.querySelector('[data-action="screenshot"]').addEventListener('click', async () => {
    // 临时隐藏对话框
    dialog.style.display = 'none'
    
    // 等待一帧让对话框消失
    await new Promise(r => requestAnimationFrame(r))
    
    // 截图
    if (typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(document.body, {
          logging: false,
          useCORS: true,
          scale: 0.5,
        })
        screenshot = canvas.toDataURL('image/jpeg', 0.6)
        
        const preview = dialog.querySelector('[data-preview]')
        preview.src = screenshot
        preview.style.display = 'block'
      } catch (e) {
        console.warn('Screenshot failed:', e)
      }
    }
    
    dialog.style.display = 'flex'
  })

  // 点击背景关闭
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      onCancel()
    }
  })

  return dialog
}

/**
 * 显示 Toast 提示
 */
function showToast(message, duration = 3000) {
  const toast = document.createElement('div')
  toast.style.cssText = `
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: #1D2129;
    color: #fff;
    border-radius: 8px;
    font-size: 14px;
    z-index: 999999;
    animation: fadeInUp 0.3s ease;
  `
  toast.textContent = message

  const style = document.createElement('style')
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = 'fadeInUp 0.3s ease reverse'
    setTimeout(() => {
      toast.remove()
      style.remove()
    }, 300)
  }, duration)
}

export default createFeedbackPlugin
