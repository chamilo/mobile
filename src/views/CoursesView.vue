<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import CourseCard from "@/components/courses/CourseCard.vue"
import SessionSection from "@/components/courses/SessionSection.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import type { SessionPeriod } from "@/domain/courses/types"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useCoursesStore } from "@/stores/courses"

type CourseTab = "sessions" | "direct"

const { locale, t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const coursesStore = useCoursesStore()
const { profile } = storeToRefs(authStore)
const { selectedCampus } = storeToRefs(campusStore)
const { overview, status, errorCode, isStale, isRefreshing, cacheSavedAt, hasContent } =
  storeToRefs(coursesStore)
const activeTab = ref<CourseTab>("sessions")
const activeSessionPeriod = ref<SessionPeriod>("current")

const errorDescription = computed(() =>
  errorCode.value ? t(`courses.errors.${errorCode.value}`) : t("courses.errors.server"),
)
const sessionCourseCount = computed(
  () =>
    overview.value.currentSessions.reduce((total, session) => total + session.courses.length, 0) +
    overview.value.upcomingSessions.reduce((total, session) => total + session.courses.length, 0) +
    overview.value.pastSessions.reduce((total, session) => total + session.courses.length, 0),
)
const sessionPeriods = computed(() => [
  {
    key: "current" as const,
    label: t("courses.sections.currentSessions"),
    sessions: overview.value.currentSessions,
  },
  {
    key: "upcoming" as const,
    label: t("courses.sections.upcomingSessions"),
    sessions: overview.value.upcomingSessions,
  },
  {
    key: "past" as const,
    label: t("courses.sections.pastSessions"),
    sessions: overview.value.pastSessions,
  },
])
const activeSessions = computed(
  () =>
    sessionPeriods.value.find((period) => period.key === activeSessionPeriod.value)?.sessions ?? [],
)
const activeSessionLabel = computed(
  () =>
    sessionPeriods.value.find((period) => period.key === activeSessionPeriod.value)?.label ?? "",
)

const cachedAtLabel = computed(() => {
  if (!cacheSavedAt.value) {
    return null
  }

  const date = new Date(cacheSavedAt.value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
})

function selectAvailableTabs(): void {
  if (sessionCourseCount.value === 0 && overview.value.directCourses.length > 0) {
    activeTab.value = "direct"
  }

  if (activeTab.value === "sessions") {
    const selectedPeriod = sessionPeriods.value.find(
      (period) => period.key === activeSessionPeriod.value && period.sessions.length > 0,
    )
    const firstAvailablePeriod = sessionPeriods.value.find((period) => period.sessions.length > 0)

    if (!selectedPeriod && firstAvailablePeriod) {
      activeSessionPeriod.value = firstAvailablePeriod.key
    }
  }
}

async function load(force = false): Promise<void> {
  await coursesStore.loadOverview(force)

  if (errorCode.value === "session_expired" || errorCode.value === "session_required") {
    const campusId = selectedCampus.value?.id

    if (campusId) {
      await authStore.clearCampusSession(campusId)
    }

    await router.replace({ name: "login", query: { redirect: "/courses" } })
    return
  }

  selectAvailableTabs()
}

onMounted(() => load())
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm text-slate-500">{{ t("courses.signedInAs") }}</p>
          <p class="mt-1 truncate font-semibold text-slate-900">{{ profile?.fullName }}</p>
          <p class="truncate text-sm text-slate-600">{{ selectedCampus?.displayName }}</p>
        </div>

        <button
          type="button"
          class="flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-slate-200 text-chamilo-700 transition hover:bg-chamilo-50 disabled:opacity-60"
          :aria-label="t('courses.refresh')"
          :disabled="status === 'loading' || isRefreshing"
          @click="load(true)"
        >
          <i class="pi pi-refresh" :class="isRefreshing ? 'pi-spin' : ''" aria-hidden="true" />
        </button>
      </div>
    </section>

    <div
      v-if="isStale"
      class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <div class="flex items-start gap-3">
        <i class="pi pi-history mt-0.5" aria-hidden="true" />
        <div class="flex-1">
          <p class="font-semibold">{{ t("courses.savedDataTitle") }}</p>
          <p class="mt-1 leading-5">
            {{
              cachedAtLabel
                ? t("courses.savedDataAt", { date: cachedAtLabel })
                : t("courses.savedDataDescription")
            }}
          </p>
          <p v-if="errorCode" class="mt-1 leading-5">{{ errorDescription }}</p>
        </div>
      </div>
    </div>

    <div
      v-else-if="errorCode === 'cache_failed' && status === 'ready'"
      class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
    >
      {{ errorDescription }}
    </div>

    <LoadingState v-if="status === 'loading'" :label="t('courses.loading')" />

    <ErrorState
      v-else-if="status === 'error'"
      :title="t('courses.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      :retrying="isRefreshing"
      @retry="load(true)"
    />

    <template v-else-if="status === 'ready'">
      <section v-if="hasContent" class="space-y-4">
        <div
          class="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1"
          role="tablist"
          :aria-label="t('courses.tabs.label')"
        >
          <button
            type="button"
            role="tab"
            class="min-h-touch rounded-xl px-3 py-2 text-sm font-semibold transition"
            :class="
              activeTab === 'sessions'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            "
            :aria-selected="activeTab === 'sessions'"
            @click="activeTab = 'sessions'"
          >
            {{ t("courses.tabs.sessionCourses") }}
            <span class="ml-1 text-xs text-slate-500">{{ sessionCourseCount }}</span>
          </button>
          <button
            type="button"
            role="tab"
            class="min-h-touch rounded-xl px-3 py-2 text-sm font-semibold transition"
            :class="
              activeTab === 'direct'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            "
            :aria-selected="activeTab === 'direct'"
            @click="activeTab = 'direct'"
          >
            {{ t("courses.tabs.directCourses") }}
            <span class="ml-1 text-xs text-slate-500">{{ overview.directCourses.length }}</span>
          </button>
        </div>

        <div v-if="activeTab === 'sessions'" class="space-y-4" role="tabpanel">
          <div
            class="flex gap-2 overflow-x-auto pb-1"
            :aria-label="t('courses.tabs.sessionPeriods')"
          >
            <button
              v-for="period in sessionPeriods"
              :key="period.key"
              type="button"
              class="min-h-touch shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition"
              :class="
                activeSessionPeriod === period.key
                  ? 'border-chamilo-700 bg-chamilo-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700'
              "
              @click="activeSessionPeriod = period.key"
            >
              {{ period.label }}
              <span class="ml-1 opacity-75">{{ period.sessions.length }}</span>
            </button>
          </div>

          <SessionSection
            :title="activeSessionLabel"
            :sessions="activeSessions"
            :campus-base-url="selectedCampus?.baseUrl ?? null"
          />

          <EmptyState
            v-if="activeSessions.length === 0"
            :title="t('courses.emptySessionPeriodTitle')"
            :description="t('courses.emptySessionPeriodDescription')"
          />
        </div>

        <section v-else class="space-y-3" role="tabpanel">
          <div v-if="overview.directCourses.length" class="space-y-4">
            <CourseCard
              v-for="enrollment in overview.directCourses"
              :key="enrollment.key"
              :enrollment="enrollment"
              :campus-base-url="selectedCampus?.baseUrl ?? null"
            />
          </div>

          <EmptyState
            v-else
            :title="t('courses.emptyDirectTitle')"
            :description="t('courses.emptyDirectDescription')"
          />
        </section>
      </section>

      <EmptyState
        v-if="!hasContent"
        :title="t('courses.emptyTitle')"
        :description="t('courses.emptyDescription')"
      />
    </template>
  </div>
</template>
