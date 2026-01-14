/**
 * @fileoverview 框架错误监控插件
 * @description 支持 Vue、React 等框架的错误捕获
 */

import { configManager } from '../core/config.js'
import { breadcrumbManager, BreadcrumbTypes, BreadcrumbLevels } from '../core/breadcrumb.js'
import { eventBuilder, ErrorTypes, ErrorLevels } from '../core/eventBuilder.js'
import { transport } from '../core/transport.js'

/**
 * 框架错误监控插件
 */
class FrameworkPlugin {
  constructor() {
    this._initialized = false
    this._vueErrorHandler = null
    this._vueWarnHandler = null
  }

  /**
   * 初始化插件
   */
  init() {
    if (this._initialized) return
    
    const config = configManager.get()
    if (!config.enableError) return

    this._initialized = true
  }

  /**
   * 集成 Vue 2.x
   * @param {Object} Vue - Vue 构造函数
   */
  setupVue2(Vue) {
    if (!Vue || !Vue.config) {
      console.warn('[AdvanceMonitor] Invalid Vue instance')
      return
    }

    // 保存原始处理器
    this._vueErrorHandler = Vue.config.errorHandler
    this._vueWarnHandler = Vue.config.warnHandler

    // 设置错误处理器
    Vue.config.errorHandler = (error, vm, info) => {
      this._handleVueError(error, vm, info)
      
      // 调用原始处理器
      if (this._vueErrorHandler) {
        this._vueErrorHandler.call(Vue, error, vm, info)
      }
    }

    // 设置警告处理器
    Vue.config.warnHandler = (msg, vm, trace) => {
      this._handleVueWarn(msg, vm, trace)
      
      // 调用原始处理器
      if (this._vueWarnHandler) {
        this._vueWarnHandler.call(Vue, msg, vm, trace)
      }
    }
  }

  /**
   * 集成 Vue 3.x
   * @param {Object} app - Vue 应用实例
   */
  setupVue3(app) {
    if (!app || !app.config) {
      console.warn('[AdvanceMonitor] Invalid Vue app instance')
      return
    }

    // 保存原始处理器
    this._vueErrorHandler = app.config.errorHandler
    this._vueWarnHandler = app.config.warnHandler

    // 设置错误处理器
    app.config.errorHandler = (error, instance, info) => {
      this._handleVueError(error, instance, info)
      
      // 调用原始处理器
      if (this._vueErrorHandler) {
        this._vueErrorHandler(error, instance, info)
      }
    }

    // 设置警告处理器
    app.config.warnHandler = (msg, instance, trace) => {
      this._handleVueWarn(msg, instance, trace)
      
      // 调用原始处理器
      if (this._vueWarnHandler) {
        this._vueWarnHandler(msg, instance, trace)
      }
    }
  }

  /**
   * 处理 Vue 错误
   * @private
   */
  _handleVueError(error, vm, info) {
    // 获取组件信息
    const componentInfo = this._getVueComponentInfo(vm)

    // 添加面包屑
    breadcrumbManager.add({
      type: BreadcrumbTypes.ERROR,
      category: 'vue',
      level: BreadcrumbLevels.ERROR,
      message: error.message,
      data: {
        component: componentInfo.name,
        info,
        propsData: componentInfo.propsData,
      },
    })

    // 构建错误事件
    const event = eventBuilder.buildError(error, {
      errorType: ErrorTypes.VUE_ERROR,
      level: ErrorLevels.ERROR,
      mechanism: 'vue.errorHandler',
      extra: {
        framework: 'vue',
        component: componentInfo,
        lifecycleHook: info,
      },
    })

    transport.send(event)
  }

  /**
   * 处理 Vue 警告
   * @private
   */
  _handleVueWarn(msg, vm, trace) {
    const componentInfo = this._getVueComponentInfo(vm)

    // 添加面包屑
    breadcrumbManager.add({
      type: BreadcrumbTypes.CONSOLE,
      category: 'vue',
      level: BreadcrumbLevels.WARNING,
      message: msg,
      data: {
        component: componentInfo.name,
        trace,
      },
    })
  }

  /**
   * 获取 Vue 组件信息
   * @private
   */
  _getVueComponentInfo(vm) {
    if (!vm) {
      return { name: 'Anonymous', propsData: {} }
    }

    // Vue 3
    if (vm.$) {
      return {
        name: vm.$.type?.name || vm.$.type?.__name || 'Anonymous',
        propsData: vm.$.props || {},
        uid: vm.$.uid,
      }
    }

    // Vue 2
    return {
      name: vm.$options?.name || vm.$options?._componentTag || 'Anonymous',
      propsData: vm.$options?.propsData || vm.$props || {},
      uid: vm._uid,
    }
  }

  /**
   * 集成 React（需要在 ErrorBoundary 中调用）
   * @param {Error} error - 错误对象
   * @param {Object} errorInfo - React 错误信息
   */
  captureReactError(error, errorInfo) {
    // 添加面包屑
    breadcrumbManager.add({
      type: BreadcrumbTypes.ERROR,
      category: 'react',
      level: BreadcrumbLevels.ERROR,
      message: error.message,
      data: {
        componentStack: errorInfo?.componentStack,
      },
    })

    // 构建错误事件
    const event = eventBuilder.buildError(error, {
      errorType: ErrorTypes.REACT_ERROR,
      level: ErrorLevels.ERROR,
      mechanism: 'react.errorBoundary',
      extra: {
        framework: 'react',
        componentStack: errorInfo?.componentStack,
      },
    })

    transport.send(event)
  }

  /**
   * 创建 React ErrorBoundary 高阶组件
   * @param {Object} React - React 模块
   * @returns {Class} ErrorBoundary 组件
   */
  createReactErrorBoundary(React) {
    const self = this

    return class MonitorErrorBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error }
      }

      componentDidCatch(error, errorInfo) {
        self.captureReactError(error, errorInfo)
        
        // 调用用户提供的回调
        if (this.props.onError) {
          this.props.onError(error, errorInfo)
        }
      }

      render() {
        if (this.state.hasError) {
          // 渲染降级 UI
          if (this.props.fallback) {
            return this.props.fallback
          }
          if (this.props.FallbackComponent) {
            return React.createElement(this.props.FallbackComponent, {
              error: this.state.error,
            })
          }
          return null
        }

        return this.props.children
      }
    }
  }

  /**
   * 创建 React ErrorBoundary Hook
   * @returns {Function} useErrorBoundary hook
   */
  createReactErrorBoundaryHook() {
    const self = this

    return function useMonitorErrorBoundary() {
      return {
        captureError: (error, errorInfo = {}) => {
          self.captureReactError(error, errorInfo)
        },
      }
    }
  }

  /**
   * 销毁插件
   */
  destroy() {
    this._initialized = false
  }
}

// 导出单例
export const frameworkPlugin = new FrameworkPlugin()
