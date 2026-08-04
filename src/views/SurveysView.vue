<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildCourseRoute,
  buildSurveyDetailRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import type { SurveyAvailabilityStatus, SurveySummary } from "@/domain/surveys/types"
import { useSurveysStore } from "@/stores/surveys"

const props = defineProps<{
  courseId: string
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

const errorDescription = computed(() => t(`surveys.errors.${store.list.errorCode ?? "server"}`))

function formatDate(value: string | null): string {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function availabilityLabel(status: SurveyAvailabilityStatus): string {
  return t(`surveys.availability.${status}`)
}

function availabilityClass(status: SurveyAvailabilityStatus): string {
  if (status === "open") return "bg-emerald-100 text-emerald-900"
  if (status === "not_started") return "bg-sky-100 text-sky-900"
  if (status === "closed") return "bg-slate-200 text-slate-800"

  return "bg-amber-100 text-amber-900"
}

function unavailableLabel(survey: SurveySummary): string {
  return (
    survey.unsupportedReason ||
    t(`surveys.unavailable.${survey.unavailableReason ?? "unsupported"}`)
  )
}

function detailRoute(survey: SurveySummary) {
  if (!context.value || !survey.openMode) return { name: "courses" }

  return buildSurveyDetailRoute(
    context.value,
    survey.id,
    survey.openMode,
    survey.title,
    survey.invitationLpItemId,
    survey.invitationCode,
  )
}

async function load(): Promise<void> {
  if (context.value) {
    await store.loadSurveys(context.value)
  }
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
      {{ t("surveys.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("surveys.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("surveys.title") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t("surveys.description") }}
      </p>
    </section>

    <div class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900" role="status">
      {{ t("surveys.readOnlyNotice") }}
    </div>

    <LoadingState
      v-if="store.list.status === 'loading' || store.list.status === 'idle'"
      :label="t('surveys.loading')"
    />

    <ErrorState
      v-else-if="store.list.status === 'error'"
      :title="t('surveys.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.list.data">
      <div v-if="store.list.data.items.length" class="space-y-3">
        <template v-for="survey in store.list.data.items" :key="survey.id">
          <RouterLink
            v-if="survey.openMode"
            :to="detailRoute(survey)"
            class="hover:border-chamilo-300 block min-h-touch rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h2 class="break-words font-semibold text-slate-900">
                  {{ survey.title }}
                </h2>
                <p
                  v-if="survey.subtitle"
                  class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600"
                >
                  {{ survey.subtitle }}
                </p>
              </div>
              <i class="pi pi-chevron-right mt-1 text-slate-400" aria-hidden="true" />
            </div>

            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span
                class="rounded-full px-2.5 py-1 font-semibold"
                :class="availabilityClass(survey.availabilityStatus)"
              >
                {{ availabilityLabel(survey.availabilityStatus) }}
              </span>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                {{ survey.surveyTypeLabel }}
              </span>
              <span
                v-if="survey.mandatory"
                class="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900"
              >
                {{ t("surveys.badges.mandatory") }}
              </span>
              <span
                v-if="survey.invitationAnswered"
                class="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-900"
              >
                {{ t("surveys.badges.answered") }}
              </span>
              <span
                v-else-if="survey.canAnswer"
                class="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-900"
              >
                {{ t("surveys.badges.pending") }}
              </span>
              <span
                v-if="survey.invitationLpItemId > 0"
                class="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-900"
              >
                {{ t("surveys.badges.learningPath") }}
              </span>
              <span
                v-if="survey.questionCount !== null"
                class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"
              >
                {{ t("surveys.questionCount", { count: survey.questionCount }) }}
              </span>
            </div>

            <p v-if="survey.availableUntil" class="mt-3 text-xs text-slate-500">
              {{
                t("surveys.availableUntil", {
                  date: formatDate(survey.availableUntil),
                })
              }}
            </p>
          </RouterLink>

          <article v-else class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 class="break-words font-semibold text-slate-900">
              {{ survey.title }}
            </h2>
            <p
              v-if="survey.subtitle"
              class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600"
            >
              {{ survey.subtitle }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span
                class="rounded-full px-2.5 py-1 font-semibold"
                :class="availabilityClass(survey.availabilityStatus)"
              >
                {{ availabilityLabel(survey.availabilityStatus) }}
              </span>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                {{ survey.surveyTypeLabel }}
              </span>
            </div>
            <p class="mt-3 text-sm text-amber-800">
              {{ unavailableLabel(survey) }}
            </p>
          </article>
        </template>
      </div>

      <EmptyState
        v-else
        :title="t('surveys.emptyTitle')"
        :description="t('surveys.emptyDescription')"
      />
    </template>
  </div>
</template>
