import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Advance Monitor',
  description: '轻量级前端监控 SDK',
  lang: 'zh-CN',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: 'API', link: '/api/core' },
      { text: '更新日志', link: '/changelog' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/introduction' },
            { text: '快速上手', link: '/guide/getting-started' },
            { text: '配置项', link: '/guide/configuration' },
          ],
        },
        {
          text: '核心功能',
          items: [
            { text: '错误监控', link: '/guide/error-tracking' },
            { text: '性能监控', link: '/guide/performance' },
            { text: '用户行为', link: '/guide/behavior' },
            { text: '网络请求', link: '/guide/network' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '框架集成', link: '/guide/framework' },
            { text: 'SourceMap', link: '/guide/sourcemap' },
            { text: '链路追踪', link: '/guide/tracing' },
            { text: '数据分析', link: '/guide/analytics' },
          ],
        },
        {
          text: '最佳实践',
          items: [
            { text: '生产环境部署', link: '/guide/production' },
            { text: '常见问题', link: '/guide/faq' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '核心方法', link: '/api/core' },
            { text: '配置选项', link: '/api/options' },
            { text: '插件', link: '/api/plugins' },
            { text: '工具函数', link: '/api/utils' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024',
    },

    search: {
      provider: 'local',
    },

    outline: {
      label: '目录',
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
  },
})
