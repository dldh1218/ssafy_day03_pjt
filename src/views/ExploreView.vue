<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster'
import { categories } from '../data/categories.js'
import { useSeoulPlaces } from '../composables/useSeoulPlaces.js'
import { useCommunityPosts } from '../composables/useCommunityPosts.js'
import { useCommunityComments } from '../composables/useCommunityComments.js'

const MARKER_TONE = Object.fromEntries(categories.map((item) => [item.name, item.tone]))
const categoryIcon = Object.fromEntries(categories.map((item) => [item.name, item.icon]))
const route = useRoute()
const district = computed(() => decodeURIComponent(route.params.district))
const category = ref(route.query.category || '전체')
const search = ref(route.query.q || '')
const selected = ref(null)
const formOpen = ref(false)
const editingPost = ref(null)
const postDraft = ref({ title: '', content: '', password: '' })
const formError = ref('')
const commentDrafts = ref({})
const commenterName = ref(localStorage.getItem('localhub_current_user_v1') || '')
const mapEl = ref(null)
const { places, load } = useSeoulPlaces()
const { posts, create: createPost, update: updatePost, remove: removePost } = useCommunityPosts()
const { comments, create: createComment, remove: removeComment } = useCommunityComments()

const filteredPlaces = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ko-KR')
  return places.value.filter(
    (place) =>
      (district.value === '서울전체' || place.district === district.value) &&
      (category.value === '전체' || place.category === category.value) &&
      (!query || place.title.toLocaleLowerCase('ko-KR').includes(query)),
  )
})
const selectedPlacePosts = computed(() =>
  posts.value
    .filter((post) => post.placeId === selected.value?.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
)

let map = null
let markerLayer = null
let boundaryLayer = null
let districtFeatures = []
let resizeObserver = null
let lastDistrict = null
let suppressAutoFit = false
let userInteracted = false
const markerRefs = new Map()

function buildMarkerIcon(place, isSelected = false) {
  const color = MARKER_TONE[place.category] || '#7a8a90'
  const icon = categoryIcon[place.category] || '●'
  return L.divIcon({
    className: 'place-pin-wrap',
    html: `<span class="place-pin${isSelected ? ' is-selected' : ''}" style="--pin-color:${color}"><i>${icon}</i></span>`,
    iconSize: isSelected ? [38, 38] : [30, 30],
    iconAnchor: isSelected ? [19, 19] : [15, 15],
  })
}
function buildClusterIcon(cluster) {
  const count = cluster.getChildCount()
  const size = count < 10 ? 'sm' : count < 30 ? 'md' : 'lg'
  const pixels = { sm: 34, md: 42, lg: 50 }[size]
  return L.divIcon({
    className: 'cluster-pin-wrap',
    html: `<span class="cluster-pin cluster-pin--${size}">${count}</span>`,
    iconSize: [pixels, pixels],
  })
}
function fitToPoints(points) {
  if (!map || !points.length) return
  suppressAutoFit = true
  const release = () => (suppressAutoFit = false)
  map.once('moveend', release)
  window.setTimeout(release, 800)
  map.flyToBounds(points, { padding: [48, 48], maxZoom: 15, duration: 0.6 })
}
function renderMarkers() {
  if (!map || !markerLayer) return
  markerLayer.clearLayers()
  markerRefs.clear()
  const points = []
  filteredPlaces.value.forEach((place) => {
    if (!place.lat || !place.lng) return
    const marker = L.marker([place.lat, place.lng], {
      icon: buildMarkerIcon(place, selected.value?.id === place.id),
    })
      .bindTooltip(place.title, { direction: 'top', offset: [0, -18] })
      .on('click', () => (selected.value = place))
    markerLayer.addLayer(marker)
    markerRefs.set(place.id, marker)
    points.push([place.lat, place.lng])
  })
  if (!userInteracted) fitToPoints(points)
}
function renderBoundary() {
  if (!map) return
  if (boundaryLayer) map.removeLayer(boundaryLayer)
  boundaryLayer = null
  if (district.value === '서울전체') return
  const feature = districtFeatures.find((item) => item.properties?.SIG_KOR_NM === district.value)
  if (!feature) return
  boundaryLayer = L.geoJSON(feature, {
    style: { color: '#175a8c', weight: 2, fillColor: '#80b4c7', fillOpacity: 0.15 },
  }).addTo(map)
}
function commentsFor(postId) {
  return comments.value.filter((comment) => comment.postId === postId)
}
function openPostForm() {
  editingPost.value = null
  postDraft.value = { title: '', content: '', password: '' }
  formError.value = ''
  formOpen.value = true
}
function editPost(post) {
  editingPost.value = post
  postDraft.value = { title: post.title, content: post.content, password: '' }
  formError.value = ''
  formOpen.value = true
}
function submitPost() {
  formError.value = ''
  if (postDraft.value.title.trim().length < 2)
    return (formError.value = '제목은 2자 이상 입력하세요.')
  if (postDraft.value.content.trim().length < 5)
    return (formError.value = '내용은 5자 이상 입력하세요.')
  if (!/^\d{4,}$/.test(postDraft.value.password))
    return (formError.value = '비밀번호는 숫자 4자리 이상이어야 합니다.')

  if (editingPost.value) {
    const updated = updatePost(
      editingPost.value.id,
      { title: postDraft.value.title, content: postDraft.value.content },
      postDraft.value.password,
    )
    if (!updated) return (formError.value = '비밀번호가 일치하지 않습니다.')
  } else {
    createPost({
      ...postDraft.value,
      placeId: selected.value.id,
      placeName: selected.value.title,
      district: selected.value.district,
      category: selected.value.category,
    })
  }
  formOpen.value = false
}
function deletePost(post) {
  const password = window.prompt('게시글 비밀번호를 입력하세요.')
  if (password !== null && !removePost(post.id, password))
    window.alert('비밀번호가 일치하지 않습니다.')
}
function submitComment(postId) {
  const draft = commentDrafts.value[postId]
  if (!commenterName.value.trim() || !draft?.content.trim() || !/^\d{4,}$/.test(draft.password)) {
    window.alert('이름, 댓글 내용, 숫자 4자리 이상의 비밀번호를 입력하세요.')
    return
  }
  localStorage.setItem('localhub_current_user_v1', commenterName.value.trim())
  createComment({ postId, author: commenterName.value.trim(), ...draft })
  commentDrafts.value[postId] = { content: '', password: '' }
}
function deleteComment(comment) {
  const password = window.prompt('댓글 비밀번호를 입력하세요.')
  if (password !== null && !removeComment(comment.id, password))
    window.alert('비밀번호가 일치하지 않습니다.')
}

onMounted(async () => {
  await load()
  selected.value =
    places.value.find((place) => place.id === route.query.placeId) || filteredPlaces.value[0]
  map = L.map(mapEl.value, { scrollWheelZoom: false, zoomControl: false }).setView(
    [37.5665, 126.978],
    11,
  )
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)
  L.control.zoom({ position: 'topright' }).addTo(map)
  map.on('dragstart zoomstart', () => {
    if (!suppressAutoFit) userInteracted = true
  })
  markerLayer = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: buildClusterIcon,
  }).addTo(map)
  renderMarkers()
  resizeObserver = new ResizeObserver(() => map?.invalidateSize())
  resizeObserver.observe(mapEl.value)
  try {
    const response = await fetch('/data/seoul/seoul-districts.geojson')
    districtFeatures = (await response.json()).features || []
    renderBoundary()
  } catch {
    districtFeatures = []
  }
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
})
watch(filteredPlaces, (items) => {
  if (district.value !== lastDistrict) {
    lastDistrict = district.value
    userInteracted = false
  }
  if (!items.includes(selected.value)) selected.value = items[0] || null
  renderMarkers()
})
watch(selected, (next, previous) => {
  if (previous) markerRefs.get(previous.id)?.setIcon(buildMarkerIcon(previous, false))
  if (next) markerRefs.get(next.id)?.setIcon(buildMarkerIcon(next, true))
})
watch(district, renderBoundary)
watch(
  selectedPlacePosts,
  (items) =>
    items.forEach((post) => (commentDrafts.value[post.id] ||= { content: '', password: '' })),
  { immediate: true },
)
</script>

<template>
  <div class="explore">
    <section class="explore-top">
      <p class="eyebrow">SEOUL DISTRICT GUIDE</p>
      <h1>{{ district }}</h1>
      <p>지역의 장소를 지도에서 고르고 자세한 정보와 이야기를 확인해보세요.</p>
      <div class="filters">
        <button
          v-for="item in ['전체', ...categories.map((entry) => entry.name)]"
          :key="item"
          type="button"
          :class="{ active: category === item }"
          @click="category = item"
        >
          {{ item }}
        </button>
      </div>
      <input
        v-model="search"
        class="search"
        type="search"
        placeholder="장소 이름 검색"
        aria-label="장소 검색"
      />
    </section>
    <div class="explore-layout">
      <section class="place-map" aria-label="장소 지도">
        <div ref="mapEl" class="leaflet-map"></div>
        <div v-if="!filteredPlaces.length" class="map-empty">조건에 맞는 장소가 없습니다.</div>
      </section>
      <aside v-if="selected" class="sidebar">
        <button class="close" type="button" aria-label="상세 닫기" @click="selected = null">
          ×
        </button>
        <div
          class="place-image"
          :style="selected.image ? { backgroundImage: `url(${selected.image})` } : null"
        >
          <span v-if="!selected.image">{{ selected.category }}</span>
        </div>
        <small>{{ selected.category }} · {{ selected.district }}</small>
        <h2>{{ selected.title }}</h2>
        <dl>
          <dt>주소</dt>
          <dd>{{ selected.address || '주소 정보 없음' }}</dd>
          <template v-if="selected.tel"
            ><dt>전화</dt>
            <dd>{{ selected.tel }}</dd></template
          >
        </dl>
        <div class="sidebar-actions">
          <a
            class="primary"
            :href="`https://map.kakao.com/link/map/${encodeURIComponent(selected.title)},${selected.lat},${selected.lng}`"
            target="_blank"
            rel="noopener"
            >외부 지도 열기</a
          >
        </div>
        <div class="stories">
          <div class="story-title">
            <h3>이 장소의 이야기</h3>
            <button type="button" @click="openPostForm">글쓰기</button>
          </div>
          <article v-for="post in selectedPlacePosts" :key="post.id">
            <b>{{ post.title }}</b>
            <p>{{ post.content }}</p>
            <small
              >{{ new Date(post.createdAt).toLocaleDateString('ko-KR') }} · 조회
              {{ post.views }}</small
            >
            <div>
              <button type="button" @click="editPost(post)">수정</button>
              <button type="button" @click="deletePost(post)">삭제</button>
            </div>
            <div class="comment-list">
              <div v-for="comment in commentsFor(post.id)" :key="comment.id" class="comment-item">
                <p>
                  <b>{{ comment.author }}</b> {{ comment.content }}
                </p>
                <button type="button" @click="deleteComment(comment)">삭제</button>
              </div>
            </div>
            <form class="comment-form" @submit.prevent="submitComment(post.id)">
              <input v-model="commenterName" placeholder="표시 이름" aria-label="댓글 작성자" />
              <input
                v-model="commentDrafts[post.id].content"
                placeholder="댓글을 입력하세요"
                aria-label="댓글 내용"
              />
              <input
                v-model="commentDrafts[post.id].password"
                type="password"
                inputmode="numeric"
                placeholder="비밀번호"
                aria-label="댓글 비밀번호"
              />
              <button type="submit">등록</button>
            </form>
          </article>
          <p v-if="!selectedPlacePosts.length" class="muted">첫 번째 이야기를 남겨보세요.</p>
        </div>
      </aside>
    </div>
    <div v-if="formOpen" class="modal-back" @click.self="formOpen = false">
      <form class="modal" @submit.prevent="submitPost">
        <button type="button" class="close" @click="formOpen = false">×</button>
        <small>{{ selected.title }}</small>
        <h2>{{ editingPost ? '이야기 수정' : '새 이야기 작성' }}</h2>
        <label>제목<input v-model="postDraft.title" maxlength="80" /></label>
        <label>내용<textarea v-model="postDraft.content" rows="6"></textarea></label>
        <label
          >수정·삭제 비밀번호<input
            v-model="postDraft.password"
            type="password"
            inputmode="numeric"
        /></label>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <button class="primary" type="submit">{{ editingPost ? '수정하기' : '등록하기' }}</button>
      </form>
    </div>
  </div>
</template>
