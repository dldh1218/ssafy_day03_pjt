import { computed, ref } from 'vue'
import communityMockData from '../data/communityMockData.json'

const KEY = 'localhub_user_comments_v1'
const LEGACY_KEY = 'localhub_comments_v1'
const comments = ref([])

function read() {
  try {
    const stored = localStorage.getItem(KEY)
    const userComments = JSON.parse(stored || localStorage.getItem(LEGACY_KEY) || '[]').filter(
      (comment) => !comment.isMock,
    )
    comments.value = [
      ...communityMockData.comments.map((comment) => ({ ...comment, isMock: true })),
      ...userComments,
    ]
    if (!stored) localStorage.setItem(KEY, JSON.stringify(userComments))
  } catch {
    comments.value = communityMockData.comments.map((comment) => ({ ...comment, isMock: true }))
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(comments.value.filter((comment) => !comment.isMock)))
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
      if (!comment || comment.isMock || comment.password !== password) return false
      comments.value = comments.value.filter((item) => item.id !== id)
      save()
      return true
    },
  }
}
