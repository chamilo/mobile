<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import { buildCourseRoute } from "@/domain/courses/routeContext"
import { resolveCampusAssetUrl } from "@/domain/courses/resolveCampusAssetUrl"
import type { DirectCourseEnrollment, SessionCourseEnrollment } from "@/domain/courses/types"

const props = defineProps<{
  enrollment: DirectCourseEnrollment | SessionCourseEnrollment
  campusBaseUrl: string | null
}>()

const { t } = useI18n()

const directEnrollment = computed<DirectCourseEnrollment | null>(() =>
  props.enrollment.source === "direct" ? props.enrollment : null,
)
const imageUrl = computed(() =>
  resolveCampusAssetUrl(props.enrollment.course.illustrationUrl, props.campusBaseUrl),
)
const courseRoute = computed(() => buildCourseRoute(props.enrollment.context))
const accessAllowed = computed(() => directEnrollment.value?.accessAllowed ?? true)
const teachersLabel = computed(() => {
  if (!directEnrollment.value || directEnrollment.value.teachers.length === 0) {
    return null
  }

  return directEnrollment.value.teachers
    .slice(0, 2)
    .map((teacher) => teacher.fullName)
    .join(", ")
})
</script>

<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="relative aspect-[16/7] overflow-hidden bg-chamilo-50">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="enrollment.course.title"
        class="h-full w-full object-cover"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
      <div
        v-else
        class="flex h-full items-center justify-center text-4xl text-chamilo-700"
        aria-hidden="true"
      >
        <i class="pi pi-book" />
      </div>

      <span
        v-if="directEnrollment?.hasNewContent"
        class="absolute right-3 top-3 rounded-full bg-chamilo-700 px-3 py-1 text-xs font-semibold text-white shadow"
      >
        {{ t("courses.newContent") }}
      </span>
    </div>

    <div class="space-y-4 p-4">
      <div>
        <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
          <span v-if="enrollment.course.code">{{ enrollment.course.code }}</span>
          <span
            v-if="directEnrollment && directEnrollment.role !== 'unknown'"
            class="text-chamilo-800 rounded-full bg-chamilo-50 px-2.5 py-1"
          >
            {{ t(`courses.roles.${directEnrollment.role}`) }}
          </span>
        </div>
        <h3 class="mt-2 text-base font-semibold leading-6 text-slate-900">
          {{ enrollment.course.title }}
        </h3>
      </div>

      <div v-if="directEnrollment && directEnrollment.progress !== null" class="space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-600">
          <span>{{ t("courses.progress") }}</span>
          <span class="font-semibold">{{ directEnrollment.progress }}%</span>
        </div>
        <div
          class="h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          :aria-label="t('courses.progress')"
          :aria-valuenow="directEnrollment.progress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="h-full rounded-full bg-chamilo-600"
            :style="{ width: `${directEnrollment.progress}%` }"
          />
        </div>
      </div>

      <p v-if="teachersLabel" class="flex items-start gap-2 text-xs leading-5 text-slate-600">
        <i class="pi pi-users mt-0.5 text-chamilo-700" aria-hidden="true" />
        <span>{{ teachersLabel }}</span>
      </p>

      <p
        v-if="directEnrollment && !directEnrollment.accessAllowed"
        class="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"
      >
        {{ t("courses.requirementsLocked") }}
      </p>

      <RouterLink
        v-if="accessAllowed"
        :to="courseRoute"
        class="hover:bg-chamilo-800 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 text-sm font-semibold text-white transition"
      >
        {{ t("courses.openCourse") }}
        <i class="pi pi-arrow-right" aria-hidden="true" />
      </RouterLink>
      <button
        v-else
        type="button"
        class="min-h-touch w-full cursor-not-allowed rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
        disabled
      >
        {{ t("courses.locked") }}
      </button>
    </div>
  </article>
</template>
