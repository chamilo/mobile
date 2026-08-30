<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import type { CourseHomeEntry } from "@/domain/courseHome/types"

const props = withDefaults(
  defineProps<{
    entry: CourseHomeEntry
    introduction?: string
  }>(),
  {
    introduction: "",
  },
)

const { t } = useI18n()
const router = useRouter()

const introductionText = computed(() => {
  const value = props.introduction.trim()
  if (!value) return null

  const withSpacing = value
    .replace(/<br\s*\/?\s*>/giu, " ")
    .replace(/<\/?(?:p|div|li|h[1-6]|section|article)\b[^>]*>/giu, " ")

  if (typeof DOMParser === "undefined") {
    return (
      withSpacing
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim() || null
    )
  }

  const document = new DOMParser().parseFromString(withSpacing, "text/html")
  return document.body.textContent?.replace(/\s+/g, " ").trim() || null
})

async function goBackToCourses(): Promise<void> {
  await router.push({ name: "courses" })
}
</script>

<template>
  <div class="space-y-4">
    <nav
      class="flex min-h-touch items-center gap-2 text-sm"
      :aria-label="t('courseHome.breadcrumbLabel')"
    >
      <button
        type="button"
        class="rounded-lg px-2 py-2 font-semibold text-chamilo-700 hover:bg-chamilo-50 focus:outline-none focus:ring-2 focus:ring-chamilo-600"
        @click="goBackToCourses"
      >
        {{ t("courseHome.breadcrumbCourses") }}
      </button>
      <i class="pi pi-chevron-right text-xs text-slate-400" aria-hidden="true" />
      <span class="truncate text-slate-600">{{ t("courseHome.breadcrumbCurrent") }}</span>
    </nav>

    <section
      v-if="entry.progress !== null"
      class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      :aria-label="t('courses.progress')"
    >
      <div class="flex items-center justify-between gap-3 text-xs text-slate-600">
        <span class="font-medium">{{ t("courses.progress") }}</span>
        <span class="font-semibold text-slate-900">{{ entry.progress }}%</span>
      </div>
      <div
        class="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        :aria-label="t('courses.progress')"
        :aria-valuenow="entry.progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="h-full rounded-full bg-chamilo-600 transition-[width]"
          :style="{ width: `${entry.progress}%` }"
          aria-hidden="true"
        />
      </div>
    </section>

    <section
      v-if="introductionText"
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-labelledby="course-introduction-title"
    >
      <h2 id="course-introduction-title" class="text-sm font-semibold text-slate-900">
        {{ t("courseHome.introduction") }}
      </h2>
      <p class="mt-2 text-sm leading-6 text-slate-700">{{ introductionText }}</p>
    </section>

    <section
      v-if="entry.sessionTitle"
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div class="flex items-start gap-3 text-sm text-slate-700">
        <i class="pi pi-calendar mt-0.5 text-chamilo-700" aria-hidden="true" />
        <div>
          <p class="font-semibold text-slate-900">{{ entry.sessionTitle }}</p>
          <p v-if="entry.sessionPeriod" class="mt-0.5 text-xs text-slate-500">
            {{ t(`courseHome.sessionPeriods.${entry.sessionPeriod}`) }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
