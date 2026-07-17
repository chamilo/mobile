<script setup lang="ts">
import { computed } from "vue"

import { sanitizeAnnouncementHtml } from "@/domain/announcements/sanitizeAnnouncementHtml"

const props = defineProps<{
  html: string
  campusBaseUrl: string
}>()

const sanitizedHtml = computed(() => sanitizeAnnouncementHtml(props.html, props.campusBaseUrl))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div
    v-if="sanitizedHtml"
    class="announcement-content text-sm leading-7 text-slate-700"
    v-html="sanitizedHtml"
  />
</template>

<style scoped>
.announcement-content :deep(p),
.announcement-content :deep(ul),
.announcement-content :deep(ol),
.announcement-content :deep(blockquote),
.announcement-content :deep(pre),
.announcement-content :deep(table) {
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

.announcement-content :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}

.announcement-content :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}

.announcement-content :deep(a) {
  color: rgb(3 105 161);
  text-decoration: underline;
  overflow-wrap: anywhere;
}

.announcement-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
}

.announcement-content :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.announcement-content :deep(th),
.announcement-content :deep(td) {
  border: 1px solid rgb(203 213 225);
  padding: 0.5rem;
  text-align: left;
}

.announcement-content :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  border-radius: 0.75rem;
  background: rgb(15 23 42);
  padding: 0.75rem;
  color: white;
}
</style>
