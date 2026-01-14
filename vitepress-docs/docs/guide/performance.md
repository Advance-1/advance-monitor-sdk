# 性能监控

SDK 会自动采集页面性能数据，帮助你了解用户的真实体验。

## Web Vitals

SDK 采集 Google 定义的核心 Web 指标：

### LCP (Largest Contentful Paint)

最大内容绘制时间，衡量加载性能。

- 良好：< 2.5s
- 需改进：2.5s ~ 4s
- 较差：> 4s

### FID (First Input Delay)

首次输入延迟，衡量交互性能。

- 良好：< 100ms
- 需改进：100ms ~ 300ms
- 较差：> 300ms

### CLS (Cumulative Layout Shift)

累积布局偏移，衡量视觉稳定性。

- 良好：< 0.1
- 需改进：0.1 ~ 0.25
- 较差：> 0.25

### FCP (First Contentful Paint)

首次内容绘制时间。

### TTFB (Time to First Byte)

首字节时间，衡量服务器响应速度。

## 获取性能数据

```js
const metrics = monitor.getPerformanceMetrics()

console.log(metrics)
// {
//   lcp: 1234,
//   fid: 50,
//   cls: 0.05,
//   fcp: 800,
//   ttfb: 200,
//   domReady: 1500,
//   load: 2000,
// }
```

## 资源加载监控

SDK 会采集页面资源的加载情况：

- 脚本（script）
- 样式（css）
- 图片（img）
- 字体（font）
- XHR/Fetch 请求

每个资源记录：

- 资源 URL
- 资源类型
- 加载耗时
- 传输大小
- 是否命中缓存

## 长任务监控

浏览器主线程被阻塞超过 50ms 的任务会被记录：

```js
// 长任务数据示例
{
  type: 'longtask',
  duration: 120, // 毫秒
  startTime: 1500,
  attribution: 'script', // 来源
}
```

长任务会影响页面的交互响应，是性能优化的重点。

## 采样配置

高流量场景下，可以降低性能数据的采样率：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  performanceSampleRate: 0.1, // 只采样 10%
})
```

## 自定义性能标记

使用 Performance API 打点：

```js
// 开始计时
performance.mark('render-start')

// 渲染逻辑
renderComponent()

// 结束计时
performance.mark('render-end')

// 计算耗时
performance.measure('render-time', 'render-start', 'render-end')
```

SDK 会自动采集这些自定义标记。

## 性能优化建议

### 优化 LCP

- 优化服务器响应时间
- 使用 CDN
- 预加载关键资源
- 优化图片大小和格式

### 优化 FID

- 减少 JavaScript 执行时间
- 拆分长任务
- 使用 Web Worker
- 延迟加载非关键脚本

### 优化 CLS

- 为图片和视频设置尺寸
- 避免在已有内容上方插入内容
- 使用 transform 动画代替改变布局的属性

## 关闭性能监控

如果不需要性能监控：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  enablePerformance: false,
})
```
