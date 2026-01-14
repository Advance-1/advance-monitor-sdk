/**
 * @fileoverview 路由配置
 */

import { createRouter, createWebHistory } from 'vue-router'

// 路由配置
const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '概览', icon: 'dashboard' },
      },
      {
        path: 'issues',
        name: 'Issues',
        component: () => import('@/views/issues/index.vue'),
        meta: { title: '问题列表', icon: 'issues' },
      },
      {
        path: 'issues/:id',
        name: 'IssueDetail',
        component: () => import('@/views/issues/detail.vue'),
        meta: { title: '问题详情', hidden: true },
      },
      {
        path: 'performance',
        name: 'Performance',
        component: () => import('@/views/performance/index.vue'),
        meta: { title: '性能监控', icon: 'performance' },
      },
      {
        path: 'performance/waterfall',
        name: 'Waterfall',
        component: () => import('@/views/performance/waterfall.vue'),
        meta: { title: '资源瀑布图', hidden: true },
      },
      {
        path: 'performance/longtasks',
        name: 'LongTasks',
        component: () => import('@/views/performance/longtasks.vue'),
        meta: { title: '长任务分析', hidden: true },
      },
      {
        path: 'behavior',
        name: 'Behavior',
        component: () => import('@/views/behavior/index.vue'),
        meta: { title: '用户行为', icon: 'behavior' },
      },
      {
        path: 'analytics',
        name: 'Analytics',
        component: () => import('@/views/analytics/index.vue'),
        meta: { title: '数据分析', icon: 'analytics' },
      },
      {
        path: 'alerts',
        name: 'Alerts',
        component: () => import('@/views/alerts/index.vue'),
        meta: { title: '告警管理', icon: 'alerts' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '项目设置', icon: 'settings' },
      },
      {
        path: 'settings/sourcemaps',
        name: 'SourceMaps',
        component: () => import('@/views/settings/sourcemaps.vue'),
        meta: { title: 'SourceMap 管理', hidden: true },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/index.vue'),
        meta: { title: '数据报表', icon: 'reports' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - Advance Monitor` : 'Advance Monitor'
  next()
})

export default router
