<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseHeader from "@/components/courseHome/CourseHeader.vue"
import CourseOfflineCard from "@/components/courseHome/CourseOfflineCard.vue"
import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import ToolCard from "@/components/courseHome/ToolCard.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { resolveCourseHomeEntry } from "@/domain/courseHome/resolveCourseHome"
import { createCourseToolCapabilities } from "@/domain/courseHome/toolCapabilities"
import { CourseRouteContextError, parseCourseRouteContext } from "@/domain/courses/routeContext"
import { useCampusStore } from "@/stores/campus"
import { useCoursesStore } from "@/stores/courses"
import { useCourseToolAvailabilityStore } from "@/stores/courseToolAvailability"

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
const toolAvailabilityStore = useCourseToolAvailabilityStore()

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

const capabilities = computed(() =>
  entry.value ? createCourseToolCapabilities(entry.value, toolAvailabilityStore.tools) : [],
)

const isLoading = computed(
  () =>
    coursesStore.status === "loading" ||
    (coursesStore.status === "idle" && Boolean(context.value)) ||
    toolAvailabilityStore.status === "loading",
)

const unavailableKind = computed<"denied" | "closed" | null>(() => {
  if (!entry.value || entry.value.accessState === "available") {
    return null
  }

  return entry.value.accessState
})

const hasCourseError = computed(() => coursesStore.status === "error" && !coursesStore.hasContent)
const hasToolError = computed(() => toolAvailabilityStore.status === "error")
const hasBlockingError = computed(() => hasCourseError.value || hasToolError.value)

const blockingErrorDescription = computed(() => {
  if (hasToolError.value) {
    return t(`courseHome.toolErrors.${toolAvailabilityStore.errorCode ?? "server"}`)
  }

  return t(`courses.errors.${coursesStore.errorCode ?? "server"}`)
})

async function loadCourseContext(force = false): Promise<void> {
  await coursesStore.loadOverview(force)

  if (entry.value) {
    await toolAvailabilityStore.load(entry.value, force)
  }
}

onMounted(() => {
  if (context.value) {
    void loadCourseContext()
  }
})
</script>

<template>
  <LoadingState v-if="isLoading" :label="t('courseHome.loading')" />

  <ErrorState
    v-else-if="hasBlockingError"
    :title="t('courseHome.errorTitle')"
    :description="blockingErrorDescription"
    :retry-label="t('actions.retry')"
    :retrying="coursesStore.isRefreshing"
    @retry="loadCourseContext(true)"
  />

  <CourseUnavailableState v-else-if="!context || !entry" kind="missing" />

  <CourseUnavailableState v-else-if="unavailableKind" :kind="unavailableKind" />

  <div v-else class="space-y-5">
    <CourseHeader :entry="entry" :campus-base-url="campusStore.selectedCampus?.baseUrl ?? null" />

    <CourseOfflineCard :entry="entry" />

    <section aria-labelledby="course-tools-title">
      <div class="mb-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{ t("courseHome.toolsEyebrow") }}
        </p>
        <h2 id="course-tools-title" class="mt-1 text-lg font-semibold text-slate-900">
          {{ t("courseHome.toolsTitle") }}
        </h2>
      </div>

      <div v-if="capabilities.length" class="space-y-2">
        <ToolCard
          v-for="capability in capabilities"
          :key="capability.toolKey"
          :capability="capability"
        />
      </div>

      <EmptyState
        v-else
        :title="t('courseHome.emptyToolsTitle')"
        :description="t('courseHome.emptyToolsDescription')"
      />
    </section>
  </div>
</template>
