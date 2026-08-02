<script setup lang="ts">
import { computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { buildCourseProgressRoute } from "@/domain/courses/routeContext"
import type { CourseNavigationContext } from "@/domain/courses/types"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useCoursesStore } from "@/stores/courses"

interface ProgressCourseItem {
  key: string
  title: string
  code: string | null
  context: CourseNavigationContext
  sourceLabel: string
  progress: number | null
  accessAllowed: boolean
}

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const coursesStore = useCoursesStore()
const { selectedCampus } = storeToRefs(campusStore)
const { overview, status, errorCode, isRefreshing } = storeToRefs(coursesStore)

const errorDescription = computed(() =>
  errorCode.value ? t(`courses.errors.${errorCode.value}`) : t("courses.errors.server"),
)

const progressCourses = computed<ProgressCourseItem[]>(() => {
  const directCourses = overview.value.directCourses.map((enrollment) => ({
    key: enrollment.key,
    title: enrollment.course.title,
    code: enrollment.course.code,
    context: enrollment.context,
    sourceLabel: t("myProgress.directCourse"),
    progress: enrollment.progress,
    accessAllowed: enrollment.accessAllowed,
  }))

  const sessionCourses = [
    ...overview.value.currentSessions,
    ...overview.value.upcomingSessions,
    ...overview.value.pastSessions,
  ].flatMap((session) =>
    session.courses.map((enrollment) => ({
      key: `${session.period}:${session.id}:${enrollment.key}`,
      title: enrollment.course.title,
      code: enrollment.course.code,
      context: enrollment.context,
      sourceLabel: session.title,
      progress: null,
      accessAllowed: true,
    })),
  )

  return [...directCourses, ...sessionCourses]
})

async function load(force = false): Promise<void> {
  await coursesStore.loadOverview(force)

  if (errorCode.value === "session_expired" || errorCode.value === "session_required") {
    const campusId = selectedCampus.value?.id

    if (campusId) {
      await authStore.clearCampusSession(campusId)
    }

    await router.replace({ name: "login", query: { redirect: "/progress" } })
  }
}

onMounted(() => load())
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-2xl bg-white p-5 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
            {{ t("myProgress.eyebrow") }}
          </p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">
            {{ t("myProgress.title") }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            {{ t("myProgress.description") }}
          </p>
        </div>

        <button
          type="button"
          class="flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl border border-slate-200 text-chamilo-700 transition hover:bg-chamilo-50 disabled:opacity-60"
          :aria-label="t('myProgress.refresh')"
          :disabled="status === 'loading' || isRefreshing"
          @click="load(true)"
        >
          <i class="pi pi-refresh" :class="isRefreshing ? 'pi-spin' : ''" aria-hidden="true" />
        </button>
      </div>
    </section>

    <LoadingState v-if="status === 'loading'" :label="t('myProgress.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :title="t('myProgress.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      :retrying="isRefreshing"
      @retry="load(true)"
    />

    <template v-else-if="status === 'ready'">
      <section v-if="progressCourses.length > 0" class="space-y-3">
        <RouterLink
          v-for="course in progressCourses"
          :key="course.key"
          :to="buildCourseProgressRoute(course.context)"
          class="hover:border-chamilo-300 block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-chamilo-50 focus:outline-none focus:ring-2 focus:ring-chamilo-600"
          :class="!course.accessAllowed ? 'pointer-events-none opacity-60' : ''"
          :aria-disabled="!course.accessAllowed"
          :tabindex="course.accessAllowed ? undefined : -1"
        >
          <div class="flex items-center gap-4">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-chamilo-50 text-xl text-chamilo-700"
              aria-hidden="true"
            >
              <i class="pi pi-chart-line" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span>{{ course.sourceLabel }}</span>
                <span v-if="course.code">{{ course.code }}</span>
              </div>
              <h3 class="mt-1 truncate font-semibold text-slate-900">{{ course.title }}</h3>

              <div v-if="course.progress !== null" class="mt-3 space-y-1.5">
                <div class="flex items-center justify-between text-xs text-slate-600">
                  <span>{{ t("courses.progress") }}</span>
                  <span class="font-semibold">{{ course.progress }}%</span>
                </div>
                <div
                  class="h-2 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  :aria-label="t('courses.progress')"
                  :aria-valuenow="course.progress"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    class="h-full rounded-full bg-chamilo-600"
                    :style="{ width: `${course.progress}%` }"
                  />
                </div>
              </div>
            </div>

            <i class="pi pi-chevron-right text-slate-400" aria-hidden="true" />
          </div>

          <p v-if="!course.accessAllowed" class="mt-3 text-xs leading-5 text-amber-900">
            {{ t("courses.requirementsLocked") }}
          </p>
        </RouterLink>
      </section>

      <EmptyState
        v-else
        :title="t('myProgress.emptyTitle')"
        :description="t('myProgress.emptyDescription')"
      />
    </template>
  </div>
</template>
