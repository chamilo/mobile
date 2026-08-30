<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import { translatedPlainText } from "@/domain/content/translatedHtml"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildExercisesRoute,
  buildLearningPathDetailRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import {
  hasExerciseLearningPathRouteContext,
  parseExerciseLearningPathRouteContext,
} from "@/domain/exercises/learningPathContext"
import { useExercisesStore } from "@/stores/exercises"
import { useLocaleStore } from "@/stores/locale"

const props = defineProps<{
  courseId: string
  exerciseId: string
  attemptId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
  origin: string | null
  learningPathId: string | null
  learningPathItemId: string | null
  learningPathItemViewId: string | null
  learningPathTitle: string | null
}>()

const { t } = useI18n()
const store = useExercisesStore()
const localeStore = useLocaleStore()
const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})
const exerciseId = computed(() => Number(props.exerciseId))
const attemptId = computed(() => Number(props.attemptId))
const learningPathContext = computed(() => parseExerciseLearningPathRouteContext(props))
const invalidLearningPathContext = computed(
  () => hasExerciseLearningPathRouteContext(props) && !learningPathContext.value,
)
const backRoute = computed(() =>
  context.value && learningPathContext.value
    ? buildLearningPathDetailRoute(
        context.value,
        learningPathContext.value.learningPathId,
        learningPathContext.value.learningPathTitle || undefined,
      )
    : context.value
      ? buildExercisesRoute(context.value)
      : { name: "courses" },
)
const validIds = computed(
  () =>
    Number.isInteger(exerciseId.value) &&
    exerciseId.value > 0 &&
    Number.isInteger(attemptId.value) &&
    attemptId.value > 0,
)
const attempt = computed(() => store.result?.attempt ?? {})
const scoreVisible = computed(
  () => typeof attempt.value.score === "number" && typeof attempt.value.maxScore === "number",
)
const errorDescription = computed(() => t(`exercises.errors.${store.errorCode ?? "server"}`))
const contentLocale = computed(() => localeStore.contentLocale)
const contentFallbackLocales = computed(() => localeStore.contentFallbackLocales)

function plainText(value: unknown): string {
  return typeof value === "string"
    ? translatedPlainText(value, contentLocale.value, contentFallbackLocales.value)
    : ""
}

async function load(): Promise<void> {
  if (context.value && validIds.value && !invalidLearningPathContext.value) {
    await store.loadResult(
      context.value,
      exerciseId.value,
      attemptId.value,
      learningPathContext.value,
    )
  }
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!context || !validIds || invalidLearningPathContext" kind="missing" />

  <div v-else class="space-y-5">
    <RouterLink
      :to="backRoute"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{
        learningPathContext
          ? learningPathContext.learningPathTitle || t("learningPaths.title")
          : t("exercises.backToExercises")
      }}
    </RouterLink>

    <LoadingState v-if="store.loading" :label="t('exercises.loadingResult')" />

    <ErrorState
      v-else-if="store.errorCode"
      :title="t('exercises.resultErrorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.result">
      <section class="rounded-2xl bg-white p-5 text-center shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{ t("exercises.result") }}
        </p>
        <h1 class="mt-2 text-xl font-semibold text-slate-900">
          {{ plainText(store.result.title) }}
        </h1>
        <div v-if="scoreVisible" class="mt-5">
          <p class="text-4xl font-bold text-chamilo-700">
            {{ attempt.score }} / {{ attempt.maxScore }}
          </p>
          <p v-if="typeof attempt.percentage === 'number'" class="mt-1 text-sm text-slate-600">
            {{ attempt.percentage }}%
          </p>
        </div>
        <p v-else class="mt-5 text-sm text-slate-600">
          {{ t("exercises.scoreHidden") }}
        </p>
        <p v-if="attempt.status" class="mt-3 text-sm font-semibold text-slate-700">
          {{ t("exercises.status") }}: {{ attempt.status }}
        </p>
      </section>

      <section v-if="store.result.questions.length" class="rounded-2xl bg-white p-4 shadow-sm">
        <h2 class="font-semibold text-slate-900">
          {{ t("exercises.questionSummary") }}
        </h2>
        <ul class="mt-3 divide-y divide-slate-200">
          <li v-for="question in store.result.questions" :key="String(question.id)" class="py-3">
            <div class="flex items-start justify-between gap-3">
              <span class="text-sm text-slate-800">{{ plainText(question.title) }}</span>
              <span
                v-if="typeof question.isCorrect === 'boolean'"
                class="text-sm font-semibold"
                :class="question.isCorrect ? 'text-emerald-700' : 'text-red-700'"
              >
                {{ question.isCorrect ? t("exercises.correct") : t("exercises.incorrect") }}
              </span>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
