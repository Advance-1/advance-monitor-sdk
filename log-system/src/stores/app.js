/**
 * @fileoverview 应用全局 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export const useAppStore = defineStore('app', () => {
  // 状态
  const sidebarCollapsed = ref(false)
  const currentProject = ref(null)
  const projects = ref([])
  const user = ref(null)
  const theme = ref('light')
  const loading = ref(false)

  // 计算属性
  const isLoggedIn = computed(() => !!user.value)
  const projectId = computed(() => currentProject.value?.id)

  // 切换侧边栏
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // 设置当前项目
  function setCurrentProject(project) {
    currentProject.value = project
    localStorage.setItem('currentProjectId', project?.id || '')
  }

  // 获取项目列表
  async function fetchProjects() {
    try {
      const res = await api.projects.getList()
      projects.value = res.data || []
      
      // 恢复上次选择的项目
      const savedProjectId = localStorage.getItem('currentProjectId')
      if (savedProjectId) {
        const project = projects.value.find(p => p.id === savedProjectId)
        if (project) {
          currentProject.value = project
        }
      }
      
      // 如果没有选中项目，默认选择第一个
      if (!currentProject.value && projects.value.length > 0) {
        currentProject.value = projects.value[0]
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  // 设置主题
  function setTheme(newTheme) {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  // 初始化应用
  async function initApp() {
    loading.value = true
    try {
      // 恢复主题
      const savedTheme = localStorage.getItem('theme') || 'light'
      setTheme(savedTheme)
      
      // 获取项目列表
      await fetchProjects()
    } catch (error) {
      console.error('Failed to init app:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    sidebarCollapsed,
    currentProject,
    projects,
    user,
    theme,
    loading,
    // 计算属性
    isLoggedIn,
    projectId,
    // 方法
    toggleSidebar,
    setCurrentProject,
    fetchProjects,
    setTheme,
    initApp,
  }
})
