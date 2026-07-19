<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildSurveysRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { formatRecordedAnswers } from "@/domain/surveys/contracts"
import type { SurveyOpenMode, SurveyQuestion } from "@/domain/surveys/types"
import { useSurveysStore } from "@/stores/surveys"

const props = defineProps<{
  courseId: string
  surveyId: string
  surveyTitle: string | null
  mode: string | null
  invitationLpItemId: string | null
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

const usableContext = computed(
  () => context.value && parsedSurveyId.value !== null && parsedMode.value !== null,
)

const errorDescription = computed(() => t(`surveys.errors.${store.detail.errorCode ?? "server"}`))

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

async function load(): Promise<void> {
  if (context.value && parsedSurveyId.value !== null && parsedMode.value !== null) {
    await store.loadSurvey(
      context.value,
      parsedSurveyId.value,
      parsedMode.value,
      parsedInvitationLpItemId.value,
    )
  }
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!usableContext" kind="missing" />

  <div v-else-if="context && parsedSurveyId !== null && parsedMode !== null" class="space-y-5">
    <RouterLink
      :to="buildSurveysRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("surveys.backToSurveys") }}
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
            v-if="store.detail.data.isAnswered"
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
            <dt class="font-medium text-slate-600">
              {{ t("surveys.detail.availableFrom") }}
            </dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.availableFrom) }}
            </dd>
          </div>
          <div v-if="store.detail.data.availableUntil" class="flex flex-wrap justify-between gap-2">
            <dt class="font-medium text-slate-600">
              {{ t("surveys.detail.availableUntil") }}
            </dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.availableUntil) }}
            </dd>
          </div>
        </dl>
      </section>

      <div
        class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"
        role="status"
      >
        {{
          store.detail.data.canSubmit
            ? t("surveys.detail.pendingReadOnlyNotice")
            : t("surveys.detail.readOnlyNotice")
        }}
      </div>

      <p
        v-if="store.detail.data.message"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      >
        {{ store.detail.data.message }}
      </p>

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
            v-for="(question, questionIndex) in page.questions"
            :key="question.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <h3 class="min-w-0 flex-1 break-words font-semibold text-slate-900">
                <span v-if="store.detail.data.displayQuestionNumber">
                  {{ questionIndex + 1 }}.
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

      <section v-if="store.detail.data.thanks" class="rounded-2xl bg-white p-4 shadow-sm">
        <h2 class="font-semibold text-slate-900">
          {{ t("surveys.detail.thanksTitle") }}
        </h2>
        <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {{ store.detail.data.thanks }}
        </p>
      </section>
    </template>
  </div>
</template>
