# SourceMap

生产环境的代码通常是压缩混淆的，错误堆栈很难阅读。通过上传 SourceMap，可以将错误位置还原到源码。

## 工作原理

1. 构建时生成 SourceMap 文件
2. 将 SourceMap 上传到监控服务器
3. 错误发生时，服务器自动解析还原

## 配置 Release

初始化时设置 release 版本：

```js
monitor.init({
  appId: 'your-app-id',
  reportUrl: 'https://your-server.com/api/tracker',
  release: 'v1.2.3', // 或使用 git commit hash
})
```

建议使用构建时的版本号或 git commit hash，确保与上传的 SourceMap 对应。

## 上传 SourceMap

### 使用 CLI

安装后可以使用命令行上传：

```bash
npx advance-monitor-upload \
  --url https://your-server.com/api/sourcemaps \
  --app-id your-app-id \
  --release v1.2.3 \
  --path ./dist
```

参数说明：

| 参数 | 说明 |
| --- | --- |
| `--url` | SourceMap 上传地址 |
| `--app-id` | 应用 ID |
| `--release` | 版本号，需与 SDK 配置一致 |
| `--path` | 构建产物目录 |

### 使用 Vite 插件

```js
// vite.config.js
import { defineConfig } from 'vite'
import { advanceMonitorPlugin } from 'advance-monitor-sdk/plugins'

export default defineConfig({
  plugins: [
    advanceMonitorPlugin({
      appId: 'your-app-id',
      uploadUrl: 'https://your-server.com/api/sourcemaps',
      release: process.env.RELEASE_VERSION,
      // 构建完成后自动上传
      autoUpload: true,
      // 上传后删除本地 SourceMap
      deleteAfterUpload: true,
    }),
  ],
  build: {
    sourcemap: true, // 必须开启
  },
})
```

### 使用 Webpack 插件

```js
// webpack.config.js
const { AdvanceMonitorWebpackPlugin } = require('advance-monitor-sdk/webpack')

module.exports = {
  devtool: 'source-map',
  plugins: [
    new AdvanceMonitorWebpackPlugin({
      appId: 'your-app-id',
      uploadUrl: 'https://your-server.com/api/sourcemaps',
      release: process.env.RELEASE_VERSION,
    }),
  ],
}
```

## CI/CD 集成

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          RELEASE_VERSION: ${{ github.sha }}

      - name: Upload SourceMap
        run: |
          npx advance-monitor-upload \
            --url ${{ secrets.MONITOR_URL }}/api/sourcemaps \
            --app-id ${{ secrets.APP_ID }} \
            --release ${{ github.sha }} \
            --path ./dist

      - name: Deploy
        run: # 部署命令
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - npm ci
    - npm run build
    - npx advance-monitor-upload
        --url $MONITOR_URL/api/sourcemaps
        --app-id $APP_ID
        --release $CI_COMMIT_SHA
        --path ./dist
    - # 部署命令
```

## 安全建议

1. **不要将 SourceMap 部署到生产环境**，只上传到监控服务器
2. 使用 `deleteAfterUpload` 选项自动清理本地 SourceMap
3. 监控服务器应该做好访问控制，避免 SourceMap 泄露

## 验证上传

上传成功后，可以在日志系统的「设置 > SourceMap 管理」中查看已上传的文件。

当错误发生时，堆栈信息会自动还原：

```
// 还原前
at a.handleClick (https://example.com/assets/index.abc123.js:1:2345)

// 还原后
at ProductList.handleClick (src/components/ProductList.vue:42:10)
```

## 常见问题

### 为什么堆栈没有还原？

1. 检查 release 版本是否一致
2. 检查 SourceMap 是否上传成功
3. 检查文件名是否匹配

### SourceMap 文件很大怎么办？

1. 使用 `hidden-source-map` 模式，不在产物中引用 SourceMap
2. 只上传必要的文件，排除 node_modules 的 SourceMap
3. 定期清理旧版本的 SourceMap
