import { ref } from 'vue'
import { categories, districts } from '../data/categories.js'
import { useSeoulPlaces } from './useSeoulPlaces.js'

const HISTORY_KEY = 'localhub_chat_history_v1'
const CONTEXT_LIMIT = 25
const HISTORY_TURNS = 10

const CATEGORY_KEYWORDS = {
  관광지: ['관광지', '관광', '명소', '가볼', '가 볼', '여행지', '구경'],
  문화시설: ['문화시설', '문화', '박물관', '미술관', '전시', '공연장', '도서관'],
  레포츠: ['레포츠', '스포츠', '운동', '액티비티', '체육'],
  여행코스: ['여행코스', '여행 코스', '코스', '루트', '동선'],
  축제공연행사: ['축제', '행사', '공연', '페스티벌'],
}

function detectDistrict(question) {
  return districts.find((d) => question.includes(d)) || null
}
function detectCategories(question) {
  return categories
    .filter(
      (c) =>
        question.includes(c.name) || (CATEGORY_KEYWORDS[c.name] || []).some((k) => question.includes(k)),
    )
    .map((c) => c.name)
}
function summarize(p) {
  return { title: p.title, category: p.category, district: p.district, address: p.address }
}
function sampleEvenly(pool, limit) {
  const groups = new Map()
  for (const p of pool) {
    if (!groups.has(p.category)) groups.set(p.category, [])
    groups.get(p.category).push(p)
  }
  const cats = [...groups.keys()]
  const perCat = Math.max(1, Math.floor(limit / (cats.length || 1)))
  return cats.flatMap((c) => groups.get(c).slice(0, perCat)).slice(0, limit)
}
function buildContext(question, places) {
  const district = detectDistrict(question)
  const cats = detectCategories(question)
  let pool = places
  if (district) pool = pool.filter((p) => p.district === district)
  if (cats.length) pool = pool.filter((p) => cats.includes(p.category))
  const sample = district ? pool.slice(0, CONTEXT_LIMIT) : sampleEvenly(pool, CONTEXT_LIMIT)
  return { district, cats, sample: sample.map(summarize) }
}
function buildSystemPrompt({ district, cats, sample }) {
  const scope = [district, ...cats].filter(Boolean).join(' · ') || '서울 전역'
  const rows = sample.length
    ? sample.map((p) => `- ${p.title} · ${p.category} · ${p.district ?? '구 정보 없음'} · ${p.address}`).join('\n')
    : '(조건에 맞는 장소 데이터가 없습니다.)'
  return `당신은 서울 지역 정보에 매우 해박하고 친근한 여행 도우미 "서울 여행 도우미"입니다.
아래 [장소 데이터]를 근거로 서울의 관광지·문화시설·레포츠·여행코스를 추천하고 안내하세요.

반드시 지킬 것:
1. [장소 데이터]에 없는 장소를 지어내지 마세요. 근거가 없으면 "제가 가진 정보에는 없어요"라고 솔직히 답하세요.
2. 축제·공연·행사의 구체적인 날짜나 일정 정보는 데이터에 없습니다. 장소나 이름은 안내하되, 언제 열리는지 물으면 지어내지 말고 모른다고 답하세요.
3. 맛집·음식점 데이터는 없습니다. 맛집 추천을 요청받으면 "음식점 정보는 제공되지 않아요"라고 안내하세요.
4. 한국어로, 너무 길지 않게 답하세요. 여러 곳을 추천할 땐 목록으로 정리하세요.

[검색 범위] ${scope}
[장소 데이터] (이름 · 카테고리 · 자치구 · 주소, ${sample.length}건)
${rows}`
}

function friendlyError(err) {
  if (err instanceof TypeError) return '네트워크 연결을 확인해주세요.'
  if (err?.status === 401) return 'API 키가 올바르지 않아요. .env의 VITE_OPENAI_API_KEY를 확인해주세요.'
  if (err?.status === 429) return '요청이 많아 잠시 후 다시 시도해주세요.'
  return err?.message || '답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.'
}

async function callOpenAI(apiMessages) {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  if (!key) {
    const e = new Error('API 키가 설정되지 않았어요. .env의 VITE_OPENAI_API_KEY를 확인해주세요.')
    e.status = 401
    throw e
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      reasoning_effort: 'minimal',
      messages: apiMessages,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const e = new Error(body?.error?.message)
    e.status = res.status
    throw e
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || '답변을 받지 못했어요.'
}

const messages = ref(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')),
  pending = ref(false)
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
        .filter((m) => m.role !== 'error')
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
      const reply = await callOpenAI([
        { role: 'system', content: buildSystemPrompt(context) },
        ...recent,
      ])
      messages.value.push({ role: 'bot', text: reply })
    } catch (err) {
      messages.value.push({ role: 'error', text: friendlyError(err) })
    } finally {
      pending.value = false
      persist()
    }
  }
  return { messages, pending, send }
}
