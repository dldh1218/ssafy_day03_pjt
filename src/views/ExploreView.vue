<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
const SEOUL_CENTER = [37.5665, 126.978]
const SEOUL_BOUNDS = L.latLngBounds([37.4, 126.75], [37.72, 127.2])
const route = useRoute()
const { t, locale } = useI18n()
const districtEnglish = { 서울전체: 'All Seoul', 강남구: 'Gangnam-gu', 강동구: 'Gangdong-gu', 강북구: 'Gangbuk-gu', 강서구: 'Gangseo-gu', 관악구: 'Gwanak-gu', 광진구: 'Gwangjin-gu', 구로구: 'Guro-gu', 금천구: 'Geumcheon-gu', 노원구: 'Nowon-gu', 도봉구: 'Dobong-gu', 동대문구: 'Dongdaemun-gu', 동작구: 'Dongjak-gu', 마포구: 'Mapo-gu', 서대문구: 'Seodaemun-gu', 서초구: 'Seocho-gu', 성동구: 'Seongdong-gu', 성북구: 'Seongbuk-gu', 송파구: 'Songpa-gu', 양천구: 'Yangcheon-gu', 영등포구: 'Yeongdeungpo-gu', 용산구: 'Yongsan-gu', 은평구: 'Eunpyeong-gu', 종로구: 'Jongno-gu', 중구: 'Jung-gu', 중랑구: 'Jungnang-gu' }
const localDistrict = (value) => (locale.value === 'en' ? districtEnglish[value] || value : value)
const localCategory = (value) => (value === '전체' ? t('explore.all') : t(`categories.${value}`, value))
const district = computed(() => decodeURIComponent(route.params.district))
const category = ref(route.query.category || '전체')
const search = ref(route.query.q || '')
const selected = ref(null)
const formOpen = ref(false)
const editingPost = ref(null)
const editingPassword = ref('')
const postDetail = ref(null)
const postAuth = ref({ open: false, action: '', postId: '', password: '', error: '' })
const postDraft = ref({ title: '', content: '', password: '', image: '' })
const formError = ref('')
const commentDrafts = ref({})
const commenterName = ref(localStorage.getItem('localhub_current_user_v1') || '')
const mapEl = ref(null)
const { places, load } = useSeoulPlaces()
const {
  posts,
  create: createPost,
  update: updatePost,
  remove: removePost,
  incrementViews,
  toggleLike,
} = useCommunityPosts()
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
function isInsideSeoul(place) {
  return (
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng) &&
    SEOUL_BOUNDS.contains([place.lat, place.lng])
  )
}
function renderMarkers() {
  if (!map || !markerLayer) return
  markerLayer.clearLayers()
  markerRefs.clear()
  const points = []
  filteredPlaces.value.forEach((place) => {
    if (!isInsideSeoul(place)) return
    const marker = L.marker([place.lat, place.lng], {
      icon: buildMarkerIcon(place, selected.value?.id === place.id),
    })
      .bindTooltip(place.title, { direction: 'top', offset: [0, -18] })
      .on('click', () => (selected.value = place))
    markerLayer.addLayer(marker)
    markerRefs.set(place.id, marker)
    points.push([place.lat, place.lng])
  })
  if (!userInteracted) {
    if (district.value === '서울전체') map.setView(SEOUL_CENTER, 11)
    else fitToPoints(points)
  }
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
const visitorId = (() => {
  const key = 'localhub_visitor_id_v1'
  const saved = localStorage.getItem(key)
  if (saved) return saved
  const created = crypto.randomUUID()
  localStorage.setItem(key, created)
  return created
})()
function openPostDetail(post) {
  postDetail.value = post
  incrementViews(post.id)
}
function isLiked(post) {
  return post?.likedBy?.includes(visitorId) || false
}
function likePost(post) {
  toggleLike(post.id, visitorId)
  postDetail.value = posts.value.find((item) => item.id === post.id) || post
}
function openPostForm() {
  editingPost.value = null
  postDraft.value = { title: '', content: '', password: '', image: '' }
  formError.value = ''
  formOpen.value = true
}
function startEditingPost(post, password) {
  postDetail.value = null
  editingPost.value = post
  editingPassword.value = password
  postDraft.value = {
    title: post.title,
    content: post.content,
    password: '',
    image: post.image || '',
  }
  formError.value = ''
  formOpen.value = true
}
function requestPostAction(action, post) {
  postAuth.value = { open: true, action, postId: post.id, password: '', error: '' }
}
function confirmPostAction() {
  const auth = postAuth.value
  const currentPost = posts.value.find((post) => post.id === auth.postId)
  if (!currentPost) {
    auth.error = '게시글을 찾을 수 없습니다.'
    return
  }
  if (String(currentPost.password) !== auth.password.trim()) {
    auth.error = '비밀번호가 일치하지 않습니다.'
    return
  }
  if (auth.action === 'edit') startEditingPost(currentPost, auth.password.trim())
  else {
    removePost(currentPost.id, auth.password.trim())
    postDetail.value = null
  }
  postAuth.value = { open: false, action: '', postId: '', password: '', error: '' }
}
function submitPost() {
  formError.value = ''
  if (postDraft.value.title.trim().length < 2)
    return (formError.value = '제목은 2자 이상 입력하세요.')
  if (postDraft.value.content.trim().length < 5)
    return (formError.value = '내용은 5자 이상 입력하세요.')
  if (!editingPost.value && !/^\d{4,}$/.test(postDraft.value.password))
    return (formError.value = '비밀번호는 숫자 4자리 이상이어야 합니다.')

  if (editingPost.value) {
    const updated = updatePost(
      editingPost.value.id,
      {
        title: postDraft.value.title,
        content: postDraft.value.content,
        image: postDraft.value.image,
      },
      editingPassword.value,
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
function selectPostImage(event) {
  const file = event.target.files?.[0]
  formError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    formError.value = '이미지 파일만 첨부할 수 있습니다.'
    event.target.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    formError.value = '사진은 2MB 이하로 첨부해주세요.'
    event.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => (postDraft.value.image = String(reader.result || ''))
  reader.onerror = () => (formError.value = '사진을 불러오지 못했습니다.')
  reader.readAsDataURL(file)
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
  selected.value = route.query.placeId
    ? places.value.find((place) => place.id === route.query.placeId) || null
    : null
  map = L.map(mapEl.value, {
    scrollWheelZoom: false,
    zoomControl: false,
    minZoom: 10,
    maxBounds: SEOUL_BOUNDS.pad(0.15),
    maxBoundsViscosity: 0.9,
  }).setView(SEOUL_CENTER, 11)
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
  if (selected.value && !items.includes(selected.value)) selected.value = null
  renderMarkers()
})
watch(selected, (next, previous) => {
  if (previous) markerRefs.get(previous.id)?.setIcon(buildMarkerIcon(previous, false))
  if (next) markerRefs.get(next.id)?.setIcon(buildMarkerIcon(next, true))
  nextTick(() => map?.invalidateSize({ pan: false }))
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
      <h1>{{ localDistrict(district) }}</h1>
      <p>{{ t('explore.description') }}</p>
      <div class="filters">
        <button
          v-for="item in ['전체', ...categories.map((entry) => entry.name)]"
          :key="item"
          type="button"
          :class="{ active: category === item }"
          @click="category = item"
        >
          {{ localCategory(item) }}
        </button>
      </div>
      <input
        v-model="search"
        class="search"
        type="search"
        :placeholder="t('explore.placeholder')"
        :aria-label="t('explore.search')"
      />
    </section>
    <div class="explore-layout" :class="{ 'has-sidebar': selected }">
      <section class="place-map" :aria-label="t('explore.map')">
        <div ref="mapEl" class="leaflet-map"></div>
        <div v-if="!filteredPlaces.length" class="map-empty">{{ t('explore.empty') }}</div>
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
          <article
            v-for="post in selectedPlacePosts"
            :key="post.id"
            class="story-card"
            tabindex="0"
            role="button"
            @click="openPostDetail(post)"
            @keydown.enter="openPostDetail(post)"
          >
            <img v-if="post.image" class="story-thumb" :src="post.image" :alt="post.title" />
            <div class="story-card-body">
              <b>{{ post.title }}</b>
              <p>{{ post.content }}</p>
              <div class="story-card-meta">
                <span>{{ new Date(post.createdAt).toLocaleDateString('ko-KR') }}</span>
                <span>조회 {{ post.views || 0 }}</span>
                <span>♥ {{ post.likedBy?.length || 0 }}</span>
                <span>댓글 {{ commentsFor(post.id).length }}</span>
              </div>
            </div>
            <span class="story-arrow" aria-hidden="true">↗</span>
          </article>
          <p v-if="!selectedPlacePosts.length" class="muted">첫 번째 이야기를 남겨보세요.</p>
        </div>
      </aside>
    </div>
    <div v-if="formOpen" class="modal-back" @click.self="formOpen = false">
      <form class="modal story-modal" @submit.prevent="submitPost">
        <div class="modal-accent" aria-hidden="true"></div>
        <button
          type="button"
          class="close modal-close"
          aria-label="창 닫기"
          @click="formOpen = false"
        >
          ×
        </button>
        <header class="modal-head">
          <p class="eyebrow">LOCAL STORY · SEOUL</p>
          <small>{{ selected.category }} · {{ selected.title }}</small>
          <h2>{{ editingPost ? '이야기를 다듬어주세요' : '서울의 순간을 나눠주세요' }}</h2>
          <p>직접 경험한 장소의 분위기와 유용한 정보를 기록해보세요.</p>
        </header>
        <div class="modal-fields">
          <label
            >제목<input
              v-model="postDraft.title"
              maxlength="80"
              placeholder="이야기의 제목을 입력하세요"
          /></label>
          <label
            >내용<textarea
              v-model="postDraft.content"
              rows="6"
              placeholder="어떤 점이 좋았는지 자유롭게 들려주세요"
            ></textarea>
          </label>
          <label class="image-upload">
            <span>사진 첨부 <small>JPG, PNG 등 · 최대 2MB</small></span>
            <input type="file" accept="image/*" @change="selectPostImage" />
            <span v-if="!postDraft.image" class="upload-placeholder"><b>＋</b> 사진 선택하기</span>
            <span v-else class="image-preview">
              <img :src="postDraft.image" alt="첨부 사진 미리보기" />
              <button type="button" @click.prevent="postDraft.image = ''">사진 삭제</button>
            </span>
          </label>
          <label v-if="!editingPost"
            >수정·삭제 비밀번호<input
              v-model="postDraft.password"
              type="password"
              inputmode="numeric"
              placeholder="숫자 4자리 이상"
          /></label>
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="modal-actions">
          <button type="button" class="modal-cancel" @click="formOpen = false">취소</button>
          <button class="primary" type="submit">
            {{ editingPost ? '수정하기' : '이야기 등록하기' }} →
          </button>
        </div>
      </form>
    </div>
    <div v-if="postDetail" class="modal-back" @click.self="postDetail = null">
      <article class="modal post-detail-modal">
        <button
          type="button"
          class="close modal-close"
          aria-label="상세 닫기"
          @click="postDetail = null"
        >
          ×
        </button>
        <header class="post-detail-head">
          <p class="eyebrow">LOCAL STORY</p>
          <small>{{ postDetail.category }} · {{ postDetail.placeName }}</small>
          <h2>{{ postDetail.title }}</h2>
          <div class="post-detail-meta">
            <span>{{ new Date(postDetail.createdAt).toLocaleDateString('ko-KR') }}</span>
            <span>조회 {{ postDetail.views || 0 }}</span>
            <span>댓글 {{ commentsFor(postDetail.id).length }}</span>
          </div>
        </header>
        <img
          v-if="postDetail.image"
          class="post-detail-image"
          :src="postDetail.image"
          :alt="postDetail.title"
        />
        <p class="post-detail-content">{{ postDetail.content }}</p>
        <div class="post-detail-actions">
          <button
            type="button"
            class="like-button"
            :class="{ liked: isLiked(postDetail) }"
            @click="likePost(postDetail)"
          >
            <span>{{ isLiked(postDetail) ? '♥' : '♡' }}</span>
            좋아요 {{ postDetail.likedBy?.length || 0 }}
          </button>
          <div v-if="!postDetail.isMock">
            <button type="button" @click="requestPostAction('edit', postDetail)">수정</button>
            <button type="button" @click="requestPostAction('delete', postDetail)">삭제</button>
          </div>
        </div>
        <section class="detail-comments">
          <div class="detail-comment-head">
            <h3>
              댓글 <b>{{ commentsFor(postDetail.id).length }}</b>
            </h3>
          </div>
          <div v-if="commentsFor(postDetail.id).length" class="comment-list">
            <div
              v-for="comment in commentsFor(postDetail.id)"
              :key="comment.id"
              class="comment-item"
            >
              <div>
                <b>{{ comment.author }}</b>
                <p>{{ comment.content }}</p>
              </div>
              <button v-if="!comment.isMock" type="button" @click="deleteComment(comment)">삭제</button>
            </div>
          </div>
          <p v-else class="muted">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
          <form class="detail-comment-form" @submit.prevent="submitComment(postDetail.id)">
            <textarea
              v-model="commentDrafts[postDetail.id].content"
              rows="3"
              placeholder="이 장소에 대한 생각을 남겨주세요"
              aria-label="댓글 내용"
            ></textarea>
            <input v-model="commenterName" placeholder="표시 이름" aria-label="댓글 작성자" />
            <input
              v-model="commentDrafts[postDetail.id].password"
              type="password"
              inputmode="numeric"
              placeholder="삭제용 비밀번호"
              aria-label="댓글 비밀번호"
            />
            <button type="submit">댓글 등록</button>
          </form>
        </section>
      </article>
    </div>
    <div
      v-if="postAuth.open"
      class="modal-back auth-modal-back"
      @click.self="postAuth.open = false"
    >
      <form class="modal auth-modal" @submit.prevent="confirmPostAction">
        <button
          type="button"
          class="close modal-close"
          aria-label="인증 창 닫기"
          @click="postAuth.open = false"
        >
          ×
        </button>
        <p class="eyebrow">AUTHOR CHECK</p>
        <h2>{{ postAuth.action === 'edit' ? '게시글 수정' : '게시글 삭제' }}</h2>
        <p>작성할 때 설정한 비밀번호를 입력해주세요.</p>
        <label
          >비밀번호<input
            v-model="postAuth.password"
            type="password"
            inputmode="numeric"
            autofocus
            placeholder="숫자 4자리 이상"
        /></label>
        <p v-if="postAuth.error" class="form-error">{{ postAuth.error }}</p>
        <button class="primary auth-submit" type="submit">확인</button>
      </form>
    </div>
  </div>
</template>
