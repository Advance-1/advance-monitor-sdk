<template>
  <div class="main-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="logo-text" v-show="!sidebarCollapsed">Monitor</span>
        </div>
        <button class="collapse-btn" @click="toggleSidebar">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <!-- 项目选择器 -->
      <div class="project-selector" v-show="!sidebarCollapsed">
        <select v-model="selectedProjectId" @change="handleProjectChange">
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>

      <!-- 导航菜单 -->
      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-icon" v-html="item.icon"></span>
          <span class="nav-text" v-show="!sidebarCollapsed">{{ item.title }}</span>
        </router-link>
      </nav>

      <!-- 底部信息 -->
      <div class="sidebar-footer" v-show="!sidebarCollapsed">
        <div class="version">v1.0.0</div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 顶部栏 -->
      <header class="header">
        <div class="header-left">
          <h1 class="page-title">{{ currentPageTitle }}</h1>
        </div>
        <div class="header-right">
          <div class="time-range-selector">
            <select v-model="timeRange" @change="handleTimeRangeChange">
              <option value="1h">最近 1 小时</option>
              <option value="6h">最近 6 小时</option>
              <option value="24h">最近 24 小时</option>
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
            </select>
          </div>
          <button class="refresh-btn" @click="handleRefresh">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4V10H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M23 20V14H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- 页面内容 -->
      <div class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores'

const route = useRoute()
const appStore = useAppStore()

// 状态
const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
const projects = computed(() => appStore.projects)
const selectedProjectId = ref('')
const timeRange = ref('24h')

// 菜单配置
const menuItems = [
  {
    path: '/dashboard',
    title: '概览',
    icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/></svg>',
  },
  {
    path: '/issues',
    title: '问题列表',
    icon: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  },
  {
    path: '/performance',
    title: '性能监控',
    icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    path: '/behavior',
    title: '用户行为',
    icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M23 21V19C22.99 17.13 21.78 15.5 20 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 3C17.78 3.5 18.99 5.13 18.99 7C18.99 8.87 17.78 10.5 16 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    path: '/alerts',
    title: '告警管理',
    icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.73 21C13.37 21.64 12.71 22 12 22C11.29 22 10.63 21.64 10.27 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    path: '/settings',
    title: '项目设置',
    icon: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19.4 15C19.2 15.3 19.1 15.7 19.2 16L19.8 18.3C19.9 18.6 19.8 18.9 19.5 19.1L17.8 20.1C17.5 20.3 17.2 20.3 16.9 20.1L15 18.8C14.7 18.6 14.3 18.6 14 18.8L12.1 20.1C11.8 20.3 11.5 20.3 11.2 20.1L9.5 19.1C9.2 18.9 9.1 18.6 9.2 18.3L9.8 16C9.9 15.7 9.8 15.3 9.6 15L8.3 13.1C8.1 12.8 8.1 12.5 8.3 12.2L9.3 10.5C9.5 10.2 9.8 10.1 10.1 10.2L12.4 10.8C12.7 10.9 13.1 10.8 13.4 10.6L15.3 9.3C15.6 9.1 16 9.1 16.3 9.3L18.2 10.6C18.5 10.8 18.9 10.9 19.2 10.8L21.5 10.2C21.8 10.1 22.1 10.2 22.3 10.5L23.3 12.2C23.5 12.5 23.5 12.8 23.3 13.1L22 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
]

// 计算属性
const currentPageTitle = computed(() => {
  const item = menuItems.find(m => route.path.startsWith(m.path))
  return item?.title || ''
})

// 方法
function isActive(path) {
  return route.path.startsWith(path)
}

function toggleSidebar() {
  appStore.toggleSidebar()
}

function handleProjectChange() {
  const project = projects.value.find(p => p.id === selectedProjectId.value)
  if (project) {
    appStore.setCurrentProject(project)
  }
}

function handleTimeRangeChange() {
  // 触发全局时间范围变更事件
  window.dispatchEvent(new CustomEvent('timeRangeChange', { detail: timeRange.value }))
}

function handleRefresh() {
  window.dispatchEvent(new CustomEvent('globalRefresh'))
}

// 生命周期
onMounted(async () => {
  await appStore.initApp()
  if (appStore.currentProject) {
    selectedProjectId.value = appStore.currentProject.id
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.main-layout {
  display: flex;
  min-height: 100vh;
}

// 侧边栏
.sidebar {
  width: $sidebar-width;
  background: $color-bg-container;
  border-right: 1px solid $color-border-light;
  display: flex;
  flex-direction: column;
  transition: width $transition-base;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: $z-index-fixed;

  .sidebar-collapsed & {
    width: $sidebar-collapsed-width;
  }
}

.sidebar-header {
  @include flex-between;
  padding: $spacing-base;
  border-bottom: 1px solid $color-border-light;
}

.logo {
  @include flex-start;
  gap: $spacing-sm;
}

.logo-icon {
  width: 28px;
  height: 28px;
  color: $color-primary;
}

.logo-text {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.collapse-btn {
  @include button-ghost;
  padding: $spacing-xs;
  
  svg {
    width: 20px;
    height: 20px;
    transition: transform $transition-base;
  }

  .sidebar-collapsed & svg {
    transform: rotate(180deg);
  }
}

.project-selector {
  padding: $spacing-md $spacing-base;
  border-bottom: 1px solid $color-border-light;

  select {
    @include input-base;
    padding: $spacing-sm $spacing-md;
    cursor: pointer;
  }
}

.sidebar-nav {
  flex: 1;
  padding: $spacing-md $spacing-sm;
  overflow-y: auto;
  @include custom-scrollbar;
}

.nav-item {
  @include flex-start;
  gap: $spacing-md;
  padding: $spacing-md $spacing-base;
  margin-bottom: $spacing-xs;
  border-radius: $radius-md;
  color: $color-text-secondary;
  text-decoration: none;
  transition: all $transition-fast;

  &:hover {
    background: $color-bg-hover;
    color: $color-text-primary;
  }

  &.active {
    background: $color-primary-bg;
    color: $color-primary;
  }

  .sidebar-collapsed & {
    justify-content: center;
    padding: $spacing-md;
  }
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}

.nav-text {
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  white-space: nowrap;
}

.sidebar-footer {
  padding: $spacing-base;
  border-top: 1px solid $color-border-light;
}

.version {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  text-align: center;
}

// 主内容区
.main-content {
  flex: 1;
  margin-left: $sidebar-width;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left $transition-base;

  .sidebar-collapsed & {
    margin-left: $sidebar-collapsed-width;
  }
}

.header {
  @include flex-between;
  height: $header-height;
  padding: 0 $spacing-xl;
  background: $color-bg-container;
  border-bottom: 1px solid $color-border-light;
  position: sticky;
  top: 0;
  z-index: $z-index-sticky;
}

.header-left {
  @include flex-start;
  gap: $spacing-base;
}

.page-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.header-right {
  @include flex-start;
  gap: $spacing-md;
}

.time-range-selector {
  select {
    @include input-base;
    padding: $spacing-xs $spacing-md;
    padding-right: $spacing-xl;
    cursor: pointer;
    min-width: 140px;
  }
}

.refresh-btn {
  @include button-ghost;
  padding: $spacing-sm;

  svg {
    width: 18px;
    height: 18px;
  }
}

.page-content {
  flex: 1;
  padding: $spacing-xl;
  overflow-y: auto;
}
</style>
