const getDistrict = (address = '') =>
  address.match(/서울(?:특별시)?\s+([가-힣]+구)/)?.[1] || '서울전체'

export function normalizePlace(raw, category, index) {
  const address = [raw.addr1, raw.addr2].filter(Boolean).join(' ')
  return {
    id: String(raw.contentid || `${category}-${index}`),
    title: raw.title || '이름 없는 장소',
    category,
    district: getDistrict(address),
    address,
    lat: Number(raw.mapy) || null,
    lng: Number(raw.mapx) || null,
    image: raw.firstimage || raw.firstimage2 || null,
    description: `${raw.title || '이 장소'}에서 서울의 ${category}을(를) 경험해보세요.`,
    tel: raw.tel || '',
    homepage: null,
  }
}
