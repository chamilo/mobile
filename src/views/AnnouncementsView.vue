<script setup lang="ts">
import { computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import AnnouncementCard from "@/components/announcements/AnnouncementCard.vue"
import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { buildAnnouncementDetailRoute } from "@/domain/announcements/context"
import { resolveCourseHomeEntry } from "@/domain/courseHome/resolveCourseHome"
import {
  CourseRouteContextError,
  buildCourseRoute,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { useAnnouncementsStore } from "@/stores/announcements"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useCoursesStore } from "@/stores/courses"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { locale, t } = useI18n()
const router = useRouter()
const announcementsStore = useAnnouncementsStore()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const coursesStore = useCoursesStore()

const {
  listStatus,
  listErrorCode,
  items,
  totalItems,
  isListStale,
  isListRefreshing,
  listCacheSavedAt,
} = storeToRefs(announcementsStore)

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) {
      return null
    }

    throw error
  }
})

const courseEntry = computed(() =>
  context.value ? resolveCourseHomeEntry(coursesStore.overview, context.value) : null,
)

const errorDescription = computed(() =>
  listErrorCode.value
    ? t(`announcements.errors.${listErrorCode.value}`)
    : t("announcements.errors.server"),
)

const cachedAtLabel = computed(() => {
  if (!listCacheSavedAt.value) {
    return null
  }

  const date = new Date(listCacheSavedAt.value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
})

async function handleSessionError(): Promise<void> {
  if (listErrorCode.value !== "session_expired" && listErrorCode.value !== "session_required") {
    return
  }

  const campusId = campusStore.selectedCampus?.id

  if (campusId) {
    await authStore.clearCampusSession(campusId)
  }

  await router.replace({ name: "login", query: { redirect: router.currentRoute.value.fullPath } })
}

async function load(force = false): Promise<void> {
  if (!context.value) {
    return
  }

  await announcementsStore.loadList(context.value, force)
  await handleSessionError()
}

onMounted(() => load())
</script>

<template>
  <CourseUnavailableState v-if="!context" kind="missing" />

  <div v-else class="space-y-5">
    <RouterLink
      :to="buildCourseRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700 focus:outline-none focus:ring-2 focus:ring-chamilo-600"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("announcements.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
            {{ t("announcements.eyebrow") }}
          </p>
          <h1 class="mt-1 text-xl font-semibold text-slate-900">
            {{ t("announcements.title") }}
          </h1>
          <p v-if="courseEntry" class="mt-1 truncate text-sm text-slate-600">
            {{ courseEntry.course.title }}
          </p>
          <p class="mt-2 text-xs text-slate-500">
            {{ t("announcements.total", { count: totalItems }) }}
          </p>
        </div>

        <button
          type="button"
          class="flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-slate-200 text-chamilo-700 transition hover:bg-chamilo-50 disabled:opacity-60"
          :aria-label="t('announcements.refresh')"
          :disabled="listStatus === 'loading' || isListRefreshing"
          @click="load(true)"
        >
          <i class="pi pi-refresh" :class="isListRefreshing ? 'pi-spin' : ''" aria-hidden="true" />
        </button>
      </div>
    </section>

    <div
      v-if="isListStale"
      class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <p class="font-semibold">{{ t("announcements.savedDataTitle") }}</p>
      <p class="mt-1 leading-5">
        {{
          cachedAtLabel
            ? t("announcements.savedDataAt", { date: cachedAtLabel })
            : t("announcements.savedDataDescription")
        }}
      </p>
      <p v-if="listErrorCode" class="mt-1 leading-5">{{ errorDescription }}</p>
    </div>

    <div
      v-else-if="listErrorCode === 'cache_failed' && listStatus === 'ready'"
      class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
    >
      {{ errorDescription }}
    </div>

    <LoadingState
      v-if="listStatus === 'loading' || listStatus === 'idle'"
      :label="t('announcements.loading')"
    />

    <ErrorState
      v-else-if="listStatus === 'error'"
      :title="t('announcements.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      :retrying="isListRefreshing"
      @retry="load(true)"
    />

    <template v-else-if="listStatus === 'ready'">
      <div v-if="items.length" class="space-y-3">
        <AnnouncementCard
          v-for="announcement in items"
          :key="announcement.id"
          :announcement="announcement"
          :to="buildAnnouncementDetailRoute(context, announcement.id)"
        />
      </div>

      <EmptyState
        v-else
        :title="t('announcements.emptyTitle')"
        :description="t('announcements.emptyDescription')"
      />
    </template>
  </div>
</template>
