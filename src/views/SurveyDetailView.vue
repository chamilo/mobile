<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import SurveyProfileFieldInput from "@/components/surveys/SurveyProfileFieldInput.vue"
import SurveyQuestionInput from "@/components/surveys/SurveyQuestionInput.vue"
import {
  buildLearningPathDetailRoute,
  buildSurveysRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { isSurveyQuestionVisible } from "@/domain/surveys/answers"
import { formatRecordedAnswers } from "@/domain/surveys/contracts"
import type { SurveyOpenMode, SurveyQuestion } from "@/domain/surveys/types"
import { useSurveysStore } from "@/stores/surveys"

const props = defineProps<{
  courseId: string
  surveyId: string
  surveyTitle: string | null
  mode: string | null
  invitationLpItemId: string | null
  invitationCode: string | null
  learningPathId: string | null
  learningPathTitle: string | null
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const store = useSurveysStore()

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const parsedSurveyId = computed(() => {
  const value = Number(props.surveyId)
  return Number.isInteger(value) && value > 0 ? value : null
})

const parsedMode = computed<SurveyOpenMode | null>(() =>
  props.mode === "preview" || props.mode === "answer" ? props.mode : null,
)

const parsedInvitationLpItemId = computed(() => {
  if (!props.invitationLpItemId) return 0

  const value = Number(props.invitationLpItemId)
  return Number.isInteger(value) && value > 0 ? value : 0
})

const parsedLearningPathId = computed(() => {
  if (!props.learningPathId) return 0

  const value = Number(props.learningPathId)
  return Number.isInteger(value) && value > 0 ? value : 0
})

const hasLearningPathRouteContext = computed(() => props.learningPathId !== null)
const validLearningPathRouteContext = computed(
  () =>
    !hasLearningPathRouteContext.value ||
    (parsedLearningPathId.value > 0 && parsedInvitationLpItemId.value > 0),
)

const backRoute = computed(() => {
  if (!context.value) return null

  return parsedLearningPathId.value > 0
    ? buildLearningPathDetailRoute(
        context.value,
        parsedLearningPathId.value,
        props.learningPathTitle ?? undefined,
      )
    : buildSurveysRoute(context.value)
})

const usableContext = computed(
  () =>
    context.value &&
    parsedSurveyId.value !== null &&
    parsedMode.value !== null &&
    validLearningPathRouteContext.value,
)
const editable = computed(
  () =>
    Boolean(store.detail.data?.canSubmit) &&
    !store.detail.data?.preview &&
    Boolean(store.detail.draft) &&
    !store.detail.draft?.finalizedAt,
)
const pendingSubmission = computed(() => store.detail.submitStatus === "queued")
const submitBusy = computed(() => store.detail.submitStatus === "saving")
const errorDescription = computed(() => t(`surveys.errors.${store.detail.errorCode ?? "server"}`))
const visibleQuestionCount = computed(
  () =>
    store.detail.data?.pages
      .flatMap((page) => page.questions)
      .filter((question) => isVisible(question)).length ?? 0,
)

function formatDate(value: string | null): string {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function answersFor(question: SurveyQuestion): string[] {
  return store.detail.data ? formatRecordedAnswers(question, store.detail.data.answers) : []
}

function answerValue(questionId: number): unknown {
  return store.detail.draft?.answers[String(questionId)]
}

function otherValue(questionId: number): string {
  return store.detail.draft?.otherAnswers[String(questionId)] ?? ""
}

function profileValue(key: string): string | string[] {
  return store.detail.draft?.profileValues[key] ?? ""
}

function isVisible(question: SurveyQuestion): boolean {
  return store.detail.draft ? isSurveyQuestionVisible(question, store.detail.draft.answers) : true
}

function questionNumber(question: SurveyQuestion): number {
  const questions = store.detail.data?.pages.flatMap((page) => page.questions) ?? []
  return questions.filter(isVisible).findIndex((candidate) => candidate.id === question.id) + 1
}

async function updateAnswer(questionId: number, value: unknown): Promise<void> {
  if (!context.value) return
  await store.setAnswer(context.value, questionId, value, parsedInvitationLpItemId.value)
}

async function updateOtherAnswer(questionId: number, value: string): Promise<void> {
  if (!context.value) return
  await store.setOtherAnswer(context.value, questionId, value, parsedInvitationLpItemId.value)
}

async function updateProfileValue(key: string, value: string | string[]): Promise<void> {
  if (!context.value) return
  await store.setProfileValue(context.value, key, value, parsedInvitationLpItemId.value)
}

async function submit(): Promise<void> {
  if (!context.value) return
  await store.submitSurvey(
    context.value,
    parsedInvitationLpItemId.value,
    parsedLearningPathId.value,
  )
}

async function load(): Promise<void> {
  if (context.value && parsedSurveyId.value !== null && parsedMode.value !== null) {
    await store.loadSurvey(
      context.value,
      parsedSurveyId.value,
      parsedMode.value,
      parsedInvitationLpItemId.value,
      props.invitationCode ?? "",
      parsedLearningPathId.value,
    )
  }
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!usableContext" kind="missing" />

  <div v-else-if="context && parsedSurveyId !== null && parsedMode !== null" class="space-y-5">
    <RouterLink
      v-if="backRoute"
      :to="backRoute"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{
        parsedLearningPathId > 0
          ? t("surveys.backToLearningPath")
          : t("surveys.backToSurveys")
      }}
    </RouterLink>

    <LoadingState
      v-if="store.detail.status === 'loading' || store.detail.status === 'idle'"
      :label="t('surveys.detail.loading')"
    />

    <ErrorState
      v-else-if="store.detail.status === 'error'"
      :title="t('surveys.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.detail.data">
      <section class="rounded-2xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{
            store.detail.data.preview
              ? t("surveys.detail.previewEyebrow")
              : t("surveys.detail.eyebrow")
          }}
        </p>
        <h1 class="mt-1 break-words text-xl font-semibold text-slate-900">
          {{ store.detail.data.title || props.surveyTitle || t("surveys.detail.title") }}
        </h1>
        <p v-if="store.detail.data.subtitle" class="mt-2 text-sm text-slate-600">
          {{ store.detail.data.subtitle }}
        </p>
        <p
          v-if="store.detail.data.intro"
          class="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700"
        >
          {{ store.detail.data.intro }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2 text-xs">
          <span
            v-if="store.detail.data.preview"
            class="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-900"
          >
            {{ t("surveys.badges.preview") }}
          </span>
          <span
            v-if="store.detail.data.isAnswered || store.detail.submitStatus === 'submitted'"
            class="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-900"
          >
            {{ t("surveys.badges.answered") }}
          </span>
          <span
            v-else-if="store.detail.data.canSubmit"
            class="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900"
          >
            {{ t("surveys.badges.pending") }}
          </span>
          <span
            v-if="store.detail.data.anonymous"
            class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"
          >
            {{ t("surveys.badges.anonymous") }}
          </span>
        </div>

        <dl class="mt-4 space-y-2 text-sm">
          <div v-if="store.detail.data.availableFrom" class="flex flex-wrap justify-between gap-2">
            <dt class="font-medium text-slate-600">{{ t("surveys.detail.availableFrom") }}</dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.availableFrom) }}
            </dd>
          </div>
          <div v-if="store.detail.data.availableUntil" class="flex flex-wrap justify-between gap-2">
            <dt class="font-medium text-slate-600">{{ t("surveys.detail.availableUntil") }}</dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.availableUntil) }}
            </dd>
          </div>
          <div class="flex flex-wrap justify-between gap-2">
            <dt class="font-medium text-slate-600">{{ t("surveys.detail.questions") }}</dt>
            <dd class="text-right text-slate-800">{{ visibleQuestionCount }}</dd>
          </div>
        </dl>
      </section>

      <div
        v-if="pendingSubmission"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        role="status"
      >
        {{ t("surveys.detail.queuedNotice") }}
      </div>
      <div
        v-else-if="store.detail.submitStatus === 'submitted' || store.detail.data.isFinished"
        class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        role="status"
      >
        {{ t("surveys.detail.submittedNotice") }}
      </div>
      <div
        v-else-if="editable"
        class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"
        role="status"
      >
        {{ t("surveys.detail.offlineAnswerNotice") }}
      </div>
      <div
        v-else
        class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
        role="status"
      >
        {{ t("surveys.detail.readOnlyNotice") }}
      </div>

      <p
        v-if="store.detail.data.message"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      >
        {{ store.detail.data.message }}
      </p>

      <section
        v-if="editable && store.detail.data.profileFields.length"
        class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <h2 class="font-semibold text-slate-900">{{ t("surveys.detail.profileTitle") }}</h2>
          <p class="mt-1 text-sm text-slate-600">{{ t("surveys.detail.profileDescription") }}</p>
        </div>
        <SurveyProfileFieldInput
          v-for="field in store.detail.data.profileFields"
          :key="field.key"
          :field="field"
          :model-value="profileValue(field.key)"
          :disabled="submitBusy"
          :error="store.detail.validationProfileErrors[field.key] ?? ''"
          @update:model-value="updateProfileValue(field.key, $event)"
        />
      </section>

      <div v-if="store.detail.data.pages.length" class="space-y-6">
        <section v-for="page in store.detail.data.pages" :key="page.number" class="space-y-3">
          <h2
            v-if="store.detail.data.pages.length > 1"
            class="text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            {{
              t("surveys.detail.page", {
                current: page.number,
                total: store.detail.data.pages.length,
              })
            }}
          </h2>

          <article
            v-for="question in page.questions.filter(isVisible)"
            :key="question.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <h3 class="min-w-0 flex-1 break-words font-semibold text-slate-900">
                <span v-if="store.detail.data.displayQuestionNumber">
                  {{ questionNumber(question) }}.
                </span>
                {{ question.text }}
              </h3>
              <span
                v-if="question.required"
                class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900"
              >
                {{ t("surveys.badges.required") }}
              </span>
            </div>

            <p
              v-if="question.comment"
              class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600"
            >
              {{ question.comment }}
            </p>

            <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {{ question.typeLabel }}
            </p>

            <SurveyQuestionInput
              v-if="editable && question.supported"
              :question="question"
              :model-value="answerValue(question.id)"
              :other-value="otherValue(question.id)"
              :disabled="submitBusy"
              :error="store.detail.validationQuestionErrors[String(question.id)] ?? ''"
              name-prefix="surveyAnswers"
              @update:model-value="updateAnswer(question.id, $event)"
              @update:other-value="updateOtherAnswer(question.id, $event)"
            />

            <template v-else>
              <div v-if="answersFor(question).length" class="mt-3 space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {{ t("surveys.detail.recordedAnswer") }}
                </p>
                <p
                  v-for="answer in answersFor(question)"
                  :key="answer"
                  class="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-800"
                >
                  {{ answer }}
                </p>
              </div>

              <p v-else class="mt-3 text-sm text-slate-500">
                {{ t("surveys.detail.noRecordedAnswer") }}
              </p>
            </template>

            <p v-if="!question.supported" class="mt-3 text-sm font-medium text-amber-800">
              {{ t("surveys.detail.unsupportedQuestion") }}
            </p>
          </article>
        </section>
      </div>

      <EmptyState
        v-else
        :title="t('surveys.detail.emptyQuestionsTitle')"
        :description="t('surveys.detail.emptyQuestionsDescription')"
      />

      <section v-if="editable" class="rounded-2xl bg-white p-4 shadow-sm">
        <p v-if="store.detail.draft?.savedAt" class="text-xs text-slate-500">
          {{ t("surveys.detail.draftSaved", { date: formatDate(store.detail.draft.savedAt) }) }}
        </p>
        <p
          v-if="store.detail.submitStatus === 'error' && store.detail.errorCode"
          class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {{ errorDescription }}
        </p>
        <button
          type="button"
          class="mt-3 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          :disabled="submitBusy"
          @click="submit"
        >
          <i class="pi pi-send" aria-hidden="true" />
          {{ submitBusy ? t("surveys.detail.saving") : t("surveys.detail.submit") }}
        </button>
      </section>

      <section v-if="store.detail.data.thanks" class="rounded-2xl bg-white p-4 shadow-sm">
        <h2 class="font-semibold text-slate-900">{{ t("surveys.detail.thanksTitle") }}</h2>
        <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {{ store.detail.data.thanks }}
        </p>
      </section>
    </template>
  </div>
</template>
