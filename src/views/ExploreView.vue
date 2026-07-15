<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { categories } from '../data/categories.js'
import { useSeoulPlaces } from '../composables/useSeoulPlaces.js'
import { useCommunityPosts } from '../composables/useCommunityPosts.js'
import { useCommunityComments } from '../composables/useCommunityComments.js'
const route = useRoute(),
  district = computed(() => decodeURIComponent(route.params.district)),
  category = ref(route.query.category || '전체'),
  search = ref(route.query.q || ''),
  selected = ref(null),
  form = ref(false),
  detail = ref(null),
  draft = ref({ title: '', content: '', password: '' }),
  error = ref('')
const { places, load } = useSeoulPlaces(),
  { posts, create, update, remove } = useCommunityPosts()
const { comments, create: createComment, remove: removeComment } = useCommunityComments()
const commentDrafts = ref({})
const commenterName = ref(localStorage.getItem('localhub_current_user_v1') || '')
const filtered = computed(() =>
  places.value.filter(
    (p) =>
      (district.value === '서울전체' || p.district === district.value) &&
      (category.value === '전체' || p.category === category.value) &&
      p.title.includes(search.value),
  ),
)
const visibleMarkers = computed(() => filtered.value.slice(0, 300))
const placePosts = computed(() =>
  posts.value
    .filter((p) => p.placeId === selected.value?.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
)
const pos = (p) => ({
  left: `${8 + ((p.longitude - 126.8) / 0.36) * 84}%`,
  top: `${8 + ((37.69 - p.latitude) / 0.25) * 82}%`,
})
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
function commentsFor(postId) {
  return comments.value.filter((comment) => comment.postId === postId)
}
function submitComment(postId) {
  const comment = commentDrafts.value[postId]
  if (
    !commenterName.value.trim() ||
    !comment?.content.trim() ||
    !/^\d{4,}$/.test(comment?.password)
  ) {
    alert('이름, 댓글 내용, 숫자 4자리 이상의 비밀번호를 입력하세요.')
    return
  }
  localStorage.setItem('localhub_current_user_v1', commenterName.value.trim())
  createComment({ postId, author: commenterName.value.trim(), ...comment })
  commentDrafts.value[postId] = { content: '', password: '' }
}
function deleteComment(comment) {
  const password = prompt('댓글 비밀번호를 입력하세요.')
  if (password !== null && !removeComment(comment.id, password))
    alert('비밀번호가 일치하지 않습니다.')
}
onMounted(async () => {
  await load()
  selected.value = places.value.find((p) => p.id === route.query.placeId) || filtered.value[0]
})
watch(filtered, (v) => {
  if (!v.includes(selected.value)) selected.value = v[0]
})
watch(
  placePosts,
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
        <div class="river"></div>
        <button
          v-for="p in visibleMarkers"
          :key="p.id"
          type="button"
          class="marker"
          :class="{ active: selected?.id === p.id }"
          :style="pos(p)"
          :aria-label="p.title"
          @click="selected = p"
        >
          ●<span>{{ p.title }}</span>
        </button>
        <div v-if="!filtered.length" class="map-empty">조건에 맞는 장소가 없습니다.</div>
      </section>
      <aside v-if="selected" class="sidebar">
        <button class="close" type="button" aria-label="상세 닫기" @click="selected = null">
          ×
        </button>
        <div class="place-image">
          <span>{{ selected.category }}</span>
        </div>
        <small>{{ selected.category }} · {{ selected.district }}</small>
        <h2>{{ selected.title }}</h2>
        <p>{{ selected.description }}</p>
        <dl>
          <dt>주소</dt>
          <dd>{{ selected.address }}</dd>
          <template v-if="selected.phone"
            ><dt>전화</dt>
            <dd>{{ selected.phone }}</dd></template
          >
        </dl>
        <div class="sidebar-actions">
          <a
            class="primary"
            :href="`https://map.kakao.com/link/search/${encodeURIComponent(selected.title)}`"
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
            <div class="comment-list">
              <div v-for="comment in commentsFor(p.id)" :key="comment.id" class="comment-item">
                <p>
                  <b>{{ comment.author }}</b> {{ comment.content }}
                </p>
                <button type="button" @click="deleteComment(comment)">삭제</button>
              </div>
            </div>
            <form class="comment-form" @submit.prevent="submitComment(p.id)">
              <input v-model="commenterName" placeholder="표시 이름" aria-label="댓글 작성자" />
              <input
                v-model="commentDrafts[p.id].content"
                placeholder="댓글을 입력하세요"
                aria-label="댓글 내용"
              />
              <input
                v-model="commentDrafts[p.id].password"
                type="password"
                inputmode="numeric"
                placeholder="비밀번호"
                aria-label="댓글 비밀번호"
              />
              <button type="submit">등록</button>
            </form>
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
