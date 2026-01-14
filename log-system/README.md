# Advance Monitor Log System

企业级前端监控日志系统，参考 Sentry 设计，基于 Vue3 + JavaScript 技术栈。

## 功能特性

- **错误监控** - JS 运行时错误、Promise 错误、资源加载错误
- **性能监控** - Web Vitals (LCP, FID, CLS, TTFB)、页面加载性能
- **用户行为** - 点击、输入、滚动、路由变化、页面访问
- **告警管理** - 自定义告警规则、多渠道通知

## 技术栈

### 前端
- Vue 3 (组合式 API)
- Pinia 状态管理
- Vue Router 路由
- SCSS 样式 (CSS Tokens 体系)
- ECharts 图表
- Axios HTTP 请求

### 后端
- Express.js
- JSON 文件存储

## 快速开始

### 安装依赖

```bash
# 前端依赖
pnpm install

# 后端依赖
cd server && pnpm install
```

### 启动开发服务

```bash
# 启动后端服务 (端口 8080)
cd server && pnpm start

# 启动前端开发服务 (端口 3000)
pnpm dev
```

### 访问

- 前端: http://localhost:3000
- API: http://localhost:8080/api

## 目录结构

```
log-system/
├── src/
│   ├── api/              # API 接口
│   ├── layouts/          # 布局组件
│   ├── router/           # 路由配置
│   ├── stores/           # Pinia 状态管理
│   ├── styles/           # 全局样式
│   │   ├── variables.scss  # 设计变量
│   │   ├── mixins.scss     # 混入
│   │   └── global.scss     # 全局样式
│   ├── utils/            # 工具函数
│   ├── views/            # 页面组件
│   │   ├── dashboard/      # 概览
│   │   ├── issues/         # 问题列表
│   │   ├── performance/    # 性能监控
│   │   ├── behavior/       # 用户行为
│   │   ├── alerts/         # 告警管理
│   │   └── settings/       # 项目设置
│   ├── App.vue
│   └── main.js
├── server/
│   ├── index.js          # 后端入口
│   ├── data/             # JSON 数据存储
│   └── package.json
├── public/
├── index.html
├── vite.config.js
└── package.json
```

## SDK 集成

```javascript
import monitor from 'advance-monitor-sdk'

monitor.init({
  dsn: 'http://localhost:8080/api/tracker',
  appId: 'your-app-id',
  appVersion: '1.0.0',
  environment: 'production',
})

// Vue 3 集成
monitor.setupVue3(app)
```

## API 接口

### 数据上报
- `POST /api/tracker` - 接收监控数据

### 问题管理
- `GET /api/issues` - 获取问题列表
- `GET /api/issues/:id` - 获取问题详情
- `PUT /api/issues/:id/status` - 更新问题状态

### 性能监控
- `GET /api/performance/overview` - 性能概览
- `GET /api/performance/chart` - 性能趋势图表

### 用户行为
- `GET /api/behavior/overview` - 行为概览
- `GET /api/behavior/pageviews` - 页面访问数据

### 告警管理
- `GET /api/alerts` - 获取告警规则
- `POST /api/alerts` - 创建告警规则
- `PUT /api/alerts/:id` - 更新告警规则
- `DELETE /api/alerts/:id` - 删除告警规则
