<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildCourseRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { useGradebookStore } from "@/stores/gradebook"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const store = useGradebookStore()

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const errorDescription = computed(() => t(`gradebook.errors.${store.state.errorCode ?? "server"}`))

const progressPercentage = computed(() => {
  const percentage = store.state.data?.summary.percentage ?? 0
  return Math.max(0, Math.min(100, percentage))
})

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

async function load(): Promise<void> {
  if (context.value) {
    await store.load(context.value)
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
      {{ t("gradebook.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("gradebook.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("gradebook.title") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t("gradebook.description") }}
      </p>
    </section>

    <div class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900" role="status">
      {{ t("gradebook.readOnlyNotice") }}
    </div>

    <LoadingState
      v-if="store.state.status === 'loading' || store.state.status === 'idle'"
      :label="t('gradebook.loading')"
    />

    <ErrorState
      v-else-if="store.state.status === 'error'"
      :title="t('gradebook.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.state.data">
      <section
        v-if="store.state.data.summary.hasResult"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <p class="text-sm font-medium text-slate-600">
          {{ t("gradebook.summary.currentResult") }}
        </p>

        <div class="mt-2 flex flex-wrap items-end justify-between gap-3">
          <p class="text-3xl font-semibold text-slate-900">
            {{ formatNumber(store.state.data.summary.score) }}
            <span class="text-lg font-medium text-slate-500">
              / {{ formatNumber(store.state.data.summary.maximumScore) }}
            </span>
          </p>

          <p class="text-xl font-semibold text-chamilo-700">
            {{ formatNumber(store.state.data.summary.percentage) }}%
          </p>
        </div>

        <div
          class="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          :aria-label="t('gradebook.summary.percentage')"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="progressPercentage"
        >
          <div
            class="h-full rounded-full bg-chamilo-600 transition-all"
            :style="{ width: `${progressPercentage}%` }"
          />
        </div>

        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex flex-wrap justify-between gap-2">
            <dt class="font-medium text-slate-600">
              {{ t("gradebook.summary.percentage") }}
            </dt>
            <dd class="font-semibold text-slate-900">
              {{ formatNumber(store.state.data.summary.percentage) }}%
            </dd>
          </div>

          <div
            v-if="store.state.data.summary.minimumPercentage > 0"
            class="flex flex-wrap justify-between gap-2"
          >
            <dt class="font-medium text-slate-600">
              {{ t("gradebook.summary.minimum") }}
            </dt>
            <dd class="font-semibold text-slate-900">
              {{ formatNumber(store.state.data.summary.minimumPercentage) }}%
            </dd>
          </div>
        </dl>

        <div v-if="store.state.data.summary.thresholdMet !== null" class="mt-4">
          <span
            v-if="store.state.data.summary.thresholdMet"
            class="inline-flex min-h-touch items-center rounded-full bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900"
          >
            <i class="pi pi-check-circle mr-2" aria-hidden="true" />
            {{ t("gradebook.summary.thresholdMet") }}
          </span>

          <span
            v-else
            class="inline-flex min-h-touch items-center rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900"
          >
            <i class="pi pi-info-circle mr-2" aria-hidden="true" />
            {{ t("gradebook.summary.thresholdNotMet") }}
          </span>
        </div>
      </section>

      <EmptyState
        v-else
        :title="t('gradebook.emptyTitle')"
        :description="t('gradebook.emptyDescription')"
      />

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            {{ t("gradebook.certificates.title") }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ t("gradebook.certificates.description") }}
          </p>
        </div>

        <div v-if="store.state.data.certificates.length" class="space-y-3">
          <article
            v-for="certificate in store.state.data.certificates"
            :key="certificate.id"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
              >
                <i class="pi pi-verified" aria-hidden="true" />
              </div>

              <div class="min-w-0 flex-1">
                <h3 class="break-words font-semibold text-slate-900">
                  {{ certificate.title }}
                </h3>

                <p v-if="certificate.issuedAt" class="mt-1 text-sm text-slate-600">
                  {{
                    t("gradebook.certificates.issued", {
                      date: formatDate(certificate.issuedAt),
                    })
                  }}
                </p>

                <p class="mt-2 text-xs text-slate-500">
                  {{
                    certificate.downloadAvailable
                      ? t("gradebook.certificates.downloadAvailable")
                      : t("gradebook.certificates.recordOnly")
                  }}
                </p>
              </div>
            </div>
          </article>

          <p class="text-xs leading-5 text-slate-500">
            {{ t("gradebook.certificates.downloadNotice") }}
          </p>
        </div>

        <div
          v-else
          class="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600"
        >
          {{ t("gradebook.certificates.empty") }}
        </div>
      </section>
    </template>
  </div>
</template>
