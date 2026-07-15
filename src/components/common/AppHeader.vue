<script setup>
import { ref } from 'vue'
const open = ref(false)
</script>
<template>
  <header class="site-header">
    <RouterLink class="brand" to="/"
      ><span class="brand-mark">LH</span
      ><span class="brand-copy"><b>LocalHub</b><small>SEOUL LOCAL ARCHIVE</small></span></RouterLink
    >
    <button class="menu" type="button" aria-label="메뉴 열기" @click="open = !open">☰</button>
    <nav :class="{ open }">
      <RouterLink to="/">서울 탐색</RouterLink>
      <a href="/#categories">카테고리</a>
      <a href="/#community">커뮤니티</a>
    </nav>
  </header>
</template>
