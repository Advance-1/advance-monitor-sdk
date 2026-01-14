/**
 * @fileoverview HTTP 请求封装
 */

import axios from 'axios'

// 创建 axios 实例
const request = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加项目 ID
    const projectId = localStorage.getItem('currentProjectId')
    if (projectId) {
      config.headers['X-Project-Id'] = projectId
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    
    // 根据后端返回格式处理
    if (res.code !== undefined && res.code !== 0) {
      console.error('API Error:', res.message)
      return Promise.reject(new Error(res.message || 'Error'))
    }
    
    return res
  },
  (error) => {
    console.error('Request Error:', error)
    
    // 处理特定错误
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，可以跳转登录
          break
        case 403:
          // 无权限
          break
        case 404:
          // 资源不存在
          break
        case 500:
          // 服务器错误
          break
      }
    }
    
    return Promise.reject(error)
  }
)

export default request
