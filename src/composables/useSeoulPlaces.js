import { computed, ref } from 'vue'
import { categories } from '../data/categories.js'
import { normalizePlace } from '../utils/normalizePlaces.js'

const places = ref([])
const loading = ref(false)
const error = ref('')

export function useSeoulPlaces() {
  async function load() {
    if (places.value.length || loading.value) return
    loading.value = true
    error.value = ''

    const results = await Promise.allSettled(
      categories.map(async ({ name }) => {
        const response = await fetch(`/data/seoul/${encodeURIComponent(`서울_${name}.json`)}`)
        if (!response.ok) throw new Error(`${name} 데이터를 불러오지 못했습니다.`)
        const data = await response.json()
        return (data.items || []).map((item, index) => normalizePlace(item, name, index))
      }),
    )

    places.value = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    const failedCount = results.filter((result) => result.status === 'rejected').length
    if (failedCount) error.value = `${failedCount}개 카테고리 데이터를 불러오지 못했습니다.`
    loading.value = false
  }

  return {
    places,
    loading,
    error,
    load,
    byDistrict: (district) =>
      computed(() =>
        district === '서울전체'
          ? places.value
          : places.value.filter((place) => place.district === district),
      ),
  }
}
