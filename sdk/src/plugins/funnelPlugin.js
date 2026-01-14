/**
 * @fileoverview 漏斗分析插件
 * @description 追踪用户转化路径，分析漏斗转化率
 */

/**
 * 漏斗分析插件
 */
export function createFunnelPlugin(options = {}) {
  const {
    funnels = [],           // 预定义的漏斗配置
    sessionTimeout = 30 * 60 * 1000, // 会话超时时间 (30分钟)
  } = options

  let monitor = null
  let activeFunnels = new Map() // 活跃的漏斗实例
  let completedFunnels = []     // 已完成的漏斗数据

  /**
   * 漏斗实例
   */
  class FunnelInstance {
    constructor(config) {
      this.id = `funnel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      this.name = config.name
      this.steps = config.steps.map(step => ({
        ...step,
        completed: false,
        timestamp: null,
        data: null,
      }))
      this.currentStep = 0
      this.startTime = Date.now()
      this.endTime = null
      this.completed = false
      this.dropped = false
      this.dropStep = null
      this.userId = null
      this.sessionId = null
    }

    /**
     * 检查是否匹配某个步骤
     */
    matchStep(stepIndex, event) {
      const step = this.steps[stepIndex]
      if (!step) return false

      // 检查事件类型
      if (step.eventType && event.type !== step.eventType) {
        return false
      }

      // 检查事件名称
      if (step.eventName && event.name !== step.eventName) {
        return false
      }

      // 检查 URL 匹配
      if (step.urlPattern) {
        const url = event.url || window.location.href
        if (!new RegExp(step.urlPattern).test(url)) {
          return false
        }
      }

      // 检查元素选择器
      if (step.selector && event.target) {
        if (!event.target.matches(step.selector)) {
          return false
        }
      }

      // 检查自定义条件
      if (step.condition && typeof step.condition === 'function') {
        if (!step.condition(event)) {
          return false
        }
      }

      return true
    }

    /**
     * 处理事件
     */
    processEvent(event) {
      // 检查是否超时
      if (Date.now() - this.startTime > sessionTimeout) {
        this.dropped = true
        this.dropStep = this.currentStep
        return false
      }

      // 检查当前步骤是否匹配
      if (this.matchStep(this.currentStep, event)) {
        this.steps[this.currentStep].completed = true
        this.steps[this.currentStep].timestamp = Date.now()
        this.steps[this.currentStep].data = event.data

        this.currentStep++

        // 检查是否完成所有步骤
        if (this.currentStep >= this.steps.length) {
          this.completed = true
          this.endTime = Date.now()
          return true
        }
      }

      return false
    }

    /**
     * 获取漏斗数据
     */
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        steps: this.steps.map(step => ({
          name: step.name,
          completed: step.completed,
          timestamp: step.timestamp,
        })),
        currentStep: this.currentStep,
        totalSteps: this.steps.length,
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this.endTime ? this.endTime - this.startTime : null,
        completed: this.completed,
        dropped: this.dropped,
        dropStep: this.dropStep,
        conversionRate: this.currentStep / this.steps.length,
        userId: this.userId,
        sessionId: this.sessionId,
      }
    }
  }

  /**
   * 开始一个漏斗
   */
  function startFunnel(name, config = null) {
    // 查找预定义配置
    let funnelConfig = config || funnels.find(f => f.name === name)
    
    if (!funnelConfig) {
      console.warn(`[FunnelPlugin] Funnel config not found: ${name}`)
      return null
    }

    const instance = new FunnelInstance(funnelConfig)
    activeFunnels.set(instance.id, instance)
    
    return instance.id
  }

  /**
   * 追踪漏斗事件
   */
  function trackFunnelEvent(event) {
    const completedIds = []

    activeFunnels.forEach((instance, id) => {
      const isCompleted = instance.processEvent(event)
      
      if (isCompleted || instance.dropped) {
        completedFunnels.push(instance.toJSON())
        completedIds.push(id)
      }
    })

    // 移除已完成或已放弃的漏斗
    completedIds.forEach(id => activeFunnels.delete(id))
  }

  /**
   * 手动完成漏斗步骤
   */
  function completeStep(funnelId, stepName, data = {}) {
    const instance = activeFunnels.get(funnelId)
    if (!instance) return false

    const event = {
      type: 'funnel_step',
      name: stepName,
      data,
    }

    return instance.processEvent(event)
  }

  /**
   * 放弃漏斗
   */
  function abandonFunnel(funnelId) {
    const instance = activeFunnels.get(funnelId)
    if (!instance) return

    instance.dropped = true
    instance.dropStep = instance.currentStep
    completedFunnels.push(instance.toJSON())
    activeFunnels.delete(funnelId)
  }

  /**
   * 获取漏斗统计
   */
  function getFunnelStats(funnelName) {
    const funnelData = completedFunnels.filter(f => f.name === funnelName)
    
    if (funnelData.length === 0) {
      return null
    }

    const totalCount = funnelData.length
    const completedCount = funnelData.filter(f => f.completed).length
    const droppedCount = funnelData.filter(f => f.dropped).length

    // 计算每个步骤的转化率
    const stepStats = []
    const firstFunnel = funnelData[0]
    
    for (let i = 0; i < firstFunnel.totalSteps; i++) {
      const reachedCount = funnelData.filter(f => f.currentStep > i || f.completed).length
      const completedStepCount = funnelData.filter(f => f.steps[i]?.completed).length
      
      stepStats.push({
        step: i,
        name: firstFunnel.steps[i]?.name,
        reached: reachedCount,
        completed: completedStepCount,
        conversionRate: totalCount > 0 ? completedStepCount / totalCount : 0,
        dropRate: i > 0 ? 1 - (completedStepCount / stepStats[i - 1].completed) : 0,
      })
    }

    // 计算平均完成时间
    const completedFunnelsData = funnelData.filter(f => f.completed && f.duration)
    const avgDuration = completedFunnelsData.length > 0
      ? completedFunnelsData.reduce((sum, f) => sum + f.duration, 0) / completedFunnelsData.length
      : 0

    return {
      name: funnelName,
      totalCount,
      completedCount,
      droppedCount,
      overallConversionRate: totalCount > 0 ? completedCount / totalCount : 0,
      avgDuration,
      stepStats,
    }
  }

  return {
    name: 'funnel',

    /**
     * 初始化插件
     */
    init(monitorInstance) {
      monitor = monitorInstance

      // 监听页面访问事件
      window.addEventListener('popstate', () => {
        trackFunnelEvent({
          type: 'pageview',
          url: window.location.href,
        })
      })

      // 监听点击事件
      document.addEventListener('click', (e) => {
        trackFunnelEvent({
          type: 'click',
          target: e.target,
          url: window.location.href,
        })
      }, { capture: true })

      // 页面卸载时上报
      window.addEventListener('beforeunload', () => {
        this.flush()
      })
    },

    /**
     * 开始漏斗
     */
    start: startFunnel,

    /**
     * 追踪事件
     */
    track: trackFunnelEvent,

    /**
     * 完成步骤
     */
    completeStep,

    /**
     * 放弃漏斗
     */
    abandon: abandonFunnel,

    /**
     * 获取统计
     */
    getStats: getFunnelStats,

    /**
     * 获取所有漏斗数据
     */
    getAllData() {
      return {
        active: Array.from(activeFunnels.values()).map(f => f.toJSON()),
        completed: completedFunnels,
      }
    },

    /**
     * 上报数据
     */
    flush() {
      // 将活跃的漏斗标记为放弃
      activeFunnels.forEach((instance, id) => {
        instance.dropped = true
        instance.dropStep = instance.currentStep
        completedFunnels.push(instance.toJSON())
      })
      activeFunnels.clear()

      if (completedFunnels.length === 0) return

      if (monitor) {
        monitor.captureEvent({
          type: 'funnel',
          data: {
            funnels: completedFunnels,
          },
          timestamp: Date.now(),
        })
      }

      completedFunnels = []
    },

    /**
     * 销毁插件
     */
    destroy() {
      activeFunnels.clear()
      completedFunnels = []
      monitor = null
    },
  }
}

export default createFunnelPlugin
