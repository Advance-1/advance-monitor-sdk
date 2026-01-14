# 用户行为

SDK 会记录用户在页面上的操作，这些数据可以帮助你：

- 了解用户的操作路径
- 在错误发生时回溯上下文
- 分析用户行为模式

## 自动采集的行为

### 页面访问

记录用户访问的页面：

```js
{
  type: 'pageview',
  data: {
    url: 'https://example.com/product/123',
    path: '/product/123',
    title: '商品详情',
    referrer: 'https://example.com/',
  }
}
```

### 点击事件

记录用户的点击操作：

```js
{
  type: 'click',
  data: {
    selector: 'button.submit-btn',
    text: '提交订单',
    x: 500,
    y: 300,
  }
}
```

### 路由变化

SPA 应用的路由切换：

```js
{
  type: 'navigation',
  data: {
    from: '/cart',
    to: '/checkout',
  }
}
```

### 滚动行为

记录页面滚动深度：

```js
{
  type: 'scroll',
  data: {
    maxScrollDepth: 80, // 百分比
    scrollTop: 1200,
  }
}
```

### 输入行为

记录表单输入（不记录具体内容）：

```js
{
  type: 'input',
  data: {
    selector: 'input[name="email"]',
    inputType: 'email',
  }
}
```

## 面包屑

用户行为会自动转化为面包屑，当错误发生时一起上报：

```js
// 获取当前面包屑
const breadcrumbs = monitor.getBreadcrumbs()

// [
//   { type: 'navigation', data: { to: '/product/123' }, timestamp: ... },
//   { type: 'click', data: { selector: '.add-cart' }, timestamp: ... },
//   { type: 'http', data: { url: '/api/cart', method: 'POST' }, timestamp: ... },
// ]
```

手动添加面包屑：

```js
monitor.addBreadcrumb({
  type: 'user',
  category: 'auth',
  message: '用户完成登录',
  data: { method: 'wechat' },
})
```

## 自定义事件

上报业务埋点：

```js
// 简单事件
monitor.track('button_click', {
  buttonName: '立即购买',
})

// 带更多信息
monitor.track('purchase_complete', {
  orderId: '123456',
  amount: 99.9,
  items: ['item1', 'item2'],
})
```

## 配置选项

### 采样率

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  behaviorSampleRate: 0.5, // 50% 采样
})
```

### 面包屑数量

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  maxBreadcrumbs: 50, // 最多保留 50 条
})
```

### 关闭行为监控

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  enableBehavior: false,
})
```

## 隐私保护

SDK 默认不会采集敏感信息：

- 输入框的具体内容不会被记录
- 密码框会被完全忽略
- 可以配置敏感元素选择器

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  ignoreSelectors: [
    '.private-info',
    '[data-sensitive]',
  ],
})
```
