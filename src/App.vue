<script setup>
import AppHeader from './components/common/AppHeader.vue'
import ChatbotFloatingButton from './components/chatbot/ChatbotFloatingButton.vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
<template>
  <AppHeader />
  <main><RouterView /></main>
  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <a class="footer-brand" href="/">LocalHub</a>
        <p>{{ t('footer.description') }}</p>
      </div>
      <div class="footer-meta">
        <nav :aria-label="t('nav.data')">
          <a href="/#districts">{{ t('nav.explore') }}</a>
          <a href="/#community">{{ t('nav.community') }}</a>
          <a href="/#about">{{ t('nav.data') }}</a>
        </nav>
        <small>© 2026 LocalHub · SEOUL LOCAL ARCHIVE</small>
      </div>
    </div>
    <div class="footer-colors" aria-hidden="true"></div>
  </footer>
  <ChatbotFloatingButton />
</template>
