<script setup lang="ts">
// The site root opens the default wedding.
const localePath = useLocalePath()
await navigateTo(localePath(`/wedding/${useRuntimeConfig().public.defaultWeddingSlug}`), { redirectCode: 302 })
</script>

<template>
  <div />
</template>
