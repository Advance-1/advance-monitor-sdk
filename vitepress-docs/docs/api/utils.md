# 工具函数

SDK 导出的工具函数。

## 链路追踪

```js
import { 
  startTransaction, 
  startSpan, 
  getActiveTransaction,
  getActiveSpan 
} from 'advance-monitor-sdk'
```

### startTransaction

创建一个 Transaction。

```js
const transaction = startTransaction({
  name: 'checkout',
  op: 'transaction',
})

// 业务逻辑
await doSomething()

transaction.finish()
```

**参数**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| name | `string` | Transaction 名称 |
| op | `string` | 操作类型 |
| tags | `Object` | 标签 |
| data | `Object` | 数据 |

### startSpan

创建一个 Span。

```js
const span = startSpan({
  name: 'fetchData',
  op: 'http',
})

span.setTag('url', '/api/users')
span.finish()
```

### getActiveTransaction

获取当前活跃的 Transaction。

```js
const transaction = getActiveTransaction()
```

### getActiveSpan

获取当前活跃的 Span。

```js
const span = getActiveSpan()
```

## 错误类型

```js
import { ErrorTypes, ErrorLevels } from 'advance-monitor-sdk'
```

### ErrorTypes

```js
{
  JS_ERROR: 'js_error',
  PROMISE_ERROR: 'promise_error',
  RESOURCE_ERROR: 'resource_error',
  HTTP_ERROR: 'http_error',
  CUSTOM_ERROR: 'custom_error',
}
```

### ErrorLevels

```js
{
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  FATAL: 'fatal',
}
```
