<script setup lang="ts">
import SessionCard from "@/components/courses/SessionCard.vue"
import type { CourseSession } from "@/domain/courses/types"

defineProps<{
  title: string
  sessions: CourseSession[]
  campusBaseUrl: string | null
}>()
</script>

<template>
  <section v-if="sessions.length > 0" class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-slate-900">{{ title }}</h2>
      <span class="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
        {{ sessions.length }}
      </span>
    </div>

    <div class="space-y-4">
      <SessionCard
        v-for="session in sessions"
        :key="`${session.period}:${session.id}`"
        :session="session"
        :campus-base-url="campusBaseUrl"
      />
    </div>
  </section>
</template>
