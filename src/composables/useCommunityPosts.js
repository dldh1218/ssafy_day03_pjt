import { ref, computed } from 'vue'
import communityMockData from '../data/communityMockData.json'
const KEY = 'localhub_user_posts_v1',
  LEGACY_KEY = 'localhub_posts_v1',
  posts = ref([])
function read() {
  try {
    const stored = localStorage.getItem(KEY)
    const userPosts = JSON.parse(stored || localStorage.getItem(LEGACY_KEY) || '[]').filter(
      (post) => !post.isMock,
    )
    posts.value = [
      ...communityMockData.posts.map((post) => ({ ...post, isMock: true })),
      ...userPosts,
    ]
    if (!stored) localStorage.setItem(KEY, JSON.stringify(userPosts))
  } catch {
    posts.value = communityMockData.posts.map((post) => ({ ...post, isMock: true }))
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(posts.value.filter((post) => !post.isMock)))
  dispatchEvent(new Event('localhub-posts'))
}
const MOCK_TEMPLATES = {
  관광지: ['천천히 둘러보기 좋았어요', '서울다운 풍경을 만날 수 있어요'],
  문화시설: ['전시와 공간이 모두 인상적이었어요', '차분하게 문화생활을 즐기기 좋아요'],
  축제공연행사: ['현장 분위기가 기대 이상이었어요', '다시 찾아가고 싶은 즐거운 행사였어요'],
  여행코스: ['하루 일정으로 걷기 좋은 코스예요', '서울의 여러 표정을 만날 수 있었어요'],
  레포츠: ['도심에서 활기찬 시간을 보냈어요', '처음 방문해도 즐기기 좋은 곳이에요'],
  숙박: ['서울 여행의 거점으로 편리했어요', '편안하게 쉬어가기 좋은 곳이었어요'],
  쇼핑: ['구경할 거리와 살 것이 다양했어요', '서울에서 쇼핑하기 좋은 장소예요'],
}
read()
addEventListener('storage', read)
addEventListener('localhub-posts', read)
export function useCommunityPosts() {
  return {
    posts,
    latest: computed(() =>
      [...posts.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    ),
    create(p) {
      posts.value.push({
        ...p,
        id: crypto.randomUUID(),
        views: 0,
        likedBy: [],
        createdAt: new Date().toISOString(),
        updatedAt: null,
      })
      save()
    },
    update(id, p, pw) {
      const x = posts.value.find((x) => x.id === id)
      if (!x || x.isMock || x.password !== pw) return false
      Object.assign(x, p, { updatedAt: new Date().toISOString() })
      save()
      return true
    },
    remove(id, pw) {
      const x = posts.value.find((x) => x.id === id)
      if (!x || x.isMock || x.password !== pw) return false
      posts.value = posts.value.filter((x) => x.id !== id)
      save()
      return true
    },
    incrementViews(id) {
      const post = posts.value.find((item) => item.id === id)
      if (!post) return
      post.views = (post.views || 0) + 1
      if (!post.isMock) save()
    },
    toggleLike(id, visitorId) {
      const post = posts.value.find((item) => item.id === id)
      if (!post) return false
      post.likedBy ||= []
      const index = post.likedBy.indexOf(visitorId)
      if (index >= 0) post.likedBy.splice(index, 1)
      else post.likedBy.push(visitorId)
      if (!post.isMock) save()
      return index < 0
    },
    seedMockPosts(places) {
      if (posts.value.some((post) => post.isMock)) return
      const candidates = [...places].filter((place) => place?.id && place?.title)
      for (let index = candidates.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1))
        ;[candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]]
      }
      const now = Date.now()
      candidates.slice(0, 25).forEach((place, index) => {
        const templates = MOCK_TEMPLATES[place.category] || ['직접 방문해보니 만족스러웠어요']
        const impression = templates[index % templates.length]
        posts.value.push({
          id: `mock-${place.id}-${index}`,
          placeId: place.id,
          placeName: place.title,
          district: place.district,
          category: place.category,
          title: `${place.title}, ${impression}`,
          content: `${place.title}에 직접 다녀왔습니다. ${impression} 주변을 여유롭게 둘러보며 장소만의 분위기를 느낄 수 있었고, ${place.district}에서 새로운 나들이 장소를 찾는 분께 추천하고 싶어요.`,
          password: '1234',
          image: place.image || '',
          views: 8 + ((index * 17) % 93),
          likedBy: [],
          isMock: true,
          createdAt: new Date(now - index * 9 * 60 * 60 * 1000).toISOString(),
          updatedAt: null,
        })
      })
      save()
    },
  }
}
