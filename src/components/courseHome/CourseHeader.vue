<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import type { CourseHomeEntry } from "@/domain/courseHome/types"
import { resolveCampusAssetUrl } from "@/domain/courses/resolveCampusAssetUrl"

const props = defineProps<{
  entry: CourseHomeEntry
  campusBaseUrl: string | null
}>()

const { t } = useI18n()
const imageUrl = computed(() =>
  resolveCampusAssetUrl(props.entry.course.illustrationUrl, props.campusBaseUrl),
)
</script>

<template>
  <header class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="relative min-h-36 overflow-hidden bg-chamilo-50">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="entry.course.title"
        class="absolute inset-0 size-full object-cover"
        referrerpolicy="no-referrer"
      />
      <div v-else class="absolute inset-0 bg-gradient-to-br from-chamilo-50 to-chamilo-100" />
      <div
        class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent"
      />

      <RouterLink
        :to="{ name: 'courses' }"
        class="absolute left-3 top-3 flex size-11 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
        :aria-label="t('courseHome.backToCourses')"
      >
        <i class="pi pi-arrow-left" aria-hidden="true" />
      </RouterLink>

      <div class="relative flex min-h-36 flex-col justify-end p-5 text-white">
        <div class="mb-2 flex flex-wrap gap-2 text-xs font-semibold">
          <span v-if="entry.course.code" class="rounded-full bg-black/35 px-2.5 py-1">
            {{ entry.course.code }}
          </span>
          <span class="rounded-full bg-black/35 px-2.5 py-1">
            {{ t(`courses.roles.${entry.role}`) }}
          </span>
        </div>
        <h1 class="text-xl font-semibold leading-7">{{ entry.course.title }}</h1>
      </div>
    </div>

    <div class="space-y-3 p-4">
      <div v-if="entry.sessionTitle" class="flex items-start gap-3 text-sm text-slate-700">
        <i class="pi pi-calendar mt-0.5 text-chamilo-700" aria-hidden="true" />
        <div>
          <p class="font-semibold text-slate-900">{{ entry.sessionTitle }}</p>
          <p v-if="entry.sessionPeriod" class="mt-0.5 text-xs text-slate-500">
            {{ t(`courseHome.sessionPeriods.${entry.sessionPeriod}`) }}
          </p>
        </div>
      </div>

      <div v-if="entry.progress !== null" class="space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-600">
          <span>{{ t("courses.progress") }}</span>
          <span class="font-semibold">{{ entry.progress }}%</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            class="h-full rounded-full bg-chamilo-600"
            :style="{ width: `${entry.progress}%` }"
          />
        </div>
      </div>
    </div>
  </header>
</template>
