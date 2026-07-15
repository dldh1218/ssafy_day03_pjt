<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { categories } from '../data/categories.js'
import { useSeoulPlaces } from '../composables/useSeoulPlaces.js'
import { useCommunityPosts } from '../composables/useCommunityPosts.js'
import { useCommunityComments } from '../composables/useCommunityComments.js'
import CommunityRanking from '../components/home/CommunityRanking.vue'
const router = useRouter(),
  features = ref([]),
  selected = ref(null),
  { places, load } = useSeoulPlaces(),
  { latest, posts } = useCommunityPosts(),
  { comments } = useCommunityComments()
const shown = ref(8)
const searchQuery = ref('')
const reelOne = ref([])
const reelTwo = ref([])
const categoryOrder = ['관광지', '여행 코스', '문화시설', '축제공연행사', '레포츠', '숙박', '쇼핑']
const orderedCategories = computed(() =>
  categoryOrder.map((name) => categories.find((category) => category.name === name)),
)
const project = ([x, y]) => [(x - 126.76) * 620, (37.71 - y) * 760],
  ring = (r) => r.map((p, i) => `${i ? 'L' : 'M'}${project(p)}`).join(' ') + 'Z',
  path = (f) =>
    (f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat(1))
      .map(ring)
      .join(' '),
  name = (f) => f?.properties?.SIG_KOR_NM
const outerRing = (feature) =>
  feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates[0]
    : feature.geometry.coordinates.reduce(
        (largest, polygon) => (polygon[0].length > largest.length ? polygon[0] : largest),
        [],
      )
const center = (feature) => {
  const points = outerRing(feature).map(project)
  const xValues = points.map(([x]) => x)
  const yValues = points.map(([, y]) => y)
  return {
    x: (Math.min(...xValues) + Math.max(...xValues)) / 2,
    y: (Math.min(...yValues) + Math.max(...yValues)) / 2,
  }
}
const go = (d) => router.push(`/explore/${encodeURIComponent(d)}`)
const count = (c) => places.value.filter((p) => p.category === c).length
const firstImage = (category) =>
  places.value.find((place) => place.category === category && place.image)?.image
const visible = computed(() => latest.value.slice(0, shown.value))
const hasCommunityRanking = computed(() => posts.value.length > 0)
const rankedPlaces = computed(() => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const postStats = posts.value.reduce((stats, post) => {
    const current = stats.get(post.placeId) || { posts: 0, recent: 0 }
    current.posts += 1
    if (new Date(post.createdAt).getTime() >= weekAgo) current.recent += 1
    stats.set(post.placeId, current)
    return stats
  }, new Map())
  const commentCounts = comments.value.reduce((stats, comment) => {
    const post = posts.value.find((item) => item.id === comment.postId)
    if (post) stats.set(post.placeId, (stats.get(post.placeId) || 0) + 1)
    return stats
  }, new Map())
  const ranked = places.value
    .map((place) => {
      const stats = postStats.get(place.id) || { posts: 0, recent: 0 }
      const commentCount = commentCounts.get(place.id) || 0
      return {
        ...place,
        postCount: stats.posts,
        commentCount,
        score: stats.posts * 3 + commentCount * 2 + stats.recent * 4,
      }
    })
    .filter((place) => place.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  return ranked.length ? ranked : places.value.filter((place) => place.image).slice(0, 5)
})
const searchPlaces = () => {
  const query = searchQuery.value.trim()
  router.push({ path: '/explore/서울전체', query: query ? { q: query } : {} })
}
watch(
  places,
  (items) => {
    if (!items.length || reelOne.value.length) return
    const candidates = items.filter((place) => place.image)
    const shuffled = [...candidates]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
    }
    reelOne.value = shuffled.slice(0, 6)
    reelTwo.value = shuffled.slice(6, 12)
  },
  { immediate: true },
)
onMounted(async () => {
  load()
  try {
    features.value = (await (await fetch('/data/seoul/seoul-districts.geojson')).json()).features
  } catch {}
})
</script>
<template>
  <div class="home">
    <section class="hero">
      <div class="hero-motion" aria-hidden="true">
        <span class="motion-orb orb-one"></span>
        <span class="motion-orb orb-two"></span>
        <span class="motion-ring"></span>
        <span class="motion-word word-one">CULTURE</span>
        <span class="motion-word word-two">PLAY</span>
        <span class="motion-word word-three">STAY</span>
      </div>
      <div class="hero-copy">
        <p class="eyebrow">LOCALHUB · SEOUL TRAVEL GUIDE</p>
        <h1><span>SEOUL</span><em>오늘, 서울을 발견하는 방법</em></h1>
        <p>
          관광지부터 공연, 쇼핑, 레포츠, 숙소까지. 지금 내 취향에 맞는 서울을 한곳에서 발견하세요.
        </p>
        <form class="hero-search" role="search" @submit.prevent="searchPlaces">
          <span aria-hidden="true">⌕</span>
          <input
            v-model="searchQuery"
            type="search"
            list="place-suggestions"
            placeholder="지역, 장소, 하고 싶은 일을 검색해보세요"
            aria-label="서울 장소 통합 검색"
          />
          <datalist id="place-suggestions">
            <option v-for="place in places.slice(0, 80)" :key="place.id" :value="place.title" />
          </datalist>
          <button type="submit">검색</button>
        </form>
        <div class="hero-actions">
          <a class="primary" href="#districts">서울 탐색 시작하기 <span>↘</span></a>
          <span class="hero-index"><b>7</b> WAYS TO ENJOY</span>
        </div>
      </div>
      <div class="hero-rail" aria-hidden="true"><span>SCROLL TO EXPLORE</span><b>↘</b></div>
      <div class="hero-caption">
        <span>LIVE CURATION</span>
        <p>서울에서 보내는 오늘을 더 다채롭게</p>
      </div>
    </section>
    <CommunityRanking
      :places="rankedPlaces"
      :has-activity="hasCommunityRanking"
      @select="(place) => router.push(`/explore/${place.district}?placeId=${place.id}`)"
    />
    <section id="districts">
      <div class="section-head">
        <div>
          <p class="eyebrow">DISTRICT EXPLORER</p>
          <h2>궁금한 자치구를 선택해보세요</h2>
        </div>
        <p>지도 위 자치구를 누르면 그 지역의 장소와 이야기를 만날 수 있어요.</p>
      </div>
      <div class="map-wrap map-only">
        <svg viewBox="-8 -4 282 230" aria-label="서울 자치구 지도">
          <g
            v-for="f in features"
            :key="name(f)"
            class="district-shape"
            :class="{ active: name(f) === name(selected) }"
            tabindex="0"
            role="button"
            :aria-label="`${name(f)} 둘러보기`"
            @mouseenter="selected = f"
            @mouseleave="selected = null"
            @focus="selected = f"
            @blur="selected = null"
            @click="go(name(f))"
            @keydown.enter="go(name(f))"
            @keydown.space.prevent="go(name(f))"
          >
            <path :d="path(f)" />
          </g>
          <text
            v-for="f in features"
            :key="`label-${name(f)}`"
            class="district-label"
            :class="{ active: name(f) === name(selected) }"
            :x="center(f).x"
            :y="center(f).y"
          >
            {{ name(f) }}
          </text>
        </svg>
      </div>
    </section>
    <section>
      <div class="section-head">
        <div>
          <p class="eyebrow">EXPLORE BY CATEGORY</p>
          <h2>취향에 맞는 서울을 골라보세요</h2>
        </div>
      </div>
      <div class="category-showcase">
        <div class="category-grid">
          <button
            v-for="c in orderedCategories"
            :key="c.name"
            type="button"
            class="category-card"
            :style="{ '--tone': c.tone }"
            @click="router.push({ path: '/explore/서울전체', query: { category: c.name } })"
          >
            <div class="category-image">
              <img
                v-if="firstImage(c.name)"
                :src="firstImage(c.name)"
                :alt="`${c.name} 대표 이미지`"
              />
              <span v-else>{{ c.icon }}</span>
            </div>
            <div class="category-copy">
              <small>{{ count(c.name).toLocaleString() }} PLACES</small>
              <h3>{{ c.name }}</h3>
              <p>{{ c.name }}로 만나는 새로운 서울의 표정</p>
              <b>둘러보기 →</b>
            </div>
          </button>
        </div>
        <aside class="place-reels" aria-label="서울 장소 사진 모음">
          <div class="photo-reel reel-up">
            <div class="reel-track">
              <article v-for="(place, index) in [...reelOne, ...reelOne]" :key="`up-${index}`">
                <img :src="place.image" :alt="place.title" />
                <span>{{ place.title }}</span>
              </article>
            </div>
          </div>
          <div class="photo-reel reel-down">
            <div class="reel-track">
              <article v-for="(place, index) in [...reelTwo, ...reelTwo]" :key="`down-${index}`">
                <img :src="place.image" :alt="place.title" />
                <span>{{ place.title }}</span>
              </article>
            </div>
          </div>
        </aside>
      </div>
    </section>
    <section id="community">
      <div class="section-head">
        <div>
          <p class="eyebrow">COMMUNITY</p>
          <h2>서울人의 최신 이야기</h2>
        </div>
        <p>LocalHub 이용자들이 장소에서 남긴 최신 후기를 확인해보세요.</p>
      </div>
      <div v-if="visible.length" class="post-grid">
        <article
          v-for="p in visible"
          :key="p.id"
          @click="router.push(`/explore/${p.district}?placeId=${p.placeId}`)"
        >
          <small>{{ p.category }} · {{ p.district }}</small>
          <h3>{{ p.title }}</h3>
          <p>{{ p.content.slice(0, 90) }}</p>
          <span>{{ p.placeName }} · 조회 {{ p.views }}</span>
        </article>
      </div>
      <div v-else class="empty">
        <b>아직 등록된 이야기가 없습니다.</b>
        <p>서울의 장소를 둘러보고 첫 번째 후기를 남겨보세요.</p>
      </div>
      <button v-if="shown < latest.length" class="more" type="button" @click="shown += 8">
        이야기 더 보기
      </button>
    </section>
    <section id="about" class="data-note">
      <b>서울 열린데이터를 더 가깝게.</b>
      <p>한국관광공사 TourAPI 4.0과 서울 자치구 경계 데이터를 활용했습니다.</p>
    </section>
  </div>
</template>
