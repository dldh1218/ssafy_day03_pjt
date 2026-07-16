<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../../composables/useTheme.js'
const open = ref(false)
const { t, locale } = useI18n()
const { dark, toggleTheme } = useTheme()
const setLocale = (value) => {
  locale.value = value
  localStorage.setItem('localhub-locale', value)
  document.documentElement.lang = value
}
</script>
<template>
  <header class="site-header">
    <RouterLink class="brand" to="/"
      ><span class="brand-mark">LH</span
      ><span class="brand-copy"><b>LocalHub</b><small>SEOUL LOCAL ARCHIVE</small></span></RouterLink
    >
    <button class="menu" type="button" :aria-label="t('controls.menu')" @click="open = !open">☰</button>
    <nav :class="{ open }">
      <RouterLink to="/">{{ t('nav.explore') }}</RouterLink>
      <a href="/#categories">{{ t('nav.categories') }}</a>
      <a href="/#community">{{ t('nav.community') }}</a>
    </nav>
    <div class="header-controls">
      <div class="locale-switch" role="group" :aria-label="t('controls.language')">
        <button type="button" :class="{ active: locale === 'ko' }" @click="setLocale('ko')">KO</button>
        <button type="button" :class="{ active: locale === 'en' }" @click="setLocale('en')">EN</button>
      </div>
      <button class="theme-toggle" type="button" :aria-label="t(dark ? 'controls.light' : 'controls.dark')" :title="t(dark ? 'controls.light' : 'controls.dark')" @click="toggleTheme">
        <span aria-hidden="true">{{ dark ? '☀' : '☾' }}</span>
      </button>
    </div>
  </header>
</template>
