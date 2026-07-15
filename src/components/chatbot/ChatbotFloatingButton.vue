<script setup>
import { ref, nextTick, watch } from 'vue'
import { useChatbot } from '../../composables/useChatbot.js'
const open = ref(false),
  text = ref(''),
  scrollEl = ref(null)
const { messages, pending, send: ask } = useChatbot()
function scrollToBottom() {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}
function send(q = text.value) {
  if (!q.trim() || pending.value) return
  text.value = ''
  ask(q)
}
watch([messages, pending], scrollToBottom, { deep: true })
</script>
<template>
  <button
    v-if="!open"
    class="chat-fab"
    type="button"
    aria-label="서울 여행 도우미 열기"
    @click="open = true"
  >
    <span class="chat-fab-icon" aria-hidden="true">✦</span>
    <span class="chat-fab-copy"><small>LOCALHUB AI</small><b>서울 여행 도우미</b></span>
  </button>
  <section v-else class="chat-panel" role="dialog" aria-label="서울 여행 도우미">
    <div class="chat-obang" aria-hidden="true"></div>
    <header class="chat-header">
      <span class="chat-avatar" aria-hidden="true">LH</span>
      <div class="chat-heading">
        <small>LOCALHUB AI GUIDE</small>
        <b>서울 여행 도우미</b>
        <span><i></i> 서울 장소 데이터 연결됨</span>
      </div>
      <button class="chat-close" type="button" aria-label="닫기" @click="open = false">×</button>
    </header>
    <div ref="scrollEl" class="messages">
      <div v-if="!messages.length" class="welcome">
        <span class="welcome-mark" aria-hidden="true">✦</span>
        <small>SEOUL CURATION</small>
        <b>어떤 서울을 찾고 있나요?</b>
        <p>지역이나 관심사를 말씀해주시면 관광지·문화시설·레포츠·여행코스를 추천해드려요.</p>
      </div>
      <div v-for="(m, i) in messages" :key="i" class="chat-message-row" :class="m.role">
        <span v-if="m.role !== 'user'" class="message-avatar" aria-hidden="true">LH</span>
        <p>{{ m.text }}</p>
      </div>
      <div v-if="pending" class="chat-message-row bot" aria-live="polite">
        <span class="message-avatar" aria-hidden="true">LH</span>
        <p class="pending"><span></span><span></span><span></span></p>
      </div>
    </div>
    <div class="suggest">
      <small>추천 질문</small>
      <button
        v-for="q in ['강남구 가볼 만한 곳', '한강 근처 문화시설', '종로구 여행 코스']"
        :key="q"
        type="button"
        @click="send(q)"
      >
        {{ q }}
      </button>
    </div>
    <div class="chat-composer-wrap">
      <form class="chat-composer" @submit.prevent="send()">
        <input
          v-model="text"
          placeholder="서울에서 무엇을 하고 싶으세요?"
          aria-label="챗봇 질문"
          :disabled="pending"
        />
        <button type="submit" aria-label="질문 보내기" :disabled="pending">↑</button>
      </form>
      <p>AI 답변은 실제 정보와 다를 수 있어요.</p>
    </div>
  </section>
</template>
