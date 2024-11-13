<script setup lang="ts">
import MainView from "../MainView.vue";

const nameMap: { [key: string]: string } = {
  sleigh: "Mum/Neer",
  reindeer: "Clive",
  snowflake: "Carmelle",
  gingerbread: "Leah",
  mistletoe: "Len",
  jinglebell: "Cathy",
  stocking: "Cathlene",
  peppermint: "Cliffy",
  holly: "Narisha",
  icicle: "Caylin",
  tinsel: "Rylan",
  carol: "Yashlen",
  wreath: "Craig",
  garland: "Candace",
  angel: "Caitlyn",
};
</script>

<template>
  <MainView :name-map="nameMap" title="Hi Secret Santa!" />
</template>

<style style></style>
