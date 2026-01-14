# 数据分析

SDK 提供了 UV/PV 统计、漏斗分析、热力图等数据分析能力。

## UV/PV 统计

### 启用分析插件

```js
import monitor from 'advance-monitor-sdk'
import { createAnalyticsPlugin } from 'advance-monitor-sdk/plugins'

const analyticsPlugin = createAnalyticsPlugin({
  enablePV: true,
  enableUV: true,
  trackSPA: true, // 追踪 SPA 路由变化
})

monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
})

monitor.use(analyticsPlugin)
```

### 自动采集

插件会自动采集：

- **PV** - 页面访问量，每次页面加载或路由变化都会记录
- **UV** - 独立访客，基于浏览器指纹识别
- **会话** - 用户的一次访问，30 分钟无操作自动结束

### 手动记录 PV

```js
// SPA 中手动记录页面访问
analyticsPlugin.trackPageView('/custom-page')
```

### 获取统计数据

```js
const stats = analyticsPlugin.getStats()
// {
//   visitorId: 'abc123',
//   sessionId: 'session_xyz',
//   sessionDuration: 120000,
//   pageViewCount: 5,
// }
```

## 漏斗分析

漏斗分析用于追踪用户的转化路径。

### 定义漏斗

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
        { name: '支付成功', urlPattern: '/payment/success' },
      ],
    },
  ],
})

monitor.use(funnelPlugin)
```

### 手动完成步骤

```js
// 当用户完成某个步骤时
funnelPlugin.completeStep('purchase', '加入购物车')
```

### 获取漏斗数据

```js
const stats = funnelPlugin.getStats('purchase')
// {
//   name: 'purchase',
//   steps: [
//     { name: '浏览商品', count: 1000, rate: 100 },
//     { name: '加入购物车', count: 300, rate: 30 },
//     { name: '提交订单', count: 100, rate: 10 },
//     { name: '支付成功', count: 80, rate: 8 },
//   ],
//   overallConversion: 8,
// }
```

## 热力图

热力图用于分析用户的点击行为。

### 启用热力图

```js
import { createHeatmapPlugin } from 'advance-monitor-sdk/plugins'

const heatmapPlugin = createHeatmapPlugin({
  sampleRate: 1,
  trackMove: false, // 是否追踪鼠标移动
  trackScroll: true, // 是否追踪滚动深度
})

monitor.use(heatmapPlugin)
```

### 获取热力图数据

```js
const data = heatmapPlugin.getData()
// {
//   clicks: [
//     { x: 100, y: 200, selector: '.buy-btn', count: 50 },
//     { x: 300, y: 400, selector: '.add-cart', count: 30 },
//   ],
//   scrollDepth: {
//     25: 1000, // 25% 位置有 1000 次浏览
//     50: 800,
//     75: 500,
//     100: 200,
//   },
// }
```

### 区域统计

```js
const zoneStats = heatmapPlugin.getZoneStats()
// 按页面区域统计点击分布
```

## 流量来源分析

SDK 会自动识别流量来源：

- **直接访问** - 用户直接输入 URL
- **搜索引擎** - 百度、Google、Bing 等
- **社交媒体** - 微博、微信、抖音等
- **外部链接** - 其他网站的引用

### UTM 参数

支持自动解析 UTM 参数：

```
https://example.com/?utm_source=wechat&utm_medium=article&utm_campaign=summer
```

会自动记录：

```js
{
  source: 'wechat',
  medium: 'article',
  campaign: 'summer',
}
```

## 实时数据

日志系统提供实时在线用户数据：

- 当前在线人数
- 活跃页面分布
- 实时 PV 趋势

## 隐私合规

数据分析功能遵循隐私保护原则：

1. 不采集用户的真实身份信息
2. 访客 ID 基于浏览器指纹，不跨设备追踪
3. 支持用户退出追踪

```js
// 用户选择退出追踪
analyticsPlugin.optOut()
```
