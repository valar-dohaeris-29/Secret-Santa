<script setup lang="ts">
import MainView from "../MainView.vue";

const nameMap: { [key: string]: string } = {
  sleigh: "Mum/Neer",
  reindeer: "Clive",
  stocking: "Carmelle",
  gingerbread: "Leah",
  mistletoe: "Len",
  jinglebell: "Cathy",
  snowflake: "Cathlene",
  peppermint: "Candace",
  carol: "Narisha",
  icicle: "Caylin",
  tinsel: "Rylan",
  holly: "Yashlen",
  wreath: "Craig",
  garland: "Cliffy",
  angel: "Caitlyn",
};
</script>

<template>
  <MainView :name-map="nameMap" title="Hi Secret Santa!" />
</template>

<style style></style>
