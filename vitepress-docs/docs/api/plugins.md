# 插件

SDK 提供了多个可选插件，按需引入。

## 使用方式

```js
import monitor from 'advance-monitor-sdk'
import { createAnalyticsPlugin } from 'advance-monitor-sdk/plugins'

const plugin = createAnalyticsPlugin({ ... })
monitor.use(plugin)
```

## createAnalyticsPlugin

UV/PV 统计插件。

```js
import { createAnalyticsPlugin } from 'advance-monitor-sdk/plugins'

const analyticsPlugin = createAnalyticsPlugin({
  enablePV: true,        // 启用 PV 统计
  enableUV: true,        // 启用 UV 统计
  enableSession: true,   // 启用会话统计
  sessionTimeout: 30 * 60 * 1000, // 会话超时时间
  trackSPA: true,        // 追踪 SPA 路由
  trackUTM: true,        // 追踪 UTM 参数
})
```

**方法**

| 方法 | 说明 |
| --- | --- |
| `trackPageView(url?)` | 手动记录 PV |
| `getVisitorId()` | 获取访客 ID |
| `getSessionId()` | 获取会话 ID |
| `getStats()` | 获取统计数据 |

## createHeatmapPlugin

热力图插件。

```js
import { createHeatmapPlugin } from 'advance-monitor-sdk/plugins'

const heatmapPlugin = createHeatmapPlugin({
  sampleRate: 1,         // 采样率
  trackMove: false,      // 追踪鼠标移动
  trackScroll: true,     // 追踪滚动深度
})
```

**方法**

| 方法 | 说明 |
| --- | --- |
| `getData()` | 获取热力图数据 |
| `getZoneStats()` | 获取区域统计 |
| `clear()` | 清空数据 |

## createFunnelPlugin

漏斗分析插件。

```js
import { createFunnelPlugin } from 'advance-monitor-sdk/plugins'

const funnelPlugin = createFunnelPlugin({
  funnels: [
    {
      name: 'purchase',
      steps: [
        { name: '浏览商品', urlPattern: '/product/' },
        { name: '加入购物车', eventName: 'add_to_cart' },
        { name: '提交订单', urlPattern: '/checkout' },
      ],
    },
  ],
})
```

**方法**

| 方法 | 说明 |
| --- | --- |
| `startFunnel(name)` | 开始漏斗 |
| `completeStep(name, step)` | 完成步骤 |
| `getStats(name)` | 获取漏斗统计 |

## createFeedbackPlugin

用户反馈插件。

```js
import { createFeedbackPlugin } from 'advance-monitor-sdk/plugins'

const feedbackPlugin = createFeedbackPlugin({
  showButton: true,      // 显示反馈按钮
  buttonPosition: 'bottom-right',
  enableScreenshot: true, // 支持截图
})
```

**方法**

| 方法 | 说明 |
| --- | --- |
| `show()` | 显示反馈弹窗 |
| `hide()` | 隐藏反馈弹窗 |

## createSessionReplayPlugin

会话回放插件。

```js
import { createSessionReplayPlugin } from 'advance-monitor-sdk/plugins'

const replayPlugin = createSessionReplayPlugin({
  sampleRate: 0.1,       // 采样率
  maskAllInputs: true,   // 遮罩输入框
  blockClass: 'private', // 遮罩的 class
})
```

**方法**

| 方法 | 说明 |
| --- | --- |
| `start()` | 开始录制 |
| `stop()` | 停止录制 |
| `getRecording()` | 获取录制数据 |
