<script setup lang="ts">
import MainView from "../MainView.vue";

const nameMap: { [key: string]: string } = {
  sleigh: "Len",
  reindeer: "Cathy",
  snowflake: "Catheline",
  gingerbread: "Malcolm",
  mistletoe: "Ailsa",
  jinglebell: "Annie",
  stocking: "Jasiel",
  peppermint: "Demi",
  holly: "Jansen",
  icicle: "Lucia",
  tinsel: "Deuel",
  carol: "Maxine",
  wreath: "Aidan",
  garland: "Joash",
};
</script>

<template>
  <MainView :name-map="nameMap" title="Hi Mr/Ms Ellan!" />
</template>

<style style></style>
