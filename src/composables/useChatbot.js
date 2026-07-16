import { ref } from 'vue'
import { categories, districts } from '../data/categories.js'
import { useSeoulPlaces } from './useSeoulPlaces.js'

const HISTORY_KEY = 'localhub_chat_history_v1'
const DEFAULT_GREETING = { role: 'bot', text: '안녕하세요 무엇을 도와드릴까요??' }
const CONTEXT_LIMIT = 25
const HISTORY_TURNS = 10
const CATEGORY_KEYWORDS = {
  관광지: ['관광', '명소', '가볼 곳', '여행지', '구경'],
  문화시설: ['문화', '박물관', '미술관', '전시', '공연장', '도서관'],
  축제공연행사: ['축제', '행사', '공연', '페스티벌'],
  여행코스: ['여행 코스', '코스', '루트', '동선'],
  레포츠: ['레포츠', '스포츠', '운동', '액티비티', '체육'],
  숙박: ['숙박', '호텔', '숙소', '스테이'],
  쇼핑: ['쇼핑', '백화점', '시장', '상점'],
}

function detectDistrict(question) {
  return districts.find((district) => question.includes(district)) || null
}
function detectCategories(question) {
  return categories
    .filter(
      (category) =>
        question.includes(category.name) ||
        (CATEGORY_KEYWORDS[category.name] || []).some((keyword) => question.includes(keyword)),
    )
    .map((category) => category.name)
}
function sampleEvenly(pool, limit) {
  const groups = new Map()
  pool.forEach((place) => {
    if (!groups.has(place.category)) groups.set(place.category, [])
    groups.get(place.category).push(place)
  })
  const groupList = [...groups.values()]
  const perGroup = Math.max(1, Math.floor(limit / (groupList.length || 1)))
  return groupList.flatMap((group) => group.slice(0, perGroup)).slice(0, limit)
}
function buildContext(question, places) {
  const district = detectDistrict(question)
  const selectedCategories = detectCategories(question)
  let pool = places
  if (district) pool = pool.filter((place) => place.district === district)
  if (selectedCategories.length)
    pool = pool.filter((place) => selectedCategories.includes(place.category))
  const sample = district ? pool.slice(0, CONTEXT_LIMIT) : sampleEvenly(pool, CONTEXT_LIMIT)
  return { district, selectedCategories, sample }
}
function buildSystemPrompt({ district, selectedCategories, sample }) {
  const scope = [district, ...selectedCategories].filter(Boolean).join(' · ') || '서울 전역'
  const rows = sample.length
    ? sample
        .map(
          (place) =>
            `- ${place.title} · ${place.category} · ${place.district || '자치구 정보 없음'} · ${place.address || '주소 정보 없음'}`,
        )
        .join('\n')
    : '(조건에 맞는 장소 데이터가 없습니다.)'
  return `당신은 서울 지역정보를 친절하고 정확하게 안내하는 LocalHub 여행 도우미입니다.
아래 장소 데이터만 근거로 관광지, 문화시설, 레포츠, 여행코스, 숙박, 쇼핑, 축제·공연을 추천하세요.

규칙:
1. 데이터에 없는 장소나 정보를 지어내지 마세요.
2. 구체적인 날짜와 일정 정보가 없다면 모른다고 안내하세요.
3. 음식점 데이터는 제공하지 않습니다.
4. 한국어로 짧고 읽기 쉽게 답하고, 여러 장소는 목록으로 정리하세요.

[검색 범위] ${scope}
[장소 데이터 ${sample.length}건]
${rows}`
}
function friendlyError(error) {
  if (error instanceof TypeError) return '네트워크 연결을 확인해주세요.'
  if (error?.status === 401)
    return 'API 키가 올바르지 않습니다. .env.local의 VITE_OPENAI_API_KEY를 확인해주세요.'
  if (error?.status === 429) return '요청이 많습니다. 잠시 후 다시 시도해주세요.'
  return error?.message || '답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.'
}
async function callOpenAI(messages) {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  if (!key || key.includes('여기에_입력')) {
    const error = new Error('API 키가 설정되지 않았습니다. .env.local을 확인해주세요.')
    error.status = 401
    throw error
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-5-mini', reasoning_effort: 'minimal', messages }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const error = new Error(body?.error?.message)
    error.status = response.status
    throw error
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || '답변을 받지 못했습니다.'
}

const _stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null')
const messages = ref((_stored && _stored.length ? _stored : [DEFAULT_GREETING]))
const pending = ref(false)
const { places, load } = useSeoulPlaces()
function persist() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.value))
}

export function useChatbot() {
  async function send(raw) {
    const question = raw?.trim()
    if (!question || pending.value) return
    messages.value.push({ role: 'user', text: question })
    persist()
    pending.value = true
    try {
      await load()
      const context = buildContext(question, places.value)
      const recent = messages.value
        .filter((message) => message.role !== 'error')
        .slice(-HISTORY_TURNS)
        .map((message) => ({
          role: message.role === 'user' ? 'user' : 'assistant',
          content: message.text,
        }))
      const reply = await callOpenAI([
        { role: 'system', content: buildSystemPrompt(context) },
        ...recent,
      ])
      messages.value.push({ role: 'bot', text: reply })
    } catch (error) {
      messages.value.push({ role: 'error', text: friendlyError(error) })
    } finally {
      pending.value = false
      persist()
    }
  }
  return { messages, pending, send }
}
