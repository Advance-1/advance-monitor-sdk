# 常见问题

## 接入问题

### SDK 初始化失败

检查以下几点：

1. `appId` 和 `reportUrl` 是否正确配置
2. 是否在应用入口文件中初始化
3. 控制台是否有报错信息

### 数据没有上报

1. 检查 `reportUrl` 是否可访问
2. 检查是否被采样过滤（`sampleRate` 配置）
3. 检查是否被 `ignoreErrors` 或 `ignoreUrls` 过滤
4. 打开 `debug: true` 查看详细日志

### 框架集成后组件错误没有捕获

Vue：确保在 `app.mount()` 之前调用 `setupVue3(app)`

React：确保使用了 `ErrorBoundary` 包裹组件

## 错误监控

### 为什么错误显示 Script error.？

这是浏览器的安全限制，跨域脚本的错误信息会被隐藏。

解决方法：

1. 给 script 标签添加 `crossorigin="anonymous"`
2. 服务器返回 `Access-Control-Allow-Origin` 头

### 为什么有些错误没有堆栈信息？

可能的原因：

1. 错误是字符串而不是 Error 对象
2. 错误发生在 eval 或动态代码中
3. 浏览器不支持 Error.stack

建议：总是抛出 Error 对象而不是字符串

```js
// 不推荐
throw '出错了'

// 推荐
throw new Error('出错了')
```

### SourceMap 还原失败

检查以下几点：

1. `release` 版本是否与上传时一致
2. SourceMap 文件是否上传成功
3. 文件名是否匹配（注意 hash）

## 性能监控

### Web Vitals 数据不准确

Web Vitals 的采集依赖浏览器 API，部分老旧浏览器可能不支持。

建议关注支持的浏览器的数据，忽略不支持的。

### 性能数据量太大

降低采样率：

```js
monitor.init({
  performanceSampleRate: 0.1, // 10% 采样
})
```

## 数据上报

### 上报请求被拦截

检查是否被广告拦截插件或安全软件拦截。

建议：

1. 使用自定义域名而不是明显的监控域名
2. 使用 POST 请求而不是 GET

### 离线数据丢失

确保开启了离线缓存：

```js
monitor.init({
  enableOffline: true,
})
```

注意：localStorage 有大小限制（通常 5MB），超出会丢失数据。

## 隐私合规

### 如何满足 GDPR 要求？

1. 在用户同意前不要初始化 SDK
2. 提供退出追踪的选项
3. 配置敏感信息脱敏

```js
// 用户同意后再初始化
if (userConsent) {
  monitor.init({ ... })
}
```

### 如何不采集用户 IP？

SDK 本身不采集 IP，IP 是由服务器从请求中获取的。

如果不想记录 IP，需要在服务端配置不记录。

## 其他问题

### SDK 对性能有影响吗？

SDK 经过优化，对性能影响很小：

- 核心包约 15KB（gzip）
- 异步上报，不阻塞主线程
- 支持采样，可控制数据量

### 如何在微信小程序中使用？

目前 SDK 主要针对 Web 环境，小程序需要单独的适配版本。

### 如何自建监控服务器？

SDK 配套提供了日志系统，包含前端界面和后端服务。

详见项目中的 `log-system` 目录。
