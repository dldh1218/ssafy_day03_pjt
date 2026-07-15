<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster'
import { categories } from '../data/categories.js'
import { useSeoulPlaces } from '../composables/useSeoulPlaces.js'
import { useCommunityPosts } from '../composables/useCommunityPosts.js'
const MARKER_TONE = {
    관광지: '#5b87a6',
    문화시설: '#8577a0',
    축제공연행사: '#c98a5e',
    여행코스: '#5f9a83',
    레포츠: '#5a97a3',
  },
  categoryIcon = Object.fromEntries(categories.map((c) => [c.name, c.icon]))
const route = useRoute(),
  district = computed(() => decodeURIComponent(route.params.district)),
  category = ref(route.query.category || '전체'),
  search = ref(''),
  selected = ref(null),
  form = ref(false),
  detail = ref(null),
  draft = ref({ title: '', content: '', password: '' }),
  error = ref('')
const { places, load } = useSeoulPlaces(),
  { posts, create, update, remove } = useCommunityPosts()
const filtered = computed(() =>
  places.value.filter(
    (p) =>
      (district.value === '서울전체' || p.district === district.value) &&
      (category.value === '전체' || p.category === category.value) &&
      p.title.includes(search.value),
  ),
)
const placePosts = computed(() =>
  posts.value
    .filter((p) => p.placeId === selected.value?.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
)
function submit() {
  error.value = ''
  if (draft.value.title.trim().length < 2) return (error.value = '제목은 2자 이상 입력하세요.')
  if (draft.value.content.trim().length < 5) return (error.value = '내용은 5자 이상 입력하세요.')
  if (!/^\d{4,}$/.test(draft.value.password))
    return (error.value = '비밀번호는 숫자 4자리 이상이어야 합니다.')
  if (detail.value) {
    if (
      !update(
        detail.value.id,
        { title: draft.value.title, content: draft.value.content },
        draft.value.password,
      )
    )
      return (error.value = '비밀번호가 일치하지 않습니다.')
  } else
    create({
      ...draft.value,
      placeId: selected.value.id,
      placeName: selected.value.title,
      district: selected.value.district,
      category: selected.value.category,
    })
  form.value = false
  detail.value = null
  draft.value = { title: '', content: '', password: '' }
}
function edit(p) {
  detail.value = p
  draft.value = { title: p.title, content: p.content, password: '' }
  form.value = true
}
function openForm() {
  form.value = true
  detail.value = null
  draft.value = { title: '', content: '', password: '' }
}
function del(p) {
  const pw = prompt('게시글 비밀번호를 입력하세요.')
  if (pw !== null && !remove(p.id, pw)) alert('비밀번호가 일치하지 않습니다.')
}
const mapEl = ref(null)
let map = null,
  markerLayer = null,
  boundaryLayer = null,
  districtFeatures = [],
  resizeObserver = null,
  lastDistrict = null,
  suppressAutoFit = false,
  userInteracted = false
const markerRefs = new Map()

function buildIcon(p, isSelected) {
  const color = MARKER_TONE[p.category] || '#7a8a90'
  return L.divIcon({
    className: 'place-pin-wrap',
    html: `<span class="place-pin${isSelected ? ' is-selected' : ''}" style="--pin-color:${color}">${categoryIcon[p.category] || '●'}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}
function buildClusterIcon(cluster) {
  const count = cluster.getChildCount(),
    size = count < 10 ? 'sm' : count < 30 ? 'md' : 'lg',
    px = { sm: 34, md: 42, lg: 50 }[size]
  return L.divIcon({
    className: 'cluster-pin-wrap',
    html: `<span class="cluster-pin cluster-pin--${size}">${count}</span>`,
    iconSize: [px, px],
  })
}
function fitToPoints(points) {
  if (!map || !points.length) return
  suppressAutoFit = true
  const release = () => (suppressAutoFit = false)
  map.once('moveend', release)
  setTimeout(release, 800)
  map.flyToBounds(points, { padding: [48, 48], maxZoom: 15, duration: 0.6 })
}
function renderMarkers() {
  if (!map) return
  markerLayer.clearLayers()
  markerRefs.clear()
  const points = []
  for (const p of filtered.value) {
    const marker = L.marker([p.lat, p.lng], { icon: buildIcon(p, selected.value?.id === p.id) })
      .bindTooltip(p.title, { direction: 'top', offset: [0, -18] })
      .on('click', () => (selected.value = p))
    markerLayer.addLayer(marker)
    markerRefs.set(p.id, marker)
    points.push([p.lat, p.lng])
  }
  if (!userInteracted) fitToPoints(points)
}
function renderBoundary() {
  if (!map) return
  if (boundaryLayer) {
    map.removeLayer(boundaryLayer)
    boundaryLayer = null
  }
  const feature = districtFeatures.find((f) => f.properties?.SIG_KOR_NM === district.value)
  if (!feature) return
  boundaryLayer = L.geoJSON(feature, {
    style: { color: '#236b8e', weight: 2, fillColor: '#80b4c7', fillOpacity: 0.15 },
  }).addTo(map)
}
onMounted(async () => {
  await load()
  selected.value = places.value.find((p) => p.id === route.query.placeId) || filtered.value[0]

  map = L.map(mapEl.value, { scrollWheelZoom: false, zoomControl: false }).setView(
    [37.5665, 126.978],
    11,
  )
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)
  L.control.zoom({ position: 'topright' }).addTo(map)
  const LocateControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd() {
      const btn = L.DomUtil.create('button', 'leaflet-locate-btn')
      btn.type = 'button'
      btn.title = '현재 위치로 이동'
      btn.setAttribute('aria-label', '현재 위치로 이동')
      btn.textContent = '◎'
      L.DomEvent.disableClickPropagation(btn)
      L.DomEvent.on(btn, 'click', () => map.locate({ setView: true, maxZoom: 15 }))
      return btn
    },
  })
  new LocateControl().addTo(map)
  map.on('locationerror', () => alert('현재 위치를 확인할 수 없습니다.'))
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
    const res = await fetch(encodeURI('/data/seoul/seoul-districts.geojson'))
    districtFeatures = (await res.json()).features || []
    renderBoundary()
  } catch {}
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
})
watch(filtered, (v) => {
  if (district.value !== lastDistrict) {
    lastDistrict = district.value
    userInteracted = false
  }
  if (!v.includes(selected.value)) selected.value = v[0]
  renderMarkers()
})
watch(selected, (next, prev) => {
  if (prev?.id === next?.id) return
  if (prev) markerRefs.get(prev.id)?.setIcon(buildIcon(prev, false))
  if (next) markerRefs.get(next.id)?.setIcon(buildIcon(next, true))
})
watch(district, renderBoundary)
</script>
<template>
  <div class="explore">
    <section class="explore-top">
      <p class="eyebrow">SEOUL DISTRICT GUIDE</p>
      <h1>{{ district }}</h1>
      <p>지역의 장소를 지도에서 골라 자세한 정보와 이야기를 확인해보세요.</p>
      <div class="filters">
        <button
          v-for="c in ['전체', ...categories.map((x) => x.name)]"
          :key="c"
          type="button"
          :class="{ active: category === c }"
          @click="category = c"
        >
          {{ c }}
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
        <div v-if="!filtered.length" class="map-empty">조건에 맞는 장소가 없습니다.</div>
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
          <dd>{{ selected.address }}</dd>
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
            <button type="button" @click="openForm">글쓰기</button>
          </div>
          <article v-for="p in placePosts" :key="p.id">
            <b>{{ p.title }}</b>
            <p>{{ p.content }}</p>
            <small
              >{{ new Date(p.createdAt).toLocaleDateString('ko-KR') }} · 조회 {{ p.views }}</small
            >
            <div>
              <button type="button" @click="edit(p)">수정</button
              ><button type="button" @click="del(p)">삭제</button>
            </div>
          </article>
          <p v-if="!placePosts.length" class="muted">첫 번째 이야기를 남겨보세요.</p>
        </div>
      </aside>
    </div>
    <div v-if="form" class="modal-back" @click.self="form = false">
      <form class="modal" @submit.prevent="submit">
        <button type="button" class="close" @click="form = false">×</button
        ><small>{{ selected.title }}</small>
        <h2>{{ detail ? '이야기 수정' : '새 이야기 작성' }}</h2>
        <label>제목<input v-model="draft.title" maxlength="80" /></label
        ><label>내용<textarea v-model="draft.content" rows="6"></textarea></label
        ><label
          >수정·삭제 비밀번호<input v-model="draft.password" type="password" inputmode="numeric"
        /></label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="primary" type="submit">{{ detail ? '수정하기' : '등록하기' }}</button>
      </form>
    </div>
  </div>
</template>
