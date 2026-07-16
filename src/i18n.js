import { createI18n } from 'vue-i18n'

const savedLocale = localStorage.getItem('localhub-locale')

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale === 'en' ? 'en' : 'ko',
  fallbackLocale: 'ko',
  messages: {
    ko: {
      nav: { explore: '서울 탐색', categories: '카테고리', community: '커뮤니티', data: '데이터 안내' },
      controls: { light: '라이트 모드로 전환', dark: '다크 모드로 전환', menu: '메뉴 열기', language: '언어 선택' },
      footer: { description: '서울의 장소와 사람들의 이야기를 연결합니다.' },
      hero: {
        title: '오늘, 서울을 발견하는 방법',
        description: '관광지부터 공연, 쇼핑, 레포츠, 숙소까지. 지금 내 취향에 맞는 서울을 한곳에서 발견하세요.',
        placeholder: '지역, 장소, 하고 싶은 일을 검색해보세요',
        searchLabel: '서울 장소 통합 검색', search: '검색', suggestion: '검색 제안', trending: '지금 주목받는 서울',
        empty: '일치하는 장소가 없습니다.', start: '서울 탐색 시작하기', caption: '서울에서 보내는 오늘을 더 다채롭게',
      },
      home: {
        districtTitle: '궁금한 자치구를 선택해보세요', districtDescription: '지도 위 자치구를 누르면 그 지역의 장소와 이야기를 만날 수 있어요.',
        districtMap: '서울 자치구 지도', categoryTitle: '취향에 맞는 서울을 골라보세요', categoryCopy: '{category}로 만나는 새로운 서울의 표정',
        places: '장소', view: '둘러보기', photos: '서울 장소 사진 모음', communityTitle: '서울인의 최신 이야기',
        communityDescription: 'LocalHub 이용자들이 장소에서 남긴 최신 후기를 확인해보세요.', noStories: '아직 등록된 이야기가 없습니다.',
        firstStory: '서울의 장소를 둘러보고 첫 번째 후기를 남겨보세요.', dataNote: '서울 열린데이터를 더 가깝게.', views: '조회',
      },
      ranking: { title: '지금 서울인이 이야기하는 곳', active: '게시글과 댓글, 최근 활동을 기준으로 집계한 장소입니다.', fallback: '현재 가장 많은 이야기가 있는 곳입니다.', posts: '글', comments: '댓글', waiting: '첫 이야기를 기다리고 있어요', view: '{place} 전경' },
      explore: { description: '지역의 장소를 지도에서 고르고 자세한 정보와 이야기를 확인해보세요.', all: '전체', placeholder: '장소 이름 검색', search: '장소 검색', map: '장소 지도', empty: '조건에 맞는 장소가 없습니다.' },
      categories: { 관광지: '관광지', 문화시설: '문화시설', 축제공연행사: '축제·공연·행사', 여행코스: '여행 코스', 레포츠: '레포츠', 숙박: '숙박', 쇼핑: '쇼핑' },
    },
    en: {
      nav: { explore: 'Explore Seoul', categories: 'Categories', community: 'Community', data: 'About the data' },
      controls: { light: 'Switch to light mode', dark: 'Switch to dark mode', menu: 'Open menu', language: 'Choose language' },
      footer: { description: 'Connecting Seoul places with the stories of its people.' },
      hero: {
        title: 'A new way to discover Seoul', description: 'From landmarks and shows to shopping, sports, and stays. Find the Seoul that fits you, all in one place.',
        placeholder: 'Search an area, place, or activity', searchLabel: 'Search places in Seoul', search: 'Search', suggestion: 'Suggestions', trending: 'Trending in Seoul',
        empty: 'No matching places found.', start: 'Start exploring Seoul', caption: 'Make today in Seoul more colorful',
      },
      home: {
        districtTitle: 'Choose a district to explore', districtDescription: 'Select a district on the map to discover its places and local stories.', districtMap: 'Map of Seoul districts',
        categoryTitle: 'Find Seoul for your taste', categoryCopy: 'A new side of Seoul through {category}', places: 'PLACES', view: 'View places', photos: 'Photos of places in Seoul',
        communityTitle: 'Latest stories from Seoul', communityDescription: 'See the latest place reviews shared by the LocalHub community.', noStories: 'No stories have been posted yet.',
        firstStory: 'Explore Seoul and share the first story.', dataNote: 'Seoul open data, made more accessible.', views: 'Views',
      },
      ranking: { title: 'Where Seoul is talking now', active: 'Ranked by posts, comments, and recent community activity.', fallback: 'Places currently inspiring the most stories.', posts: 'Posts', comments: 'Comments', waiting: 'Waiting for the first story', view: 'View of {place}' },
      explore: { description: 'Pick a place on the map to see details and local stories.', all: 'All', placeholder: 'Search by place name', search: 'Search places', map: 'Map of places', empty: 'No places match these filters.' },
      categories: { 관광지: 'Attractions', 문화시설: 'Culture', 축제공연행사: 'Festivals & Events', 여행코스: 'Travel Courses', 레포츠: 'Leisure & Sports', 숙박: 'Stays', 쇼핑: 'Shopping' },
    },
  },
})
