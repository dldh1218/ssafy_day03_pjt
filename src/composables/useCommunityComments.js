import { computed, ref } from 'vue'

const KEY = 'localhub_comments_v1'
const comments = ref([])

function read() {
  try {
    comments.value = JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    comments.value = []
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(comments.value))
  window.dispatchEvent(new Event('localhub-comments'))
}

read()
window.addEventListener('storage', read)
window.addEventListener('localhub-comments', read)

export function useCommunityComments() {
  return {
    comments,
    byPost: (postId) =>
      computed(() => comments.value.filter((comment) => comment.postId === postId)),
    create(payload) {
      comments.value.push({
        ...payload,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: null,
      })
      save()
    },
    remove(id, password) {
      const comment = comments.value.find((item) => item.id === id)
      if (!comment || comment.password !== password) return false
      comments.value = comments.value.filter((item) => item.id !== id)
      save()
      return true
    },
  }
}
