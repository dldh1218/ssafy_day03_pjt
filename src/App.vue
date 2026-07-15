<script setup>
import AppHeader from './components/common/AppHeader.vue'
import ChatbotFloatingButton from './components/chatbot/ChatbotFloatingButton.vue'
</script>
<template>
  <AppHeader />
  <main><RouterView /></main>
  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <a class="footer-brand" href="/">LocalHub</a>
        <p>서울의 장소와 사람들의 이야기를 연결합니다.</p>
      </div>
      <div class="footer-meta">
        <nav aria-label="푸터 메뉴">
          <a href="/#districts">서울 탐색</a>
          <a href="/#community">커뮤니티</a>
          <a href="/#about">데이터 안내</a>
        </nav>
        <small>© 2026 LocalHub · SEOUL LOCAL ARCHIVE</small>
      </div>
    </div>
    <div class="footer-colors" aria-hidden="true"></div>
  </footer>
  <ChatbotFloatingButton />
</template>
