<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
</script>

<template>
  <!-- Who replied first, then the reply settings -->
  <div class="replies-page">
    <AdminReplies />
    <AdminWeddingForm part="replies" />
  </div>
</template>

<style scoped>
.replies-page { display: flex; flex-direction: column; gap: var(--space-5); max-width: 56rem; }
</style>
