# 快速上手

本文将帮助你在 5 分钟内完成 SDK 的接入。

## 安装

::: code-group

```bash [npm]
npm install advance-monitor-sdk
```

```bash [yarn]
yarn add advance-monitor-sdk
```

```bash [pnpm]
pnpm add advance-monitor-sdk
```

:::

## 基础接入

在应用入口文件中初始化 SDK：

```js
import monitor from 'advance-monitor-sdk'

monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})
```

就这么简单，SDK 会自动开始监控错误和性能数据。

## 配置用户信息

登录后设置用户信息，方便排查特定用户的问题：

```js
monitor.setUser({
  id: '12345',
  name: '张三',
  email: 'zhangsan@example.com',
})
```

## 手动上报错误

除了自动捕获，你也可以手动上报错误：

```js
try {
  // 可能出错的代码
  riskyOperation()
} catch (error) {
  monitor.captureError(error, {
    tags: { module: 'payment' },
    extra: { orderId: '123456' },
  })
}
```

## 自定义事件

上报业务埋点：

```js
monitor.track('button_click', {
  buttonName: '提交订单',
  page: '/checkout',
})
```

## 框架集成

### Vue 3

```js
import { createApp } from 'vue'
import monitor from 'advance-monitor-sdk'
import App from './App.vue'

const app = createApp(App)

monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})

monitor.setupVue3(app)

app.mount('#app')
```

### Vue 2

```js
import Vue from 'vue'
import monitor from 'advance-monitor-sdk'
import App from './App.vue'

monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})

monitor.setupVue2(Vue)

new Vue({
  render: h => h(App),
}).$mount('#app')
```

### React

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import monitor from 'advance-monitor-sdk'
import App from './App'

monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})

const ErrorBoundary = monitor.createReactErrorBoundary(React)

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
```

## 验证接入

打开浏览器控制台，如果看到以下日志，说明接入成功：

```
[AdvanceMonitor] SDK initialized (v1.0.0)
```

你也可以手动触发一个错误来测试：

```js
// 在控制台执行
monitor.captureMessage('测试消息')
```

## 下一步

- [配置项](/guide/configuration) - 了解更多配置选项
- [错误监控](/guide/error-tracking) - 深入了解错误捕获
- [性能监控](/guide/performance) - 了解性能指标采集
