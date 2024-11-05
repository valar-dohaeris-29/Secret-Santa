<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import HomeView from "./views/HomeView.vue";
</script>

<template>
  <header>
    <nav>
      <!-- <HomeView /> -->
      <!-- <RouterLink to="/">Home</RouterLink> -->
      <!-- <RouterLink to="/about">About</RouterLink> -->
    </nav>
  </header>

  <RouterView />
</template>

<style scoped></style>
