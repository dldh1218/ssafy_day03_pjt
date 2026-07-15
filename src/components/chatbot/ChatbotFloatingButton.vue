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
  <button v-if="!open" class="chat-fab" type="button" @click="open = true">
    <b>✦</b><span>서울 여행 도우미</span>
  </button>
  <section v-else class="chat-panel" aria-label="서울 여행 도우미">
    <header>
      <div><small>LOCALHUB AI</small><b>서울 여행 도우미</b></div>
      <button type="button" aria-label="닫기" @click="open = false">×</button>
    </header>
    <div ref="scrollEl" class="messages">
      <div v-if="!messages.length" class="welcome">
        <b>어떤 서울을 찾고 있나요?</b>
        <p>지역이나 관심사를 말씀해주시면 관광지·문화시설·레포츠·여행코스를 추천해드려요.</p>
      </div>
      <p v-for="(m, i) in messages" :key="i" :class="m.role">{{ m.text }}</p>
      <p v-if="pending" class="bot pending" aria-live="polite">
        <span></span><span></span><span></span>
      </p>
    </div>
    <div class="suggest">
      <button
        v-for="q in ['강남구 가볼 만한 곳', '한강 근처 문화시설', '종로구 여행 코스']"
        :key="q"
        type="button"
        @click="send(q)"
      >
        {{ q }}
      </button>
    </div>
    <form @submit.prevent="send()">
      <input
        v-model="text"
        placeholder="질문을 입력하세요"
        aria-label="챗봇 질문"
        :disabled="pending"
      /><button type="submit" :disabled="pending">↑</button>
    </form>
  </section>
</template>
