# 配置选项

完整的配置选项列表。

## 基础配置

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| appId | `string` | - | 应用 ID（必填） |
| reportUrl | `string` | - | 上报地址（必填） |
| appVersion | `string` | `'1.0.0'` | 应用版本 |
| environment | `string` | `'production'` | 环境标识 |
| release | `string` | - | 发布版本，用于关联 SourceMap |

## 功能开关

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| enableError | `boolean` | `true` | 启用错误监控 |
| enablePerformance | `boolean` | `true` | 启用性能监控 |
| enableBehavior | `boolean` | `true` | 启用行为监控 |
| enableNetwork | `boolean` | `true` | 启用网络监控 |

## 采样配置

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| sampleRate | `number` | `1` | 全局采样率 (0-1) |
| errorSampleRate | `number` | `1` | 错误采样率 |
| performanceSampleRate | `number` | `1` | 性能采样率 |
| behaviorSampleRate | `number` | `1` | 行为采样率 |
| tracingSampleRate | `number` | `1` | 链路追踪采样率 |

## 上报配置

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| maxBreadcrumbs | `number` | `20` | 最大面包屑数量 |
| maxQueueSize | `number` | `10` | 上报队列最大长度 |
| reportInterval | `number` | `5000` | 上报间隔（毫秒） |
| enableCompress | `boolean` | `true` | 启用数据压缩 |
| enableOffline | `boolean` | `true` | 启用离线缓存 |

## 隐私配置

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| sensitiveKeys | `string[]` | `['password', 'token', ...]` | 敏感字段名 |
| sensitivePatterns | `RegExp[]` | `[]` | 敏感数据正则 |

## 过滤配置

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| ignoreErrors | `(string \| RegExp)[]` | `[]` | 忽略的错误 |
| ignoreUrls | `(string \| RegExp)[]` | `[]` | 忽略的 URL |
| ignoreSelectors | `string[]` | `[]` | 忽略的元素选择器 |

## 钩子函数

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| beforeSend | `(event) => event \| null` | - | 发送前钩子 |

## 调试配置

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| debug | `boolean` | `false` | 调试模式 |
| silent | `boolean` | `false` | 静默模式 |
