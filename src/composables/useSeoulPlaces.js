import { ref, computed } from 'vue'
const FILES = [
  { file: '서울_관광지.json', type: '12' },
  { file: '서울_문화시설.json', type: '14' },
  { file: '서울_레포츠.json', type: '28' },
  { file: '서울_축제공연행사.json', type: '15' },
  { file: '서울_여행코스.json', type: '25' },
]
const CATEGORY_BY_TYPE = {
  12: '관광지',
  14: '문화시설',
  28: '레포츠',
  15: '축제공연행사',
  25: '여행코스',
}
const DISTRICT_RE = /[가-힣]+구/
const places = ref([]),
  loading = ref(false),
  error = ref('')
function toPlace(item) {
  const lat = parseFloat(item.mapy),
    lng = parseFloat(item.mapx)
  if (!lat || !lng) return null
  return {
    id: item.contentid,
    title: item.title,
    address: item.addr1,
    lat,
    lng,
    image: item.firstimage || null,
    tel: item.tel || '',
    category: CATEGORY_BY_TYPE[item.contenttypeid],
    district: item.addr1?.match(DISTRICT_RE)?.[0] || null,
  }
}
async function fetchFile(file) {
  const res = await fetch(`/data/seoul/${encodeURIComponent(file)}`)
  return (await res.json()).items || []
}
export function useSeoulPlaces() {
  async function load() {
    if (places.value.length) return
    loading.value = true
    try {
      const lists = await Promise.all(FILES.map((f) => fetchFile(f.file)))
      places.value = lists.flat().map(toPlace).filter(Boolean)
    } catch {
      error.value = '장소 데이터를 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }
  return {
    places,
    loading,
    error,
    load,
    byDistrict: (d) =>
      computed(() =>
        d === '서울전체' ? places.value : places.value.filter((p) => p.district === d),
      ),
  }
}
