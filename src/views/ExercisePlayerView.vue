<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import { translatedPlainText } from "@/domain/content/translatedHtml"
import ExerciseQuestionField from "@/components/exercises/ExerciseQuestionField.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { findCourseLanguage } from "@/domain/courses/courseLanguage"
import {
  buildExerciseResultRoute,
  buildExercisesRoute,
  buildLearningPathDetailRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import {
  hasExerciseLearningPathRouteContext,
  parseExerciseLearningPathRouteContext,
} from "@/domain/exercises/learningPathContext"
import {
  createExerciseAnswerState,
  isExerciseAnswerProvided,
  isSupportedExerciseQuestion,
} from "@/domain/exercises/answers"
import { localizeExerciseQuestionContent } from "@/domain/exercises/presentation"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"
import { useCoursesStore } from "@/stores/courses"
import { useExercisesStore } from "@/stores/exercises"

const props = defineProps<{
  courseId: string
  exerciseId: string
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

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const connectivityStore = useConnectivityStore()
const coursesStore = useCoursesStore()
const store = useExercisesStore()
const confirmedSavedAnswers = ref(false)
const remainingSeconds = ref<number | null>(null)
const previewFinished = ref(false)
const reviewFlowStarted = ref(false)
const reviewSummaryVisible = ref(false)
const hotspotImageSrc = ref<string | null>(null)
const hotspotImageLoading = ref(false)
const hotspotImageError = ref(false)
let hotspotImageObjectUrl: string | null = null
let hotspotImageLoadSequence = 0
let timer: ReturnType<typeof setInterval> | null = null

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})
const numericExerciseId = computed(() => Number(props.exerciseId))
const validExerciseId = computed(
  () => Number.isInteger(numericExerciseId.value) && numericExerciseId.value > 0,
)
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
const errorDescription = computed(() => t(`exercises.errors.${store.errorCode ?? "server"}`))
const contentLocale = computed(() => authStore.profile?.locale || locale.value)
const contentFallbackLocales = computed(() => {
  const courseLanguage = findCourseLanguage(coursesStore.overview, context.value)
  return courseLanguage ? [courseLanguage] : []
})
const question = computed(() => store.currentQuestion)
const displayQuestion = computed(() =>
  question.value
    ? localizeExerciseQuestionContent(
        question.value,
        contentLocale.value,
        contentFallbackLocales.value,
      )
    : null,
)
const currentAnswer = computed(() =>
  question.value ? (store.answers[question.value.id] ?? null) : null,
)
const progress = computed(() =>
  store.answerableQuestions.length
    ? Math.round(((store.currentQuestionIndex + 1) / store.answerableQuestions.length) * 100)
    : 0,
)
const requiresConfirmation = computed(() => store.runtime?.settings.confirmSavedAnswers === true)
const reviewEnabled = computed(() => Number(store.runtime?.settings.reviewAnswers ?? 0) > 0)
const hasFinalReview = computed(() => reviewEnabled.value || store.requiresAllAnswers)
const isTeacherPreview = computed(() => store.runtime?.canManage === true && !store.runtime.attempt)
const canUseMobileAttempt = computed(
  () => store.runtime?.settings.requiresLegacyRuntime !== true && !store.hasUnsupportedQuestions,
)
const reviewItems = computed(() =>
  store.answerableQuestions.map((item, index) => {
    const answer = store.answers[item.id]

    return {
      id: item.id,
      index,
      title: plainText(item.title),
      answered:
        store.savedQuestionIds.includes(item.id) ||
        Boolean(answer && isExerciseAnswerProvided(item, answer)),
      marked: store.reviewQuestionIds.includes(item.id) || Boolean(answer?.reviewLater),
    }
  }),
)
const campusExerciseUrl = computed(() => {
  const baseUrl = campusStore.selectedCampus?.baseUrl
  const path = store.runtime?.legacyUrls.overview
  if (!baseUrl || !path) return null

  try {
    const campusUrl = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`)
    const targetUrl = new URL(path.replace(/^\/+/, ""), campusUrl)

    return targetUrl.origin === campusUrl.origin ? targetUrl.toString() : null
  } catch {
    return null
  }
})
const startBlockMessage = computed(() => {
  if (!store.runtime || store.runtime.attempt) return null
  if (store.runtime.canManage) return null
  if (!connectivityStore.campusAvailable) return t("exercises.offlineAttemptNotPrepared")
  if (!store.runtime.canStartAttempt) return t("exercises.startUnavailable")
  return null
})

function plainText(value: string): string {
  return translatedPlainText(value, contentLocale.value, contentFallbackLocales.value)
}

function updateCurrentAnswer(value: NonNullable<typeof currentAnswer.value>): void {
  if (question.value) store.answers[question.value.id] = value
}

function releaseHotspotImage(): void {
  if (hotspotImageObjectUrl) URL.revokeObjectURL(hotspotImageObjectUrl)
  hotspotImageObjectUrl = null
  hotspotImageSrc.value = null
}

async function loadHotspotImage(): Promise<void> {
  const sequence = ++hotspotImageLoadSequence
  const imageUrl = question.value?.hotspot?.imageUrl?.trim() ?? ""

  releaseHotspotImage()
  hotspotImageLoading.value = false
  hotspotImageError.value = false

  if (!question.value?.hotspot) return
  if (!imageUrl) {
    hotspotImageError.value = true
    return
  }

  hotspotImageLoading.value = true

  try {
    const blob = await store.loadHotspotImage(imageUrl)
    if (sequence !== hotspotImageLoadSequence) return

    hotspotImageObjectUrl = URL.createObjectURL(blob)
    hotspotImageSrc.value = hotspotImageObjectUrl
  } catch {
    if (sequence === hotspotImageLoadSequence) hotspotImageError.value = true
  } finally {
    if (sequence === hotspotImageLoadSequence) hotspotImageLoading.value = false
  }
}

function stopTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}

function startTimer(): void {
  stopTimer()
  remainingSeconds.value = store.runtime?.attempt?.remainingSeconds ?? null
  if (remainingSeconds.value === null) return
  timer = setInterval(() => {
    if (remainingSeconds.value === null || remainingSeconds.value <= 0) {
      stopTimer()
      if (remainingSeconds.value === 0) void finish()
      return
    }
    remainingSeconds.value -= 1
  }, 1000)
}

function formatDuration(value: number): string {
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const seconds = value % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":")
}

async function load(): Promise<void> {
  if (!context.value || !validExerciseId.value || invalidLearningPathContext.value) return
  previewFinished.value = false
  reviewFlowStarted.value = false
  reviewSummaryVisible.value = false
  confirmedSavedAnswers.value = false
  await store.loadRuntime(context.value, numericExerciseId.value, learningPathContext.value)
  startTimer()
}

async function start(): Promise<void> {
  if (!context.value) return
  if (
    await store.startAttempt(context.value, numericExerciseId.value, learningPathContext.value)
  )
    startTimer()
}

async function go(index: number): Promise<void> {
  if (!context.value) return
  if (isTeacherPreview.value) {
    if (index >= 0 && index < store.answerableQuestions.length) {
      store.currentQuestionIndex = index
    }
  } else {
    await store.goToQuestion(
      context.value,
      numericExerciseId.value,
      index,
      learningPathContext.value,
    )
  }
  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function save(): Promise<void> {
  if (context.value) {
    await store.saveCurrentAnswer(
      context.value,
      numericExerciseId.value,
      "none",
      learningPathContext.value,
    )
  }
}

async function finish(): Promise<void> {
  if (!context.value) return
  const attemptId = await store.finishAttempt(
    context.value,
    numericExerciseId.value,
    confirmedSavedAnswers.value,
    learningPathContext.value,
  )
  if (attemptId) {
    stopTimer()
    await router.push(
      buildExerciseResultRoute(
        context.value,
        numericExerciseId.value,
        attemptId,
        learningPathContext.value,
      ),
    )
  }
}

async function requestFinish(): Promise<void> {
  if (isTeacherPreview.value) {
    previewFinished.value = true
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }
  if (!context.value) return
  if (hasFinalReview.value && !reviewSummaryVisible.value) {
    const saved = await store.saveCurrentAnswer(
      context.value,
      numericExerciseId.value,
      "finish",
      learningPathContext.value,
    )
    if (!saved) return

    reviewFlowStarted.value = true
    reviewSummaryVisible.value = true
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }

  await finish()
}

function restartPreview(): void {
  previewFinished.value = false
  store.currentQuestionIndex = 0
  store.answers = Object.fromEntries(
    store.answerableQuestions.map((item) => [item.id, createExerciseAnswerState(item)]),
  )
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function openReviewQuestion(index: number): void {
  if (index < 0 || index >= store.answerableQuestions.length) return
  store.currentQuestionIndex = index
  reviewFlowStarted.value = true
  reviewSummaryVisible.value = false
  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function returnToReview(): Promise<void> {
  if (!context.value) return
  if (
    !(await store.saveCurrentAnswer(
      context.value,
      numericExerciseId.value,
      "none",
      learningPathContext.value,
    ))
  ) {
    return
  }

  reviewSummaryVisible.value = true
  window.scrollTo({ top: 0, behavior: "smooth" })
}

watch(
  () => [question.value?.id ?? null, question.value?.hotspot?.imageUrl ?? null],
  () => void loadHotspotImage(),
  { immediate: true },
)

watch(
  () => store.runtime?.attempt?.remainingSeconds,
  () => startTimer(),
)

onMounted(load)
onBeforeUnmount(() => {
  hotspotImageLoadSequence += 1
  releaseHotspotImage()
  stopTimer()
  store.resetRuntime()
})
</script>

<template>
  <CourseUnavailableState
    v-if="!context || !validExerciseId || invalidLearningPathContext"
    kind="missing"
  />

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

    <LoadingState v-if="store.loading" :label="t('exercises.loadingRuntime')" />

    <ErrorState
      v-else-if="store.errorCode && !store.runtime"
      :title="t('exercises.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.runtime">
      <section class="rounded-2xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{ t("exercises.assessment") }}
        </p>
        <h1 class="mt-1 text-xl font-semibold text-slate-900">
          {{ plainText(store.runtime.title) }}
        </h1>
        <p v-if="store.runtime.description" class="mt-2 text-sm text-slate-600">
          {{ plainText(store.runtime.description) }}
        </p>
      </section>

      <section
        v-if="isTeacherPreview"
        class="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"
      >
        <p class="font-semibold">{{ t("exercises.teacherPreview") }}</p>
        <p class="mt-1">{{ t("exercises.teacherPreviewDescription") }}</p>
      </section>

      <section
        v-if="
          store.hasUnsupportedQuestions || store.runtime.settings.requiresLegacyRuntime === true
        "
        class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        role="alert"
      >
        <p>
          {{
            store.hasUnsupportedQuestions
              ? t("exercises.campusRuntimeRequired")
              : t("exercises.legacyRuntimeRequired")
          }}
        </p>
        <a
          v-if="campusExerciseUrl"
          :href="campusExerciseUrl"
          class="mt-3 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-amber-800 px-4 font-semibold text-white"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i class="pi pi-external-link" aria-hidden="true" />
          {{ t("exercises.openOnCampus") }}
        </a>
        <p v-if="campusExerciseUrl" class="mt-2 text-xs">
          {{ t("exercises.campusSignInNotice") }}
        </p>
      </section>

      <section
        v-if="!store.runtime.attempt && !isTeacherPreview && canUseMobileAttempt"
        class="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm"
      >
        <p class="text-sm text-slate-600">
          {{ t("exercises.startDescription") }}
        </p>
        <p
          v-if="startBlockMessage"
          class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900"
          role="alert"
        >
          {{ startBlockMessage }}
        </p>
        <button
          v-if="connectivityStore.campusAvailable"
          type="button"
          class="mt-4 min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
          :disabled="store.saving || !store.runtime.canStartAttempt"
          @click="start"
        >
          {{ store.saving ? t("exercises.starting") : t("exercises.start") }}
        </button>
      </section>

      <section
        v-else-if="isTeacherPreview && previewFinished"
        class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm"
      >
        <h2 class="text-lg font-semibold">{{ t("exercises.previewFinished") }}</h2>
        <p class="mt-2">{{ t("exercises.teacherPreviewDescription") }}</p>
        <button
          type="button"
          class="mt-4 min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white"
          @click="restartPreview"
        >
          <i class="pi pi-refresh mr-2" aria-hidden="true" />
          {{ t("exercises.restartPreview") }}
        </button>
      </section>

      <section
        v-else-if="reviewSummaryVisible"
        class="space-y-4 rounded-2xl bg-white p-4 shadow-sm"
      >
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            {{ t("exercises.reviewAnswers") }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ t("exercises.reviewAnswersDescription") }}
          </p>
        </div>

        <div class="space-y-2">
          <button
            v-for="item in reviewItems"
            :key="item.id"
            type="button"
            class="flex min-h-touch w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left"
            @click="openReviewQuestion(item.index)"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              :class="
                item.answered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
              "
            >
              {{ item.index + 1 }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-slate-900">{{ item.title }}</span>
              <span class="text-xs text-slate-600">
                {{ item.answered ? t("exercises.answerSaved") : t("exercises.answerRequired") }}
              </span>
            </span>
            <i
              v-if="item.marked"
              class="pi pi-bookmark-fill text-amber-600"
              :aria-label="t('exercises.markedForReview')"
            />
            <i class="pi pi-chevron-right text-slate-400" aria-hidden="true" />
          </button>
        </div>

        <p
          v-if="store.requiresAllAnswers && !store.allAnswersSaved"
          class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {{ t("exercises.answerAllBeforeFinish") }}
        </p>

        <label
          v-if="requiresConfirmation"
          class="flex min-h-touch items-center gap-3 text-sm text-slate-700"
        >
          <input v-model="confirmedSavedAnswers" name="confirm-saved-answers" type="checkbox" />
          {{ t("exercises.confirmSavedAnswers") }}
        </label>

        <button
          type="button"
          class="min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
          :disabled="
            !store.canSubmitFinal ||
            (requiresConfirmation && !confirmedSavedAnswers) ||
            store.saving ||
            store.finishing
          "
          @click="finish"
        >
          {{ store.finishing ? t("exercises.finishing") : t("exercises.finish") }}
        </button>
      </section>

      <template v-else-if="question && (store.runtime.attempt || isTeacherPreview)">
        <section class="rounded-2xl bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              {{
                t("exercises.questionProgress", {
                  current: store.currentQuestionIndex + 1,
                  total: store.answerableQuestions.length,
                })
              }}
            </span>
            <span v-if="remainingSeconds !== null">{{ formatDuration(remainingSeconds) }}</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div class="h-full rounded-full bg-chamilo-600" :style="{ width: `${progress}%` }" />
          </div>
        </section>

        <section class="rounded-2xl bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ question.typeLabel }}
          </p>
          <h2 class="mt-1 text-lg font-semibold text-slate-900">
            {{ plainText(question.title) }}
          </h2>
          <p
            v-if="question.description && question.type !== 21"
            class="mt-2 text-sm text-slate-600"
          >
            {{ plainText(question.description) }}
          </p>

          <ExerciseQuestionField
            v-if="currentAnswer"
            class="mt-5"
            :question="displayQuestion ?? question"
            :model-value="currentAnswer"
            :disabled="store.saving || !isSupportedExerciseQuestion(question)"
            :hotspot-image-src="hotspotImageSrc"
            :hotspot-image-loading="hotspotImageLoading"
            :hotspot-image-error="hotspotImageError"
            @update:model-value="updateCurrentAnswer"
            @retry-hotspot-image="loadHotspotImage"
          />

          <label
            v-if="currentAnswer && reviewEnabled && !isTeacherPreview"
            class="mt-5 flex min-h-touch items-center gap-3 text-sm text-slate-700"
          >
            <input
              :name="`question-${question.id}-review-later`"
              type="checkbox"
              :checked="currentAnswer.reviewLater"
              @change="
                updateCurrentAnswer({
                  ...currentAnswer,
                  reviewLater: ($event.target as HTMLInputElement).checked,
                })
              "
            />
            {{ t("exercises.reviewLater") }}
          </label>
        </section>

        <div
          v-if="store.errorCode"
          class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {{ errorDescription }}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="min-h-touch rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 disabled:opacity-40"
            :disabled="store.currentQuestionIndex === 0 || store.saving"
            @click="go(store.currentQuestionIndex - 1)"
          >
            <i class="pi pi-arrow-left mr-2" aria-hidden="true" />
            {{ t("actions.previous") }}
          </button>
          <button
            v-if="store.currentQuestionIndex < store.answerableQuestions.length - 1"
            type="button"
            class="min-h-touch rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
            :disabled="store.saving"
            @click="go(store.currentQuestionIndex + 1)"
          >
            {{ t("actions.next") }}
            <i class="pi pi-arrow-right ml-2" aria-hidden="true" />
          </button>
          <button
            v-else-if="!isTeacherPreview"
            type="button"
            class="min-h-touch rounded-xl border border-chamilo-700 bg-white px-4 font-semibold text-chamilo-700 disabled:opacity-50"
            :disabled="store.saving"
            @click="save"
          >
            {{ store.saving ? t("exercises.saving") : t("exercises.saveAnswer") }}
          </button>
        </div>

        <section class="rounded-2xl bg-white p-4 shadow-sm">
          <button
            v-if="reviewFlowStarted && !isTeacherPreview"
            type="button"
            class="mb-3 min-h-touch w-full rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 disabled:opacity-50"
            :disabled="store.saving"
            @click="returnToReview"
          >
            <i class="pi pi-list-check mr-2" aria-hidden="true" />
            {{ t("exercises.backToReview") }}
          </button>
          <p
            v-if="!isTeacherPreview && store.requiresAllAnswers && !store.allAnswersSaved"
            class="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
          >
            {{ t("exercises.answerAllBeforeFinish") }}
          </p>
          <label
            v-if="requiresConfirmation && !isTeacherPreview"
            class="flex min-h-touch items-center gap-3 text-sm text-slate-700"
          >
            <input v-model="confirmedSavedAnswers" name="confirm-saved-answers" type="checkbox" />
            {{ t("exercises.confirmSavedAnswers") }}
          </label>
          <button
            type="button"
            class="mt-3 min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
            :disabled="
              (!isTeacherPreview && !store.canFinish) ||
              (requiresConfirmation && !confirmedSavedAnswers) ||
              store.saving ||
              store.finishing
            "
            @click="requestFinish"
          >
            {{
              isTeacherPreview
                ? t("exercises.finishPreview")
                : store.finishing
                  ? t("exercises.finishing")
                  : hasFinalReview
                    ? t("exercises.reviewAnswers")
                    : t("exercises.finish")
            }}
          </button>
        </section>
      </template>
    </template>
  </div>
</template>
