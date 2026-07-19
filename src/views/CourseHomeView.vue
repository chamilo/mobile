<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseHeader from "@/components/courseHome/CourseHeader.vue"
import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import ToolCard from "@/components/courseHome/ToolCard.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { resolveCourseHomeEntry } from "@/domain/courseHome/resolveCourseHome"
import { createCourseToolCapabilities } from "@/domain/courseHome/toolCapabilities"
import { CourseRouteContextError, parseCourseRouteContext } from "@/domain/courses/routeContext"
import { useCampusStore } from "@/stores/campus"
import { useCoursesStore } from "@/stores/courses"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const campusStore = useCampusStore()
const coursesStore = useCoursesStore()

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
const entry = computed(() =>
  context.value ? resolveCourseHomeEntry(coursesStore.overview, context.value) : null,
)
const capabilities = computed(() => (entry.value ? createCourseToolCapabilities(entry.value) : []))
const isLoading = computed(
  () =>
    coursesStore.status === "loading" || (coursesStore.status === "idle" && Boolean(context.value)),
)
const unavailableKind = computed<"denied" | "closed" | null>(() => {
  if (!entry.value || entry.value.accessState === "available") {
    return null
  }

  return entry.value.accessState
})
const hasBlockingError = computed(() => coursesStore.status === "error" && !coursesStore.hasContent)

async function loadCourseContext(force = false): Promise<void> {
  await coursesStore.loadOverview(force)
}

onMounted(() => {
  if (context.value && (coursesStore.status === "idle" || coursesStore.status === "error")) {
    void loadCourseContext()
  }
})
</script>

<template>
  <LoadingState v-if="isLoading" :label="t('courseHome.loading')" />

  <ErrorState
    v-else-if="hasBlockingError"
    :title="t('courseHome.errorTitle')"
    :description="t(`courses.errors.${coursesStore.errorCode ?? 'server'}`)"
    :retry-label="t('actions.retry')"
    :retrying="coursesStore.isRefreshing"
    @retry="loadCourseContext(true)"
  />

  <CourseUnavailableState v-else-if="!context || !entry" kind="missing" />

  <CourseUnavailableState v-else-if="unavailableKind" :kind="unavailableKind" />

  <div v-else class="space-y-6">
    <CourseHeader :entry="entry" :campus-base-url="campusStore.selectedCampus?.baseUrl ?? null" />

    <section aria-labelledby="course-tools-title">
      <div class="mb-3 flex items-end justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
            {{ t("courseHome.toolsEyebrow") }}
          </p>
          <h2 id="course-tools-title" class="mt-1 text-lg font-semibold text-slate-900">
            {{ t("courseHome.toolsTitle") }}
          </h2>
        </div>
        <span class="text-xs text-slate-500">
          {{ t("courseHome.toolCount", { count: capabilities.length }) }}
        </span>
      </div>

      <div class="space-y-3">
        <ToolCard
          v-for="capability in capabilities"
          :key="capability.toolKey"
          :capability="capability"
        />
      </div>

      <p class="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        {{ t("courseHome.verifiedToolsNotice") }}
      </p>
    </section>
  </div>
</template>
