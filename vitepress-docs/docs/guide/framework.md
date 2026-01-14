# 框架集成

SDK 提供了 Vue 和 React 的开箱即用集成。

## Vue 3

```js
import { createApp } from 'vue'
import monitor from 'advance-monitor-sdk'
import App from './App.vue'

const app = createApp(App)

monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})

// 集成 Vue 3
monitor.setupVue3(app)

app.mount('#app')
```

集成后会自动捕获：

- 组件渲染错误
- 生命周期钩子中的错误
- 事件处理函数中的错误
- watcher 回调中的错误

错误信息会包含组件名和组件树：

```js
{
  type: 'error',
  data: {
    message: 'Cannot read property of undefined',
    componentName: 'ProductList',
    componentTree: 'App > Layout > ProductList',
    hook: 'mounted',
  }
}
```

## Vue 2

```js
import Vue from 'vue'
import monitor from 'advance-monitor-sdk'
import App from './App.vue'

monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})

// 集成 Vue 2
monitor.setupVue2(Vue)

new Vue({
  render: h => h(App),
}).$mount('#app')
```

## React

React 需要使用 ErrorBoundary 来捕获组件错误：

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import monitor from 'advance-monitor-sdk'
import App from './App'

monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})

// 创建 ErrorBoundary
const ErrorBoundary = monitor.createReactErrorBoundary(React)

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary fallback={<div>页面出错了</div>}>
    <App />
  </ErrorBoundary>
)
```

### 自定义 fallback

```jsx
<ErrorBoundary
  fallback={({ error, resetError }) => (
    <div className="error-page">
      <h2>出错了</h2>
      <p>{error.message}</p>
      <button onClick={resetError}>重试</button>
    </div>
  )}
>
  <App />
</ErrorBoundary>
```

### 手动捕获错误

在 class 组件的 componentDidCatch 中：

```jsx
class MyErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    monitor.captureReactError(error, errorInfo)
  }

  render() {
    return this.props.children
  }
}
```

## 路由集成

### Vue Router

```js
import { createRouter } from 'vue-router'

const router = createRouter({
  // ...
})

router.afterEach((to, from) => {
  // SDK 会自动监控路由变化，无需手动处理
})
```

### React Router

```jsx
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

function App() {
  const location = useLocation()

  useEffect(() => {
    // SDK 会自动监控 history 变化，无需手动处理
  }, [location])

  return <Routes>{/* ... */}</Routes>
}
```

## 状态管理集成

### Vuex / Pinia

可以在 action 中手动添加面包屑：

```js
// Pinia
export const useUserStore = defineStore('user', {
  actions: {
    async login(credentials) {
      monitor.addBreadcrumb({
        type: 'user',
        category: 'auth',
        message: '开始登录',
      })

      try {
        const user = await api.login(credentials)
        this.user = user
        
        monitor.setUser(user)
        monitor.addBreadcrumb({
          type: 'user',
          category: 'auth',
          message: '登录成功',
        })
      } catch (error) {
        monitor.captureError(error, {
          tags: { action: 'login' },
        })
        throw error
      }
    },
  },
})
```

### Redux

```js
// Redux middleware
const monitorMiddleware = store => next => action => {
  monitor.addBreadcrumb({
    type: 'redux',
    category: 'state',
    message: action.type,
    data: { payload: action.payload },
  })

  return next(action)
}
```
