<script setup lang="ts">
import { computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import CourseCard from "@/components/courses/CourseCard.vue"
import SessionSection from "@/components/courses/SessionSection.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useCoursesStore } from "@/stores/courses"

const { locale, t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const coursesStore = useCoursesStore()
const { profile } = storeToRefs(authStore)
const { selectedCampus } = storeToRefs(campusStore)
const { overview, status, errorCode, isStale, isRefreshing, cacheSavedAt, hasContent } =
  storeToRefs(coursesStore)

const errorDescription = computed(() =>
  errorCode.value ? t(`courses.errors.${errorCode.value}`) : t("courses.errors.server"),
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

async function load(force = false): Promise<void> {
  await coursesStore.loadOverview(force)

  if (errorCode.value === "session_expired" || errorCode.value === "session_required") {
    const campusId = selectedCampus.value?.id

    if (campusId) {
      await authStore.clearCampusSession(campusId)
    }

    await router.replace({ name: "login", query: { redirect: "/courses" } })
  }
}

onMounted(() => load())
</script>

<template>
  <div class="space-y-6">
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
      <SessionSection
        :title="t('courses.sections.currentSessions')"
        :sessions="overview.currentSessions"
        :campus-base-url="selectedCampus?.baseUrl ?? null"
      />

      <section v-if="overview.directCourses.length > 0" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-slate-900">
            {{ t("courses.sections.directCourses") }}
          </h2>
          <span class="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {{ overview.directCourses.length }}
          </span>
        </div>

        <div class="space-y-4">
          <CourseCard
            v-for="enrollment in overview.directCourses"
            :key="enrollment.key"
            :enrollment="enrollment"
            :campus-base-url="selectedCampus?.baseUrl ?? null"
          />
        </div>
      </section>

      <SessionSection
        :title="t('courses.sections.upcomingSessions')"
        :sessions="overview.upcomingSessions"
        :campus-base-url="selectedCampus?.baseUrl ?? null"
      />

      <SessionSection
        :title="t('courses.sections.pastSessions')"
        :sessions="overview.pastSessions"
        :campus-base-url="selectedCampus?.baseUrl ?? null"
      />

      <EmptyState
        v-if="!hasContent"
        :title="t('courses.emptyTitle')"
        :description="t('courses.emptyDescription')"
      />
    </template>
  </div>
</template>
