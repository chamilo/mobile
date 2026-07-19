<script setup lang="ts">
import { computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { formatAgendaDate, type AgendaEventPeriod } from "@/domain/agenda/presentation"
import type { AgendaEvent } from "@/domain/agenda/types"
import { sanitizeAnnouncementHtml } from "@/domain/announcements/sanitizeAnnouncementHtml"
import {
  buildCourseRoute,
  parseCourseRouteContext,
  CourseRouteContextError,
} from "@/domain/courses/routeContext"
import { useCampusStore } from "@/stores/campus"
import { useAgendaStore } from "@/stores/agenda"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t, locale } = useI18n()
const campusStore = useCampusStore()
const store = useAgendaStore()
const { status, snapshot, errorCode, groups } = storeToRefs(store)

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const errorDescription = computed(() => t(`agenda.errors.${errorCode.value ?? "server"}`))

const timeZone = computed(() => Intl.DateTimeFormat().resolvedOptions().timeZone)

const sections = computed(() =>
  (["current", "upcoming", "past"] as AgendaEventPeriod[])
    .map((period) => ({
      period,
      items: groups.value[period],
    }))
    .filter((section) => section.items.length > 0),
)

function dateLabel(event: AgendaEvent): string {
  const start = formatAgendaDate(event.startDate, locale.value, timeZone.value, event.allDay)
  const end = formatAgendaDate(event.endDate, locale.value, timeZone.value, event.allDay)

  return start === end ? start : `${start} – ${end}`
}

function sanitizedContent(content: string): string {
  return sanitizeAnnouncementHtml(
    content,
    campusStore.selectedCampus?.baseUrl ?? "https://invalid.local",
  )
}

async function load(): Promise<void> {
  if (context.value) await store.load(context.value)
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
      {{ t("agenda.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("agenda.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("agenda.title") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t("agenda.description") }}
      </p>
    </section>

    <LoadingState v-if="status === 'loading' || status === 'idle'" :label="t('agenda.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :title="t('agenda.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="snapshot">
      <section v-for="section in sections" :key="section.period" class="space-y-3">
        <h2 class="px-1 text-base font-semibold text-slate-900">
          {{ t(`agenda.sections.${section.period}`) }}
        </h2>

        <article
          v-for="event in section.items"
          :key="event.id"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start gap-3">
            <span
              class="mt-1 size-3 shrink-0 rounded-full"
              :style="{ backgroundColor: event.color || '#458B00' }"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <h3 class="break-words font-semibold text-slate-900">
                  {{ event.title }}
                </h3>
                <span
                  v-if="event.allDay"
                  class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {{ t("agenda.allDay") }}
                </span>
              </div>

              <p class="mt-2 text-sm font-medium text-chamilo-700">
                {{ dateLabel(event) }}
              </p>

              <p v-if="event.room" class="mt-2 text-sm text-slate-600">
                <i class="pi pi-map-marker mr-1" aria-hidden="true" />
                {{ event.room.title }}
                <span v-if="event.room.branchTitle"> · {{ event.room.branchTitle }} </span>
              </p>

              <!-- Content is sanitized by sanitizeAnnouncementHtml before rendering. -->
              <!-- eslint-disable vue/no-v-html -->
              <div
                v-if="event.content"
                class="agenda-content mt-3 break-words text-sm leading-6 text-slate-700"
                v-html="sanitizedContent(event.content)"
              />
              <!-- eslint-enable vue/no-v-html -->
            </div>
          </div>
        </article>
      </section>

      <EmptyState
        v-if="snapshot.totalItems === 0"
        :title="t('agenda.emptyTitle')"
        :description="t('agenda.emptyDescription')"
      />
    </template>
  </div>
</template>

<style scoped>
.agenda-content :deep(p),
.agenda-content :deep(ul),
.agenda-content :deep(ol) {
  margin-top: 0.5rem;
}

.agenda-content :deep(ul),
.agenda-content :deep(ol) {
  padding-left: 1.25rem;
}

.agenda-content :deep(ul) {
  list-style: disc;
}

.agenda-content :deep(ol) {
  list-style: decimal;
}

.agenda-content :deep(a) {
  color: rgb(3 105 161);
  font-weight: 600;
  text-decoration: underline;
}
</style>
