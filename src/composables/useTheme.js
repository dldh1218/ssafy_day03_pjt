import { computed, ref } from 'vue'

const preferredDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
const dark = ref(localStorage.getItem('localhub-theme') ? localStorage.getItem('localhub-theme') === 'dark' : preferredDark)

function applyTheme() {
  document.documentElement.dataset.theme = dark.value ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark.value ? 'dark' : 'light'
}

applyTheme()

export function useTheme() {
  const theme = computed(() => (dark.value ? 'dark' : 'light'))
  function toggleTheme() {
    dark.value = !dark.value
    localStorage.setItem('localhub-theme', dark.value ? 'dark' : 'light')
    applyTheme()
  }
  return { dark, theme, toggleTheme }
}
