<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps({ places: { type: Array, required: true }, hasActivity: Boolean })
const emit = defineEmits(['select'])
const { t, locale } = useI18n()
const districtEnglish = { 강남구: 'Gangnam-gu', 강동구: 'Gangdong-gu', 강북구: 'Gangbuk-gu', 강서구: 'Gangseo-gu', 관악구: 'Gwanak-gu', 광진구: 'Gwangjin-gu', 구로구: 'Guro-gu', 금천구: 'Geumcheon-gu', 노원구: 'Nowon-gu', 도봉구: 'Dobong-gu', 동대문구: 'Dongdaemun-gu', 동작구: 'Dongjak-gu', 마포구: 'Mapo-gu', 서대문구: 'Seodaemun-gu', 서초구: 'Seocho-gu', 성동구: 'Seongdong-gu', 성북구: 'Seongbuk-gu', 송파구: 'Songpa-gu', 양천구: 'Yangcheon-gu', 영등포구: 'Yeongdeungpo-gu', 용산구: 'Yongsan-gu', 은평구: 'Eunpyeong-gu', 종로구: 'Jongno-gu', 중구: 'Jung-gu', 중랑구: 'Jungnang-gu' }
const localDistrict = (value) => (locale.value === 'en' ? districtEnglish[value] || value : value)
const localCategory = (value) => t(`categories.${value}`, value)
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
        <h2>{{ t('ranking.title') }}</h2>
      </div>
      <p v-if="hasActivity">{{ t('ranking.active') }}</p>
      <p v-else>{{ t('ranking.fallback') }}</p>
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
        <img v-if="place.image" :src="place.image" :alt="t('ranking.view', { place: place.title })" />
        <span v-else class="polaroid-placeholder">SEOUL</span>
        <span class="polaroid-info">
          <b>{{ place.title }}</b>
          <small>{{ localDistrict(place.district) }} · {{ localCategory(place.category) }}</small>
          <em v-if="hasActivity">{{ t('ranking.posts') }} {{ place.postCount }} · {{ t('ranking.comments') }} {{ place.commentCount }}</em>
          <em v-else>{{ t('ranking.waiting') }}</em>
        </span>
      </button>
    </div>
  </section>
</template>
