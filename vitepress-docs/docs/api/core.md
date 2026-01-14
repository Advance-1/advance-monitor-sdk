# 核心方法

## init

初始化 SDK。

```js
monitor.init(options)
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| options | `Object` | 是 | 配置选项，详见[配置项](/guide/configuration) |

**返回值**

`AdvanceMonitor` - SDK 实例

**示例**

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})
```

## setUser

设置用户信息。

```js
monitor.setUser(user)
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| user | `Object` | 是 | 用户信息 |
| user.id | `string` | 是 | 用户 ID |
| user.name | `string` | 否 | 用户名 |
| user.email | `string` | 否 | 邮箱 |

**返回值**

`AdvanceMonitor` - SDK 实例（支持链式调用）

**示例**

```js
monitor.setUser({
  id: '12345',
  name: '张三',
  email: 'zhangsan@example.com',
})
```

## setTag

设置标签，用于筛选和分组。

```js
monitor.setTag(key, value)
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| key | `string` | 是 | 标签名 |
| value | `string` | 是 | 标签值 |

**返回值**

`AdvanceMonitor` - SDK 实例

**示例**

```js
monitor.setTag('page', 'checkout')
monitor.setTag('experiment', 'new-ui')
```

## setExtra

设置扩展数据，用于调试。

```js
monitor.setExtra(key, value)
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| key | `string` | 是 | 键名 |
| value | `any` | 是 | 值 |

**返回值**

`AdvanceMonitor` - SDK 实例

**示例**

```js
monitor.setExtra('cartItems', ['item1', 'item2'])
```

## captureError

手动捕获错误。

```js
monitor.captureError(error, options?)
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| error | `Error \| string` | 是 | 错误对象或错误信息 |
| options | `Object` | 否 | 额外选项 |
| options.level | `string` | 否 | 错误级别：info, warning, error, fatal |
| options.tags | `Object` | 否 | 标签 |
| options.extra | `Object` | 否 | 扩展数据 |

**返回值**

`AdvanceMonitor` - SDK 实例

**示例**

```js
try {
  riskyOperation()
} catch (error) {
  monitor.captureError(error, {
    level: 'error',
    tags: { module: 'payment' },
    extra: { orderId: '123456' },
  })
}
```

## captureMessage

手动捕获消息。

```js
monitor.captureMessage(message, options?)
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| message | `string` | 是 | 消息内容 |
| options | `Object` | 否 | 额外选项 |
| options.level | `string` | 否 | 级别 |

**返回值**

`AdvanceMonitor` - SDK 实例

**示例**

```js
monitor.captureMessage('用户点击了废弃的按钮', { level: 'warning' })
```

## track

记录自定义事件。

```js
monitor.track(eventName, data?)
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| eventName | `string` | 是 | 事件名称 |
| data | `Object` | 否 | 事件数据 |

**返回值**

`AdvanceMonitor` - SDK 实例

**示例**

```js
monitor.track('button_click', {
  buttonName: '提交订单',
  page: '/checkout',
})
```

## addBreadcrumb

添加面包屑。

```js
monitor.addBreadcrumb(breadcrumb)
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| breadcrumb | `Object` | 是 | 面包屑数据 |
| breadcrumb.type | `string` | 否 | 类型 |
| breadcrumb.category | `string` | 否 | 分类 |
| breadcrumb.message | `string` | 否 | 消息 |
| breadcrumb.data | `Object` | 否 | 数据 |

**返回值**

`AdvanceMonitor` - SDK 实例

**示例**

```js
monitor.addBreadcrumb({
  type: 'user',
  category: 'auth',
  message: '用户登录成功',
  data: { userId: '12345' },
})
```

## getBreadcrumbs

获取所有面包屑。

```js
monitor.getBreadcrumbs()
```

**返回值**

`Array` - 面包屑数组

## getPerformanceMetrics

获取性能指标。

```js
monitor.getPerformanceMetrics()
```

**返回值**

```js
{
  lcp: number,    // 最大内容绘制
  fid: number,    // 首次输入延迟
  cls: number,    // 累积布局偏移
  fcp: number,    // 首次内容绘制
  ttfb: number,   // 首字节时间
  domReady: number,
  load: number,
}
```

## getSessionId

获取当前会话 ID。

```js
monitor.getSessionId()
```

**返回值**

`string` - 会话 ID

## flush

立即发送队列中的数据。

```js
await monitor.flush()
```

**返回值**

`Promise<void>`

## destroy

销毁 SDK，释放资源。

```js
monitor.destroy()
```

## isInitialized

检查 SDK 是否已初始化。

```js
monitor.isInitialized()
```

**返回值**

`boolean`

## getVersion

获取 SDK 版本。

```js
monitor.getVersion()
```

**返回值**

`string` - 版本号
