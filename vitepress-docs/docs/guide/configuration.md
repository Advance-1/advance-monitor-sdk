# 配置项

初始化 SDK 时可以传入以下配置：

```js
monitor.init({
  // 必填
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  
  // 可选
  appVersion: '1.0.0',
  environment: 'production',
  // ...更多配置
})
```

## 基础配置

### appId

- 类型：`string`
- 必填：是

应用唯一标识，用于区分不同项目的数据。

### reportUrl

- 类型：`string`
- 必填：是

数据上报地址。

### appVersion

- 类型：`string`
- 默认值：`'1.0.0'`

应用版本号，建议与发布版本保持一致，方便按版本筛选问题。

### environment

- 类型：`string`
- 默认值：`'production'`

当前环境，常用值：`development`、`staging`、`production`。

### release

- 类型：`string`
- 默认值：`undefined`

发布版本标识，用于关联 SourceMap。建议使用 git commit hash 或构建时间戳。

## 功能开关

### enableError

- 类型：`boolean`
- 默认值：`true`

是否启用错误监控。

### enablePerformance

- 类型：`boolean`
- 默认值：`true`

是否启用性能监控。

### enableBehavior

- 类型：`boolean`
- 默认值：`true`

是否启用用户行为监控。

### enableNetwork

- 类型：`boolean`
- 默认值：`true`

是否启用网络请求监控。

## 采样配置

### sampleRate

- 类型：`number`
- 默认值：`1`
- 范围：`0 ~ 1`

数据采样率。设为 `0.5` 表示只上报 50% 的数据，适合高流量场景。

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  sampleRate: 0.1, // 只采样 10%
})
```

### errorSampleRate

- 类型：`number`
- 默认值：`1`

错误数据采样率，独立于 `sampleRate`。建议错误数据保持 100% 采样。

### performanceSampleRate

- 类型：`number`
- 默认值：`1`

性能数据采样率。

## 上报配置

### maxBreadcrumbs

- 类型：`number`
- 默认值：`20`

最大面包屑数量。面包屑用于记录错误发生前的用户操作。

### maxQueueSize

- 类型：`number`
- 默认值：`10`

上报队列最大长度。达到上限后会立即发送。

### reportInterval

- 类型：`number`
- 默认值：`5000`

上报间隔（毫秒）。SDK 会将数据攒批后统一发送。

### enableCompress

- 类型：`boolean`
- 默认值：`true`

是否压缩上报数据。开启后可减少约 70% 的数据量。

### enableOffline

- 类型：`boolean`
- 默认值：`true`

是否启用离线缓存。断网时数据会存入 localStorage，恢复后自动上报。

## 隐私配置

### sensitiveKeys

- 类型：`string[]`
- 默认值：`['password', 'token', 'secret', 'key', 'auth']`

敏感字段名，匹配到的字段值会被替换为 `[Filtered]`。

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  sensitiveKeys: ['password', 'creditCard', 'idCard'],
})
```

### sensitivePatterns

- 类型：`RegExp[]`
- 默认值：`[]`

敏感数据正则，匹配到的内容会被脱敏。

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  sensitivePatterns: [
    /\d{11}/, // 手机号
    /\d{18}/, // 身份证
  ],
})
```

## 过滤配置

### ignoreErrors

- 类型：`(string | RegExp)[]`
- 默认值：`[]`

忽略的错误信息。匹配到的错误不会上报。

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  ignoreErrors: [
    'Script error.',
    /ResizeObserver loop/,
  ],
})
```

### ignoreUrls

- 类型：`(string | RegExp)[]`
- 默认值：`[]`

忽略的请求 URL。匹配到的网络请求不会上报。

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  ignoreUrls: [
    '/api/health',
    /\/analytics\//,
  ],
})
```

## 钩子函数

### beforeSend

- 类型：`(event) => event | null`
- 默认值：`undefined`

数据发送前的钩子。可以修改数据或返回 `null` 阻止发送。

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  beforeSend(event) {
    // 过滤特定错误
    if (event.type === 'error' && event.data.message.includes('忽略')) {
      return null
    }
    // 添加自定义数据
    event.customField = 'value'
    return event
  },
})
```

## 调试配置

### debug

- 类型：`boolean`
- 默认值：`false`

是否开启调试模式。开启后会在控制台输出详细日志。

### silent

- 类型：`boolean`
- 默认值：`false`

是否静默模式。开启后不会输出任何控制台日志。

## 完整示例

```js
monitor.init({
  // 基础配置
  appId: 'my-app',
  reportUrl: 'https://monitor.example.com/api/tracker',
  appVersion: '2.1.0',
  environment: 'production',
  release: 'abc123',

  // 功能开关
  enableError: true,
  enablePerformance: true,
  enableBehavior: true,
  enableNetwork: true,

  // 采样
  sampleRate: 1,
  errorSampleRate: 1,
  performanceSampleRate: 0.5,

  // 上报
  maxBreadcrumbs: 30,
  maxQueueSize: 20,
  reportInterval: 3000,
  enableCompress: true,
  enableOffline: true,

  // 隐私
  sensitiveKeys: ['password', 'token'],

  // 过滤
  ignoreErrors: ['Script error.'],
  ignoreUrls: ['/api/health'],

  // 钩子
  beforeSend(event) {
    return event
  },

  // 调试
  debug: false,
  silent: false,
})
```
