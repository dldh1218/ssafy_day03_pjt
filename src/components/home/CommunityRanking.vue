<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps({ places: { type: Array, required: true }, hasActivity: Boolean })
const emit = defineEmits(['select'])
const section = ref(null)
const visible = ref(false)
let observer

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      visible.value = entry.isIntersecting
    },
    { threshold: 0.12 },
  )
  observer.observe(section.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section ref="section" class="community-ranking" :class="{ visible }">
    <div class="section-head">
      <div>
        <p class="eyebrow">COMMUNITY RANKING</p>
        <h2>지금 서울人이 이야기하는 곳</h2>
      </div>
      <p v-if="hasActivity">게시글과 댓글, 최근 활동을 기준으로 집계한 장소입니다.</p>
      <p v-else>현재 가장 많은 이야기가 있는 입니다.</p>
    </div>
    <div class="ranking-line" aria-hidden="true"></div>
    <div class="polaroid-list">
      <button
        v-for="(place, index) in places"
        :key="place.id"
        type="button"
        class="polaroid-card"
        :style="{ '--card-index': index, '--reverse-index': 4 - index }"
        @click="emit('select', place)"
      >
        <span class="peg" aria-hidden="true"></span>
        <span class="rank-number">0{{ index + 1 }}</span>
        <img v-if="place.image" :src="place.image" :alt="`${place.title} 전경`" />
        <span v-else class="polaroid-placeholder">SEOUL</span>
        <span class="polaroid-info">
          <b>{{ place.title }}</b>
          <small>{{ place.district }} · {{ place.category }}</small>
          <em v-if="hasActivity">글 {{ place.postCount }} · 댓글 {{ place.commentCount }}</em>
          <em v-else>첫 이야기를 기다리고 있어요</em>
        </span>
      </button>
    </div>
  </section>
</template>
