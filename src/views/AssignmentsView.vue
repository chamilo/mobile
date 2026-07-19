<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import type { AssignmentAvailabilityStatus, AssignmentSummary } from "@/domain/assignments/types"
import {
  buildAssignmentDetailRoute,
  buildCourseRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { useAssignmentsStore } from "@/stores/assignments"

const props = defineProps<{
  courseId: string
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

const errorDescription = computed(() => t(`assignments.errors.${store.list.errorCode ?? "server"}`))

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

function detailRoute(assignment: AssignmentSummary) {
  if (!context.value) return { name: "courses" }

  return buildAssignmentDetailRoute(context.value, assignment.id, assignment.title)
}

async function load(): Promise<void> {
  if (context.value) {
    await store.loadAssignments(context.value)
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
      {{ t("assignments.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("assignments.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("assignments.title") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t("assignments.description") }}
      </p>
    </section>

    <div class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900" role="status">
      {{ t("assignments.readOnlyNotice") }}
    </div>

    <LoadingState
      v-if="store.list.status === 'loading' || store.list.status === 'idle'"
      :label="t('assignments.loading')"
    />

    <ErrorState
      v-else-if="store.list.status === 'error'"
      :title="t('assignments.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.list.data">
      <div v-if="store.list.data.items.length" class="space-y-3">
        <RouterLink
          v-for="assignment in store.list.data.items"
          :key="assignment.id"
          :to="detailRoute(assignment)"
          class="hover:border-chamilo-300 block min-h-touch rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h2 class="break-words font-semibold text-slate-900">
                {{ assignment.title }}
              </h2>
              <p
                v-if="assignment.description"
                class="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600"
              >
                {{ assignment.description }}
              </p>
            </div>
            <i class="pi pi-chevron-right mt-1 text-slate-400" aria-hidden="true" />
          </div>

          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <span
              class="rounded-full px-2.5 py-1 font-semibold"
              :class="availabilityClass(assignment.availabilityStatus)"
            >
              {{ availabilityLabel(assignment.availabilityStatus) }}
            </span>

            <span
              v-if="assignment.dueAt"
              class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"
            >
              {{
                t("assignments.due", {
                  date: formatDate(assignment.dueAt),
                })
              }}
            </span>

            <span
              v-if="assignment.maximumScore !== null"
              class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"
            >
              {{
                t("assignments.maximumScore", {
                  score: assignment.maximumScore,
                })
              }}
            </span>

            <span
              v-if="assignment.textSubmissionAllowed"
              class="rounded-full bg-sky-100 px-2.5 py-1 text-sky-900"
            >
              {{ t("assignments.textAllowed") }}
            </span>
          </div>

          <p v-if="assignment.allowedExtensions.length" class="mt-3 text-xs text-slate-500">
            {{
              t("assignments.allowedExtensions", {
                extensions: assignment.allowedExtensions.join(", "),
              })
            }}
          </p>
        </RouterLink>
      </div>

      <EmptyState
        v-else
        :title="t('assignments.emptyTitle')"
        :description="t('assignments.emptyDescription')"
      />
    </template>
  </div>
</template>
