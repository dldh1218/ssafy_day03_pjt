<script setup>
import { ref } from 'vue'
const open = ref(false)
</script>
<template>
  <header>
    <RouterLink class="brand" to="/">Local<span>Hub</span></RouterLink
    ><button class="menu" type="button" aria-label="메뉴 열기" @click="open = !open">☰</button>
    <nav :class="{ open }">
      <RouterLink to="/">서울 탐색</RouterLink><a href="/#community">커뮤니티</a
      ><a href="/#about">데이터 안내</a>
    </nav>
  </header>
</template>
