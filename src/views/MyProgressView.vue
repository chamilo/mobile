<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import type { CourseNavigationContext } from "@/domain/courses/types"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useCoursesStore } from "@/stores/courses"
import { useCourseToolCollectionsStore } from "@/stores/courseToolCollections"

type ProgressCourseItem = {
  key: string
  title: string
  code: string | null
  context: CourseNavigationContext
  sourceLabel: string
  progress: number | null
  score: number | null
  bestScore: number | null
  timeSpentSeconds: number | null
  certificateAvailable: boolean | null
  completed: boolean | null
  accessAllowed: boolean
}

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const coursesStore = useCoursesStore()
const toolCollectionsStore = useCourseToolCollectionsStore()
const { selectedCampus } = storeToRefs(campusStore)
const { overview, status, errorCode, isRefreshing } = storeToRefs(coursesStore)
const expandedCourseKey = ref<string | null>(null)
const detailsContextKey = ref<string | null>(null)

const learningPathState = computed(() => toolCollectionsStore.states["learning-paths"])
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
    score: enrollment.score ?? null,
    bestScore: enrollment.bestScore ?? null,
    timeSpentSeconds: enrollment.timeSpentSeconds ?? null,
    certificateAvailable: enrollment.certificateAvailable,
    completed: enrollment.completed,
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
      progress: enrollment.progress,
      score: enrollment.score,
      bestScore: enrollment.bestScore,
      timeSpentSeconds: enrollment.timeSpentSeconds,
      certificateAvailable: enrollment.certificateAvailable,
      completed: enrollment.completed,
      accessAllowed: true,
    })),
  )

  return [...directCourses, ...sessionCourses]
})

function contextKey(context: CourseNavigationContext): string {
  return [
    context.source,
    context.courseId,
    context.sessionId ?? 0,
    context.membershipId ?? 0,
    context.sessionCourseId ?? 0,
  ].join(":")
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return t("myProgress.unavailable")
  }

  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  return `${minutes}m`
}

function formatScore(value: number | null | undefined): string {
  return value === null || value === undefined
    ? t("myProgress.unavailable")
    : `${Math.round(value * 10) / 10}%`
}

async function toggleDetails(course: ProgressCourseItem): Promise<void> {
  if (!course.accessAllowed) return

  if (expandedCourseKey.value === course.key) {
    expandedCourseKey.value = null
    detailsContextKey.value = null
    return
  }

  expandedCourseKey.value = course.key
  detailsContextKey.value = contextKey(course.context)
  await toolCollectionsStore.load("learning-paths", course.context)
}

function detailsBelongTo(course: ProgressCourseItem): boolean {
  return (
    expandedCourseKey.value === course.key && detailsContextKey.value === contextKey(course.context)
  )
}

async function retryLearningPaths(course: ProgressCourseItem): Promise<void> {
  detailsContextKey.value = contextKey(course.context)
  await toolCollectionsStore.load("learning-paths", course.context)
}

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
        <article
          v-for="course in progressCourses"
          :key="course.key"
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          :class="!course.accessAllowed ? 'opacity-60' : ''"
        >
          <button
            type="button"
            class="flex min-h-touch w-full items-center gap-4 p-4 text-left transition hover:bg-chamilo-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-chamilo-600 disabled:cursor-not-allowed"
            :disabled="!course.accessAllowed"
            :aria-expanded="expandedCourseKey === course.key"
            @click="toggleDetails(course)"
          >
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

            <i
              class="pi text-slate-400"
              :class="expandedCourseKey === course.key ? 'pi-chevron-up' : 'pi-chevron-down'"
              aria-hidden="true"
            />
          </button>

          <p v-if="!course.accessAllowed" class="px-4 pb-4 text-xs leading-5 text-amber-900">
            {{ t("courses.requirementsLocked") }}
          </p>

          <div
            v-if="detailsBelongTo(course)"
            class="space-y-5 border-t border-slate-100 bg-slate-50/70 p-4"
          >
            <section aria-labelledby="learning-path-progress-title">
              <h4 id="learning-path-progress-title" class="text-sm font-semibold text-slate-900">
                {{ t("myProgress.learningPaths") }}
              </h4>

              <LoadingState
                v-if="learningPathState.status === 'loading' || learningPathState.status === 'idle'"
                :label="t('myProgress.learningPathsLoading')"
              />

              <ErrorState
                v-else-if="learningPathState.status === 'error'"
                :title="t('myProgress.learningPathsError')"
                :description="
                  t('acceleratedTools.errors.' + (learningPathState.errorCode ?? 'server'))
                "
                :retry-label="t('actions.retry')"
                @retry="retryLearningPaths(course)"
              />

              <div v-else-if="learningPathState.collection?.items.length" class="mt-3 space-y-2">
                <div
                  v-for="learningPath in learningPathState.collection.items"
                  :key="learningPath.id"
                  class="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div class="flex items-start justify-between gap-3">
                    <p class="min-w-0 flex-1 break-words text-sm font-semibold text-slate-900">
                      {{ learningPath.title }}
                    </p>
                    <span
                      v-if="learningPath.score !== null"
                      class="shrink-0 rounded-full bg-chamilo-50 px-2.5 py-1 text-xs font-semibold text-chamilo-700"
                    >
                      {{ t("myProgress.scoreLabel") }}: {{ learningPath.score }}
                    </span>
                  </div>

                  <div v-if="learningPath.progress !== null" class="mt-3 flex items-center gap-3">
                    <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        class="h-full rounded-full bg-chamilo-600"
                        :style="{ width: `${learningPath.progress}%` }"
                      />
                    </div>
                    <span class="text-xs font-semibold text-slate-600">
                      {{ learningPath.progress }}%
                    </span>
                  </div>
                </div>
              </div>

              <p v-else class="mt-3 text-sm text-slate-600">
                {{ t("myProgress.learningPathsEmpty") }}
              </p>
            </section>

            <section class="grid gap-2 sm:grid-cols-2" :aria-label="t('myProgress.summaryLabel')">
              <div class="rounded-xl border border-slate-200 bg-white p-3">
                <p class="text-xs text-slate-500">{{ t("myProgress.totalTime") }}</p>
                <p class="mt-1 font-semibold text-slate-900">
                  {{ formatDuration(course.timeSpentSeconds) }}
                </p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-3">
                <p class="text-xs text-slate-500">
                  {{ t("myProgress.averageLatestAttemptScore") }}
                </p>
                <p class="mt-1 font-semibold text-slate-900">
                  {{ formatScore(course.score) }}
                </p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-3">
                <p class="text-xs text-slate-500">{{ t("myProgress.averageBestAttemptScore") }}</p>
                <p class="mt-1 font-semibold text-slate-900">
                  {{ formatScore(course.bestScore) }}
                </p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-3">
                <p class="text-xs text-slate-500">{{ t("myProgress.certificate") }}</p>
                <p class="mt-1 font-semibold text-slate-900">
                  {{
                    course.certificateAvailable === null
                      ? t("myProgress.unavailable")
                      : course.certificateAvailable
                        ? t("myProgress.certificateAvailable")
                        : t("myProgress.certificateUnavailable")
                  }}
                </p>
              </div>
            </section>
          </div>
        </article>
      </section>

      <EmptyState
        v-else
        :title="t('myProgress.emptyTitle')"
        :description="t('myProgress.emptyDescription')"
      />
    </template>
  </div>
</template>
