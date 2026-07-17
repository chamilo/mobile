<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

import CourseCard from "@/components/courses/CourseCard.vue"
import type { CourseSession } from "@/domain/courses/types"

const props = defineProps<{
  session: CourseSession
  campusBaseUrl: string | null
}>()

const { locale, t } = useI18n()
const expanded = ref(props.session.period === "current")

const dateLabel = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  const start = props.session.displayStartDate
    ? formatter.format(new Date(props.session.displayStartDate))
    : null
  const end = props.session.displayEndDate
    ? formatter.format(new Date(props.session.displayEndDate))
    : null

  if (start && end) {
    return `${start} – ${end}`
  }

  return start ?? end
})

const durationLabel = computed(() => {
  if (props.session.durationDays && props.session.durationDays > 0) {
    return t("courses.sessionDuration", { count: props.session.durationDays })
  }

  return null
})
</script>

<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <button
      type="button"
      class="flex min-h-touch w-full items-center gap-3 p-4 text-left"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chamilo-50 text-chamilo-700"
        aria-hidden="true"
      >
        <i class="pi pi-calendar" />
      </span>

      <span class="min-w-0 flex-1">
        <span class="block truncate font-semibold text-slate-900">{{ session.title }}</span>
        <span v-if="dateLabel" class="mt-1 block text-xs text-slate-600">{{ dateLabel }}</span>
        <span v-else-if="durationLabel" class="mt-1 block text-xs text-slate-600">
          {{ durationLabel }}
        </span>
        <span class="mt-1 block text-xs font-medium text-chamilo-700">
          {{ t("courses.courseCount", { count: session.courses.length }) }}
        </span>
      </span>

      <i
        class="pi pi-chevron-down text-slate-500 transition-transform"
        :class="expanded ? 'rotate-180' : ''"
        aria-hidden="true"
      />
    </button>

    <div v-if="expanded" class="space-y-4 border-t border-slate-100 bg-slate-50 p-4">
      <CourseCard
        v-for="enrollment in session.courses"
        :key="enrollment.key"
        :enrollment="enrollment"
        :campus-base-url="campusBaseUrl"
      />

      <p v-if="session.courses.length === 0" class="py-3 text-center text-sm text-slate-600">
        {{ t("courses.emptySession") }}
      </p>
    </div>
  </article>
</template>
