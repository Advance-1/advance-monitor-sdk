# 网络请求

SDK 会自动监控页面发起的网络请求，包括 XHR 和 Fetch。

## 采集的数据

每个请求会记录：

```js
{
  type: 'http',
  data: {
    method: 'POST',
    url: '/api/user/login',
    status: 200,
    duration: 156, // 毫秒
    requestSize: 128,
    responseSize: 512,
  }
}
```

## 请求失败监控

HTTP 状态码 >= 400 的请求会被标记为失败：

```js
{
  type: 'http_error',
  data: {
    method: 'GET',
    url: '/api/data',
    status: 500,
    statusText: 'Internal Server Error',
    duration: 2340,
  }
}
```

网络错误（如超时、断网）也会被捕获：

```js
{
  type: 'http_error',
  data: {
    method: 'POST',
    url: '/api/submit',
    error: 'Network Error',
  }
}
```

## 忽略特定请求

有些请求不需要监控，比如心跳、埋点上报：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  ignoreUrls: [
    '/api/heartbeat',
    '/api/tracker', // 避免监控自身的上报请求
    /\.png$/, // 忽略图片请求
    /analytics/, // 忽略分析相关请求
  ],
})
```

## 请求头和响应体

默认情况下，SDK 不会采集请求头和响应体，以保护隐私。

如果需要采集，可以配置：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  captureRequestHeaders: true,
  captureResponseHeaders: true,
  // 注意：响应体可能很大，谨慎开启
  captureResponseBody: false,
})
```

敏感请求头会被自动过滤：

- Authorization
- Cookie
- X-Auth-Token

## 慢请求告警

可以配置慢请求阈值：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  slowRequestThreshold: 3000, // 超过 3 秒视为慢请求
})
```

## 与链路追踪集成

开启链路追踪后，SDK 会自动在请求头中注入 trace ID：

```
traceparent: 00-abc123-def456-01
```

这样可以将前端请求与后端日志关联起来。

详见 [链路追踪](/guide/tracing)。

## 关闭网络监控

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  enableNetwork: false,
})
```
