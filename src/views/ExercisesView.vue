<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildCourseRoute,
  buildExercisePlayerRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { useExercisesStore } from "@/stores/exercises"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const store = useExercisesStore()

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const errorDescription = computed(() => t(`exercises.errors.${store.errorCode ?? "server"}`))

function plainText(value: string): string {
  const container = document.createElement("div")
  container.innerHTML = value
  return container.textContent ?? ""
}

async function load(): Promise<void> {
  if (context.value) await store.loadList(context.value)
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!context" kind="missing" />

  <div v-else class="space-y-5">
    <RouterLink
      :to="buildCourseRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("exercises.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("exercises.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("exercises.title") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t("exercises.description") }}
      </p>
    </section>

    <LoadingState v-if="store.loading" :label="t('exercises.loading')" />

    <ErrorState
      v-else-if="store.errorCode"
      :title="t('exercises.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <div v-else-if="store.list?.items.length" class="space-y-3">
      <article
        v-for="exercise in store.list.items"
        :key="exercise.id"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 class="font-semibold text-slate-900">
          {{ plainText(exercise.title) }}
        </h2>
        <p v-if="exercise.description" class="mt-2 line-clamp-3 text-sm text-slate-600">
          {{ plainText(exercise.description) }}
        </p>
        <dl class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <dt class="font-semibold">{{ t("exercises.questions") }}</dt>
            <dd>{{ exercise.questionCount }}</dd>
          </div>
          <div>
            <dt class="font-semibold">{{ t("exercises.attempts") }}</dt>
            <dd>{{ exercise.attemptCount }}</dd>
          </div>
        </dl>
        <p
          v-if="exercise.isReadOnlyFromLearningPath"
          class="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"
        >
          {{ exercise.learningPathReadOnlyMessage }}
        </p>
        <RouterLink
          v-if="exercise.canOpen"
          :to="buildExercisePlayerRoute(context, exercise.id)"
          class="mt-4 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 font-semibold text-white"
        >
          {{ exercise.latestAttempt ? t("exercises.resume") : t("exercises.open") }}
          <i class="pi pi-arrow-right" aria-hidden="true" />
        </RouterLink>
        <p v-else class="mt-3 text-sm text-slate-500">
          {{ t("exercises.unavailable") }}
        </p>
      </article>
    </div>

    <EmptyState
      v-else
      :title="t('exercises.emptyTitle')"
      :description="t('exercises.emptyDescription')"
    />
  </div>
</template>
