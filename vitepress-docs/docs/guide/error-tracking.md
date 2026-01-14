# 错误监控

SDK 会自动捕获多种类型的前端错误，无需额外配置。

## 自动捕获的错误类型

### JavaScript 运行时错误

```js
// 这类错误会被自动捕获
const obj = null
obj.name // TypeError: Cannot read property 'name' of null
```

### Promise 异常

未处理的 Promise rejection 会被自动捕获：

```js
// 会被捕获
Promise.reject(new Error('请求失败'))

// 会被捕获
async function fetchData() {
  throw new Error('数据获取失败')
}
fetchData()
```

### 资源加载失败

图片、脚本、样式等资源加载失败：

```html
<!-- 图片加载失败会被捕获 -->
<img src="https://example.com/not-exist.png" />

<!-- 脚本加载失败会被捕获 -->
<script src="https://example.com/not-exist.js"></script>
```

### 跨域脚本错误

默认情况下，跨域脚本的错误信息会显示为 `Script error.`。要获取完整错误信息，需要：

1. 脚本添加 `crossorigin` 属性：

```html
<script src="https://cdn.example.com/lib.js" crossorigin="anonymous"></script>
```

2. 服务器返回 CORS 头：

```
Access-Control-Allow-Origin: *
```

## 手动捕获错误

### captureError

捕获 Error 对象：

```js
try {
  riskyOperation()
} catch (error) {
  monitor.captureError(error)
}
```

带额外信息：

```js
monitor.captureError(error, {
  level: 'warning', // 错误级别：info, warning, error, fatal
  tags: {
    module: 'payment',
    feature: 'checkout',
  },
  extra: {
    orderId: '123456',
    userId: 'user_001',
  },
})
```

### captureMessage

捕获文本消息：

```js
monitor.captureMessage('用户点击了废弃的按钮')

// 带级别
monitor.captureMessage('配置项缺失', { level: 'warning' })
```

## 错误级别

SDK 支持以下错误级别：

| 级别 | 说明 |
| --- | --- |
| `info` | 信息，不影响功能 |
| `warning` | 警告，可能有问题 |
| `error` | 错误，功能受影响 |
| `fatal` | 致命，应用崩溃 |

```js
monitor.captureError(error, { level: 'fatal' })
```

## 错误上下文

### 面包屑

SDK 会自动记录用户操作，当错误发生时，这些记录会作为面包屑一起上报：

```js
// 面包屑示例
[
  { type: 'navigation', data: { from: '/', to: '/product/123' }, timestamp: 1703145600000 },
  { type: 'click', data: { selector: '.add-to-cart' }, timestamp: 1703145605000 },
  { type: 'http', data: { method: 'POST', url: '/api/cart' }, timestamp: 1703145606000 },
  { type: 'error', data: { message: 'Network Error' }, timestamp: 1703145607000 },
]
```

手动添加面包屑：

```js
monitor.addBreadcrumb({
  type: 'user',
  category: 'auth',
  message: '用户登录成功',
  data: { userId: '12345' },
})
```

### 用户信息

设置用户信息后，错误会关联到具体用户：

```js
monitor.setUser({
  id: '12345',
  name: '张三',
  email: 'zhangsan@example.com',
})
```

### 标签和扩展数据

```js
// 设置标签（用于筛选）
monitor.setTag('page', 'checkout')
monitor.setTag('experiment', 'new-ui')

// 设置扩展数据（用于调试）
monitor.setExtra('cartItems', ['item1', 'item2'])
```

## 错误过滤

### 忽略特定错误

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  ignoreErrors: [
    'Script error.', // 忽略跨域脚本错误
    'ResizeObserver loop', // 忽略 ResizeObserver 警告
    /Network Error/, // 正则匹配
  ],
})
```

### beforeSend 过滤

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  beforeSend(event) {
    // 忽略开发环境的错误
    if (location.hostname === 'localhost') {
      return null
    }
    
    // 忽略特定错误
    if (event.data?.message?.includes('用户取消')) {
      return null
    }
    
    return event
  },
})
```

## 错误聚合

相同的错误会被聚合为一个 Issue，聚合规则基于：

- 错误类型
- 错误信息
- 发生位置（文件名、行号）

这样可以避免同一个错误重复出现，方便统计影响范围。

## SourceMap 还原

生产环境的代码通常是压缩混淆的，错误堆栈难以阅读。配合 SourceMap 可以还原到源码位置。

详见 [SourceMap 配置](/guide/sourcemap)。

## 常见问题

### 为什么有些错误显示 Script error.？

这是浏览器的安全限制，跨域脚本的错误信息会被隐藏。解决方法见上文「跨域脚本错误」。

### 错误太多怎么办？

1. 使用 `ignoreErrors` 过滤已知的无害错误
2. 使用 `sampleRate` 降低采样率
3. 使用 `beforeSend` 自定义过滤逻辑

### 如何区分不同环境的错误？

初始化时设置 `environment`：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  environment: process.env.NODE_ENV,
})
```
