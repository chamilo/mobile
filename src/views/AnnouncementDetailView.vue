<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import AnnouncementAttachments from "@/components/announcements/AnnouncementAttachments.vue"
import AnnouncementContent from "@/components/announcements/AnnouncementContent.vue"
import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { buildAnnouncementListRoute } from "@/domain/announcements/context"
import { CourseRouteContextError, parseCourseRouteContext } from "@/domain/courses/routeContext"
import { useAnnouncementsStore } from "@/stores/announcements"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

const props = defineProps<{
  courseId: string
  announcementId: string
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

const {
  detailStatus,
  detailErrorCode,
  selectedAnnouncement,
  isDetailStale,
  isDetailRefreshing,
  detailCacheSavedAt,
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

const parsedAnnouncementId = computed(() => {
  const value = Number(props.announcementId)
  return Number.isInteger(value) && value > 0 ? value : null
})

const hasValidRoute = computed(() => Boolean(context.value && parsedAnnouncementId.value))

const dateLabel = computed(() => {
  const value = selectedAnnouncement.value?.updatedAt ?? selectedAnnouncement.value?.createdAt

  if (!value) {
    return t("announcements.dateUnavailable")
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value))
})

const cachedAtLabel = computed(() => {
  if (!detailCacheSavedAt.value) {
    return null
  }

  const date = new Date(detailCacheSavedAt.value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
})

const errorDescription = computed(() =>
  detailErrorCode.value
    ? t(`announcements.errors.${detailErrorCode.value}`)
    : t("announcements.errors.server"),
)

async function handleSessionError(): Promise<void> {
  if (detailErrorCode.value !== "session_expired" && detailErrorCode.value !== "session_required") {
    return
  }

  const campusId = campusStore.selectedCampus?.id

  if (campusId) {
    await authStore.clearCampusSession(campusId)
  }

  await router.replace({ name: "login", query: { redirect: router.currentRoute.value.fullPath } })
}

async function load(force = false): Promise<void> {
  if (!context.value || !parsedAnnouncementId.value) {
    return
  }

  await announcementsStore.loadDetail(context.value, parsedAnnouncementId.value, force)
  await handleSessionError()
}

onMounted(() => load())
onBeforeUnmount(() => announcementsStore.clearDetail())
</script>

<template>
  <CourseUnavailableState v-if="!hasValidRoute || !context" kind="missing" />

  <div v-else class="space-y-5">
    <RouterLink
      :to="buildAnnouncementListRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700 focus:outline-none focus:ring-2 focus:ring-chamilo-600"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("announcements.backToList") }}
    </RouterLink>

    <div
      v-if="isDetailStale"
      class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <p class="font-semibold">{{ t("announcements.savedDetailTitle") }}</p>
      <p class="mt-1 leading-5">
        {{
          cachedAtLabel
            ? t("announcements.savedDataAt", { date: cachedAtLabel })
            : t("announcements.savedDataDescription")
        }}
      </p>
      <p v-if="detailErrorCode" class="mt-1 leading-5">{{ errorDescription }}</p>
    </div>

    <div
      v-else-if="detailErrorCode === 'cache_failed' && detailStatus === 'ready'"
      class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
    >
      {{ errorDescription }}
    </div>

    <LoadingState
      v-if="detailStatus === 'loading' || detailStatus === 'idle'"
      :label="t('announcements.loadingDetail')"
    />

    <ErrorState
      v-else-if="detailStatus === 'error'"
      :title="t('announcements.detailErrorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      :retrying="isDetailRefreshing"
      @retry="load(true)"
    />

    <article v-else-if="selectedAnnouncement" class="space-y-6 rounded-2xl bg-white p-5 shadow-sm">
      <header>
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{ t("announcements.readOnly") }}
        </p>
        <h1 class="mt-2 text-2xl font-semibold leading-8 text-slate-900">
          {{ selectedAnnouncement.title }}
        </h1>
        <div class="mt-3 space-y-1 text-sm text-slate-600">
          <p>
            {{ selectedAnnouncement.author?.fullName || t("announcements.unknownAuthor") }}
          </p>
          <p>{{ dateLabel }}</p>
        </div>
      </header>

      <AnnouncementContent
        :html="selectedAnnouncement.contentHtml"
        :campus-base-url="campusStore.selectedCampus?.baseUrl ?? 'https://invalid.local'"
      />

      <p v-if="!selectedAnnouncement.contentHtml.trim()" class="text-sm text-slate-600">
        {{ t("announcements.noContent") }}
      </p>

      <AnnouncementAttachments :attachments="selectedAnnouncement.attachments" />
    </article>
  </div>
</template>
