import { ref, computed } from 'vue'
const KEY = 'localhub_posts_v1',
  posts = ref([])
function read() {
  try {
    posts.value = JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    posts.value = []
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(posts.value))
  dispatchEvent(new Event('localhub-posts'))
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
        createdAt: new Date().toISOString(),
        updatedAt: null,
      })
      save()
    },
    update(id, p, pw) {
      const x = posts.value.find((x) => x.id === id)
      if (!x || x.password !== pw) return false
      Object.assign(x, p, { updatedAt: new Date().toISOString() })
      save()
      return true
    },
    remove(id, pw) {
      const x = posts.value.find((x) => x.id === id)
      if (!x || x.password !== pw) return false
      posts.value = posts.value.filter((x) => x.id !== id)
      save()
      return true
    },
  }
}
