<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">404</div>
      <h1 class="error-title">页面未找到</h1>
      <p class="error-desc">抱歉，您访问的页面不存在</p>
      <router-link to="/" class="back-btn">返回首页</router-link>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '@/styles/mixins.scss';

.error-page {
  min-height: 100vh;
  @include flex-center;
  background: $color-bg-page;
}

.error-content {
  text-align: center;
}

.error-code {
  font-size: 120px;
  font-weight: $font-weight-bold;
  color: $color-border;
  line-height: 1;
  margin-bottom: $spacing-lg;
}

.error-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin-bottom: $spacing-sm;
}

.error-desc {
  font-size: $font-size-base;
  color: $color-text-tertiary;
  margin-bottom: $spacing-xl;
}

.back-btn {
  @include button-primary;
  text-decoration: none;
}
</style>
