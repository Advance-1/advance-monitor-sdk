/**
 * @fileoverview 告警通知服务
 * @description 支持邮件、Webhook、钉钉、飞书等多渠道通知
 */

/**
 * 通知渠道类型
 */
export const NotificationChannel = {
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  DINGTALK: 'dingtalk',
  FEISHU: 'feishu',
  SLACK: 'slack',
  WECHAT_WORK: 'wechat_work',
}

/**
 * 通知服务
 */
class NotificationService {
  constructor() {
    this._channels = new Map()
    this._templates = new Map()
    this._initDefaultTemplates()
  }

  /**
   * 初始化默认模板
   */
  _initDefaultTemplates() {
    // 错误告警模板
    this._templates.set('error_alert', {
      title: '[{severity}] {projectName} 发生错误',
      content: `
**错误信息**: {message}
**错误类型**: {errorType}
**发生次数**: {count} 次
**影响用户**: {userCount} 人
**首次发生**: {firstSeen}
**最近发生**: {lastSeen}
**页面**: {url}

[查看详情]({detailUrl})
      `.trim(),
    })

    // 性能告警模板
    this._templates.set('performance_alert', {
      title: '[性能告警] {projectName} {metric} 异常',
      content: `
**指标名称**: {metric}
**当前值**: {value}
**阈值**: {threshold}
**评级**: {rating}
**页面**: {url}

[查看详情]({detailUrl})
      `.trim(),
    })

    // 阈值告警模板
    this._templates.set('threshold_alert', {
      title: '[阈值告警] {projectName} {metricName} 超过阈值',
      content: `
**指标**: {metricName}
**当前值**: {currentValue}
**阈值**: {threshold}
**触发条件**: {condition}
**时间**: {timestamp}

[查看详情]({detailUrl})
      `.trim(),
    })
  }

  /**
   * 注册通知渠道
   * @param {string} channelType - 渠道类型
   * @param {Object} config - 渠道配置
   */
  registerChannel(channelType, config) {
    this._channels.set(channelType, config)
  }

  /**
   * 发送通知
   * @param {Object} options - 通知选项
   */
  async send(options) {
    const { channels, template, data, title, content } = options

    const results = []

    for (const channelType of channels) {
      const channelConfig = this._channels.get(channelType)
      if (!channelConfig) {
        results.push({ channel: channelType, success: false, error: 'Channel not configured' })
        continue
      }

      try {
        // 渲染模板
        let finalTitle = title
        let finalContent = content

        if (template && this._templates.has(template)) {
          const tpl = this._templates.get(template)
          finalTitle = this._renderTemplate(tpl.title, data)
          finalContent = this._renderTemplate(tpl.content, data)
        }

        // 发送到对应渠道
        const result = await this._sendToChannel(channelType, channelConfig, {
          title: finalTitle,
          content: finalContent,
          data,
        })

        results.push({ channel: channelType, success: true, result })
      } catch (error) {
        results.push({ channel: channelType, success: false, error: error.message })
      }
    }

    return results
  }

  /**
   * 渲染模板
   */
  _renderTemplate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match
    })
  }

  /**
   * 发送到指定渠道
   */
  async _sendToChannel(channelType, config, message) {
    switch (channelType) {
      case NotificationChannel.EMAIL:
        return this._sendEmail(config, message)
      case NotificationChannel.WEBHOOK:
        return this._sendWebhook(config, message)
      case NotificationChannel.DINGTALK:
        return this._sendDingtalk(config, message)
      case NotificationChannel.FEISHU:
        return this._sendFeishu(config, message)
      case NotificationChannel.SLACK:
        return this._sendSlack(config, message)
      case NotificationChannel.WECHAT_WORK:
        return this._sendWechatWork(config, message)
      default:
        throw new Error(`Unknown channel type: ${channelType}`)
    }
  }

  /**
   * 发送邮件
   */
  async _sendEmail(config, message) {
    const { smtp, from, to } = config
    
    // 实际项目中使用 nodemailer
    console.log('[Notification] Send email:', { from, to, subject: message.title })
    
    // 模拟发送
    return { messageId: `email_${Date.now()}` }
  }

  /**
   * 发送 Webhook
   */
  async _sendWebhook(config, message) {
    const { url, headers = {}, method = 'POST' } = config

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        title: message.title,
        content: message.content,
        data: message.data,
        timestamp: Date.now(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`)
    }

    return { status: response.status }
  }

  /**
   * 发送钉钉机器人消息
   */
  async _sendDingtalk(config, message) {
    const { webhook, secret } = config

    let url = webhook
    
    // 如果有签名密钥，添加签名
    if (secret) {
      const timestamp = Date.now()
      const sign = await this._generateDingtalkSign(secret, timestamp)
      url = `${webhook}&timestamp=${timestamp}&sign=${sign}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title: message.title,
          text: `## ${message.title}\n\n${message.content}`,
        },
      }),
    })

    const result = await response.json()
    if (result.errcode !== 0) {
      throw new Error(`Dingtalk error: ${result.errmsg}`)
    }

    return result
  }

  /**
   * 生成钉钉签名
   */
  async _generateDingtalkSign(secret, timestamp) {
    const stringToSign = `${timestamp}\n${secret}`
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign))
      return btoa(String.fromCharCode(...new Uint8Array(signature)))
    }
    
    return ''
  }

  /**
   * 发送飞书机器人消息
   */
  async _sendFeishu(config, message) {
    const { webhook, secret } = config

    const body = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: message.title,
          },
          template: 'red',
        },
        elements: [
          {
            tag: 'markdown',
            content: message.content,
          },
        ],
      },
    }

    // 如果有签名密钥
    if (secret) {
      const timestamp = Math.floor(Date.now() / 1000)
      body.timestamp = timestamp.toString()
      body.sign = await this._generateFeishuSign(secret, timestamp)
    }

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(`Feishu error: ${result.msg}`)
    }

    return result
  }

  /**
   * 生成飞书签名
   */
  async _generateFeishuSign(secret, timestamp) {
    const stringToSign = `${timestamp}\n${secret}`
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(stringToSign),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(''))
      return btoa(String.fromCharCode(...new Uint8Array(signature)))
    }
    
    return ''
  }

  /**
   * 发送 Slack 消息
   */
  async _sendSlack(config, message) {
    const { webhook } = config

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message.title,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: message.title },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: message.content },
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Slack error: ${response.status}`)
    }

    return { status: 'ok' }
  }

  /**
   * 发送企业微信消息
   */
  async _sendWechatWork(config, message) {
    const { webhook } = config

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          content: `## ${message.title}\n\n${message.content}`,
        },
      }),
    })

    const result = await response.json()
    if (result.errcode !== 0) {
      throw new Error(`WeChat Work error: ${result.errmsg}`)
    }

    return result
  }

  /**
   * 添加自定义模板
   */
  addTemplate(name, template) {
    this._templates.set(name, template)
  }

  /**
   * 获取所有已配置的渠道
   */
  getConfiguredChannels() {
    return Array.from(this._channels.keys())
  }
}

// 导出单例
export const notificationService = new NotificationService()
