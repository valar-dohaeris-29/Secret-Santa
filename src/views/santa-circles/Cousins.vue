<script setup lang="ts">
import MainView from "../MainView.vue";

const passwordNameMap: { [key: string]: string } = {
  lasertag: "Aidan",
  brookies: "Maxine",
  exams: "Cathlene",
  justdance: "Deuel",
  jiujitsu: "Annie",
  boba: "Jasiel",
};

const nameExclusionMap: { [key: string]: string[] } = {
  Deuel: ["Deuel"],
  Cathlene: ["Cathlene", "Deuel"],
  Annie: ["Annie"],
  Jasiel: ["Jasiel"],
  Maxine: ["Maxine"],
  Aidan: ["Aidan"],
};

function validateMaps() {
  const passwordValues = Object.values(passwordNameMap);
  const missingInPasswordMap = Object.keys(nameExclusionMap).filter(
    (name) => !passwordValues.includes(name)
  );

  if (missingInPasswordMap.length > 0) {
    throw new Error(
      `These nameExclusionMap keys are missing in passwordNameMap values: ${missingInPasswordMap.join(
        ", "
      )}`
    );
  }

  const missingInExclusionMap = passwordValues.filter(
    (name) => !Object.keys(nameExclusionMap).includes(name)
  );

  if (missingInExclusionMap.length > 0) {
    throw new Error(
      `These passwordNameMap keys are missing in nameExclusionMap values: ${missingInExclusionMap.join(
        ", "
      )}`
    );
  }
} // TODO optimise GPT code to use one Map for [names: (password, exclusions)]

const findSomeoneToGift = (elves: string[]): string[] => {
  let finalList = [];
  let namesLeftToChoose = Object.keys(nameExclusionMap);

  for (let i = 0; i < elves.length; i++) {
    const santa = elves[i];

    const forbiddenNames = nameExclusionMap[santa];
    const availableNames = namesLeftToChoose.filter(
      (name) => !forbiddenNames.includes(name)
    );

    if (availableNames.length == 0) {
      console.error(`${santa} has no Options`);
      return [];
    }

    const receiver =
      availableNames[Math.floor(Math.random() * availableNames.length)];

    namesLeftToChoose = namesLeftToChoose.filter((name) => name !== receiver);
    const password = Object.keys(passwordNameMap).find(
      (key) => passwordNameMap[key] === receiver
    );
    finalList.push(`${santa}'s password: ${password}`);
  }

  return finalList;
};

const generateSantas = () => {
  try {
    validateMaps();
  } catch (err) {
    console.error(err);
    return;
  }

  // Sort by people with most names so people with most exclusions are given names first
  const elves = Object.keys(nameExclusionMap).sort((a, b) => {
    return nameExclusionMap[b].length - nameExclusionMap[a].length;
  });

  // Assign santa a reciever
  let finalList = findSomeoneToGift(elves);
  while (finalList.length == 0) {
    finalList = findSomeoneToGift(elves);
  }

  console.table(finalList);
};

generateSantas();
</script>

<template>
  <MainView :name-map="passwordNameMap" title="Awe Cuzzie!" />
</template>

<style style></style>
