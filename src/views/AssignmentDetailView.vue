<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import type { AssignmentAvailabilityStatus } from "@/domain/assignments/types"
import {
  buildAssignmentsRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { useAssignmentsStore } from "@/stores/assignments"

const props = defineProps<{
  courseId: string
  assignmentId: string
  assignmentTitle: string | null
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t, d } = useI18n()
const store = useAssignmentsStore()

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const parsedAssignmentId = computed(() => {
  const value = Number(props.assignmentId)
  return Number.isInteger(value) && value > 0 ? value : null
})

const usableContext = computed(() => context.value && parsedAssignmentId.value !== null)

const errorDescription = computed(() =>
  t(`assignments.errors.${store.detail.errorCode ?? "server"}`),
)

function formatDate(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : d(date, "long")
}

function availabilityLabel(status: AssignmentAvailabilityStatus): string {
  return t(`assignments.availability.${status}`)
}

function availabilityClass(status: AssignmentAvailabilityStatus): string {
  if (status === "open") return "bg-emerald-100 text-emerald-900"
  if (status === "late") return "bg-amber-100 text-amber-900"
  if (status === "closed") return "bg-slate-200 text-slate-800"
  return "bg-sky-100 text-sky-900"
}

async function load(): Promise<void> {
  if (context.value && parsedAssignmentId.value !== null) {
    await store.loadAssignment(context.value, parsedAssignmentId.value)
  }
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!usableContext" kind="missing" />

  <div v-else-if="context && parsedAssignmentId !== null" class="space-y-5">
    <RouterLink
      :to="buildAssignmentsRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("assignments.backToAssignments") }}
    </RouterLink>

    <LoadingState
      v-if="store.detail.status === 'loading' || store.detail.status === 'idle'"
      :label="t('assignments.detail.loading')"
    />

    <ErrorState
      v-else-if="store.detail.status === 'error'"
      :title="t('assignments.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.detail.data">
      <section class="rounded-2xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{ t("assignments.detail.eyebrow") }}
        </p>
        <h1 class="mt-1 break-words text-xl font-semibold text-slate-900">
          {{
            store.detail.data.assignment.title ||
            props.assignmentTitle ||
            t("assignments.detail.title")
          }}
        </h1>
        <p
          v-if="store.detail.data.assignment.description"
          class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700"
        >
          {{ store.detail.data.assignment.description }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2 text-xs">
          <span
            class="rounded-full px-2.5 py-1 font-semibold"
            :class="availabilityClass(store.detail.data.assignment.availabilityStatus)"
          >
            {{ availabilityLabel(store.detail.data.assignment.availabilityStatus) }}
          </span>

          <span
            v-if="store.detail.data.assignment.maximumScore !== null"
            class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"
          >
            {{
              t("assignments.maximumScore", {
                score: store.detail.data.assignment.maximumScore,
              })
            }}
          </span>

          <span
            v-if="store.detail.data.assignment.textSubmissionAllowed"
            class="rounded-full bg-sky-100 px-2.5 py-1 text-sky-900"
          >
            {{ t("assignments.textAllowed") }}
          </span>
        </div>

        <dl class="mt-4 space-y-2 text-sm">
          <div
            v-if="store.detail.data.assignment.publishedAt"
            class="flex flex-wrap justify-between gap-2"
          >
            <dt class="font-medium text-slate-600">
              {{ t("assignments.detail.published") }}
            </dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.assignment.publishedAt) }}
            </dd>
          </div>
          <div
            v-if="store.detail.data.assignment.dueAt"
            class="flex flex-wrap justify-between gap-2"
          >
            <dt class="font-medium text-slate-600">
              {{ t("assignments.detail.due") }}
            </dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.assignment.dueAt) }}
            </dd>
          </div>
          <div
            v-if="store.detail.data.assignment.endsAt"
            class="flex flex-wrap justify-between gap-2"
          >
            <dt class="font-medium text-slate-600">
              {{ t("assignments.detail.finalDeadline") }}
            </dt>
            <dd class="text-right text-slate-800">
              {{ formatDate(store.detail.data.assignment.endsAt) }}
            </dd>
          </div>
        </dl>

        <p
          v-if="store.detail.data.assignment.allowedExtensions.length"
          class="mt-4 text-xs text-slate-500"
        >
          {{
            t("assignments.allowedExtensions", {
              extensions: store.detail.data.assignment.allowedExtensions.join(", "),
            })
          }}
        </p>
      </section>

      <div
        class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"
        role="status"
      >
        {{ t("assignments.detail.readOnlyNotice") }}
      </div>

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            {{ t("assignments.detail.mySubmissions") }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ t("assignments.detail.mySubmissionsDescription") }}
          </p>
        </div>

        <div v-if="store.detail.data.submissions.length" class="space-y-3">
          <article
            v-for="submission in store.detail.data.submissions"
            :key="submission.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="break-words font-semibold text-slate-900">
                  {{ submission.title }}
                </h3>
                <p v-if="submission.sentAt" class="mt-1 text-xs text-slate-500">
                  {{
                    t("assignments.detail.submitted", {
                      date: formatDate(submission.sentAt),
                    })
                  }}
                </p>
              </div>

              <span
                v-if="submission.score !== null"
                class="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-900"
              >
                <template v-if="submission.maximumScore !== null">
                  {{ submission.score }} / {{ submission.maximumScore }}
                </template>
                <template v-else>
                  {{ submission.score }}
                </template>
              </span>
            </div>

            <p
              v-if="submission.description"
              class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700"
            >
              {{ submission.description }}
            </p>

            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span
                v-if="submission.hasFile"
                class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"
              >
                {{ t("assignments.detail.fileSubmitted") }}
              </span>
              <span
                v-if="submission.correctionTitle"
                class="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900"
              >
                {{ t("assignments.detail.correctionAvailable") }}
              </span>
            </div>

            <p v-if="submission.correctionTitle" class="mt-3 break-words text-sm text-slate-700">
              {{
                t("assignments.detail.correction", {
                  title: submission.correctionTitle,
                })
              }}
            </p>

            <div v-if="submission.comments.length" class="mt-4 border-t border-slate-100 pt-4">
              <h4 class="text-sm font-semibold text-slate-900">
                {{ t("assignments.detail.feedback") }}
              </h4>

              <div class="mt-3 space-y-3">
                <div
                  v-for="comment in submission.comments"
                  :key="comment.id"
                  class="rounded-xl bg-slate-50 p-3"
                >
                  <div class="flex flex-wrap justify-between gap-2">
                    <p class="text-sm font-semibold text-slate-800">
                      {{ comment.authorName }}
                    </p>
                    <p v-if="comment.sentAt" class="text-xs text-slate-500">
                      {{ formatDate(comment.sentAt) }}
                    </p>
                  </div>
                  <p
                    v-if="comment.text"
                    class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700"
                  >
                    {{ comment.text }}
                  </p>
                  <p v-if="comment.fileName" class="mt-2 break-words text-xs text-slate-500">
                    {{
                      t("assignments.detail.feedbackFile", {
                        file: comment.fileName,
                      })
                    }}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          :title="t('assignments.detail.emptySubmissionsTitle')"
          :description="t('assignments.detail.emptySubmissionsDescription')"
        />
      </section>
    </template>
  </div>
</template>
