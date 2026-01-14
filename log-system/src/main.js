/**
 * @fileoverview 应用入口
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// 全局样式
import './styles/global.scss'

// 创建应用
const app = createApp(App)

// 使用 Pinia
app.use(createPinia())

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app')
