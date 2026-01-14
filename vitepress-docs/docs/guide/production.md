# 生产环境部署

本文介绍在生产环境中使用 SDK 的最佳实践。

## 配置建议

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  
  // 版本管理
  appVersion: process.env.APP_VERSION,
  release: process.env.GIT_COMMIT,
  environment: 'production',

  // 采样配置
  sampleRate: 1,
  errorSampleRate: 1, // 错误保持 100%
  performanceSampleRate: 0.5, // 性能 50%

  // 上报优化
  enableCompress: true,
  enableOffline: true,
  reportInterval: 5000,

  // 过滤噪音
  ignoreErrors: [
    'Script error.',
    'ResizeObserver loop',
    /Loading chunk .* failed/,
  ],

  // 静默模式
  silent: true,
})
```

## 采样策略

高流量场景下，合理的采样可以减少服务器压力：

| 数据类型 | 建议采样率 | 说明 |
| --- | --- | --- |
| 错误 | 100% | 错误数据最重要，建议全量采集 |
| 性能 | 10% ~ 50% | 性能数据量大，可以降低采样 |
| 行为 | 10% ~ 30% | 根据业务需要调整 |
| 链路追踪 | 1% ~ 10% | 数据量最大，建议低采样 |

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  errorSampleRate: 1,
  performanceSampleRate: 0.1,
  behaviorSampleRate: 0.1,
  tracingSampleRate: 0.01,
})
```

## 错误过滤

生产环境中会有一些无害的错误，建议过滤掉：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  ignoreErrors: [
    // 跨域脚本错误
    'Script error.',
    
    // ResizeObserver 警告
    'ResizeObserver loop',
    
    // 动态加载失败（通常是网络问题）
    /Loading chunk .* failed/,
    /Failed to fetch dynamically imported module/,
    
    // 用户主动取消
    'AbortError',
    /user aborted/i,
    
    // 扩展程序错误
    /chrome-extension/,
    /moz-extension/,
  ],
})
```

## SourceMap 安全

**不要将 SourceMap 部署到生产环境**，只上传到监控服务器。

Vite 配置：

```js
// vite.config.js
export default defineConfig({
  build: {
    sourcemap: 'hidden', // 生成但不引用
  },
})
```

Webpack 配置：

```js
// webpack.config.js
module.exports = {
  devtool: 'hidden-source-map',
}
```

## 数据安全

### 敏感信息脱敏

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  sensitiveKeys: [
    'password',
    'token',
    'secret',
    'creditCard',
    'idCard',
    'phone',
  ],
  sensitivePatterns: [
    /\d{11}/, // 手机号
    /\d{18}/, // 身份证
    /\d{16,19}/, // 银行卡
  ],
})
```

### 请求签名

开启请求签名防止数据篡改：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  enableSign: true,
  signKey: process.env.MONITOR_SIGN_KEY,
})
```

## 性能优化

### 延迟加载

SDK 支持延迟加载，不阻塞首屏：

```js
// 首屏只加载核心功能
import monitor from 'advance-monitor-sdk'

monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})

// 延迟加载其他插件
setTimeout(async () => {
  const { createAnalyticsPlugin } = await import('advance-monitor-sdk/plugins')
  monitor.use(createAnalyticsPlugin())
}, 3000)
```

### 按需引入

只引入需要的功能：

```js
// 只引入错误监控
import { createErrorPlugin } from 'advance-monitor-sdk/plugins'
```

## 监控服务器

### 容量规划

根据日活用户估算数据量：

| 日活 | 预估数据量/天 | 建议配置 |
| --- | --- | --- |
| 1 万 | 100 MB | 单机 |
| 10 万 | 1 GB | 2 核 4G |
| 100 万 | 10 GB | 集群部署 |

### 数据保留

建议的数据保留策略：

- 原始事件：7 天
- 聚合数据：90 天
- SourceMap：按版本保留最近 10 个

## 告警配置

配置告警规则，及时发现问题：

- 错误数突增
- 错误率超过阈值
- 新错误出现
- 性能指标恶化

## 灰度发布

新版本发布时，建议：

1. 先在小流量环境验证
2. 观察监控数据是否正常
3. 逐步放量

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  release: 'v2.0.0',
  environment: 'canary', // 灰度环境
})
```
