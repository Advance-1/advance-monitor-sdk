# 链路追踪

链路追踪可以帮助你了解一个请求从前端到后端的完整链路，快速定位性能瓶颈。

## 基本概念

### Transaction

一个 Transaction 代表一个完整的操作，比如：

- 页面加载
- 用户点击按钮触发的一系列操作
- 一个完整的业务流程

### Span

一个 Span 代表 Transaction 中的一个步骤，比如：

- 一次 API 请求
- 一次数据库查询
- 一段代码的执行

Span 可以嵌套，形成树状结构。

## 自动追踪

SDK 会自动创建以下 Span：

- 页面加载（pageload）
- 路由导航（navigation）
- HTTP 请求（http）

## 手动创建 Transaction

```js
import { startTransaction } from 'advance-monitor-sdk'

// 开始一个 Transaction
const transaction = startTransaction({
  name: 'checkout',
  op: 'transaction',
})

// 业务逻辑
await processCheckout()

// 结束 Transaction
transaction.finish()
```

## 手动创建 Span

```js
import { startSpan, getActiveTransaction } from 'advance-monitor-sdk'

async function fetchUserData(userId) {
  // 创建一个 Span
  const span = startSpan({
    name: 'fetchUserData',
    op: 'function',
  })

  try {
    const user = await api.getUser(userId)
    span.setStatus('ok')
    return user
  } catch (error) {
    span.setStatus('error')
    span.setData('error', error.message)
    throw error
  } finally {
    span.finish()
  }
}
```

## 添加标签和数据

```js
const span = startSpan({ name: 'processOrder', op: 'function' })

// 添加标签（用于筛选）
span.setTag('order.type', 'subscription')
span.setTag('payment.method', 'alipay')

// 添加数据（用于调试）
span.setData('orderId', '123456')
span.setData('items', ['item1', 'item2'])

span.finish()
```

## HTTP 请求追踪

SDK 会自动在 HTTP 请求头中注入 trace context：

```
traceparent: 00-{traceId}-{spanId}-01
```

后端服务可以解析这个头，将日志与前端请求关联起来。

### 手动注入

如果使用自定义的请求库：

```js
import { getActiveSpan } from 'advance-monitor-sdk'

async function customFetch(url, options = {}) {
  const span = getActiveSpan()
  
  const headers = {
    ...options.headers,
  }

  if (span) {
    headers['traceparent'] = `00-${span.traceId}-${span.spanId}-01`
  }

  return fetch(url, { ...options, headers })
}
```

## 与后端集成

### Node.js

```js
const { expressMiddleware } = require('advance-monitor-sdk/node')

const app = express()

// 添加中间件
app.use(expressMiddleware())

app.get('/api/users', async (req, res) => {
  // 请求会自动关联到前端的 trace
  const users = await db.query('SELECT * FROM users')
  res.json(users)
})
```

### 其他后端

解析请求头中的 `traceparent`：

```
traceparent: 00-{traceId}-{parentSpanId}-{flags}
```

将 traceId 记录到日志中，即可与前端链路关联。

## 采样配置

链路追踪数据量较大，建议配置采样率：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  tracingSampleRate: 0.1, // 10% 采样
})
```

## 性能影响

链路追踪会有一定的性能开销，主要来自：

- Span 对象的创建和管理
- 请求头的注入
- 数据的序列化和上报

在高流量场景下，建议：

1. 降低采样率
2. 只追踪关键业务流程
3. 避免创建过多的 Span
