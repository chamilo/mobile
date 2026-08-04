<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { resolveCourseHomeEntry } from "@/domain/courseHome/resolveCourseHome"
import type { CourseToolKey } from "@/domain/courseHome/types"
import {
  buildCourseRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import {
  OFFLINE_COURSE_PACK_TOOL_OPTIONS,
  type OfflineCoursePackCompatibility,
  type OfflineCoursePackToolKey,
} from "@/domain/offline/coursePackTypes"
import { useConnectivityStore } from "@/stores/connectivity"
import { useCoursesStore } from "@/stores/courses"
import { useCourseToolAvailabilityStore } from "@/stores/courseToolAvailability"
import { useOfflineCoursePacksStore } from "@/stores/offlineCoursePacks"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const connectivityStore = useConnectivityStore()
const coursesStore = useCoursesStore()
const toolAvailabilityStore = useCourseToolAvailabilityStore()
const packsStore = useOfflineCoursePacksStore()
const { progress, storage, errorCode, isBusy } = storeToRefs(packsStore)
const selectedTools = ref<OfflineCoursePackToolKey[]>([])
const initializedSelection = ref(false)
const prepareExerciseAttempts = ref(true)

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const entry = computed(() =>
  context.value ? resolveCourseHomeEntry(coursesStore.overview, context.value) : null,
)
const manifest = computed(() => (entry.value ? packsStore.manifestFor(entry.value) : null))
const availableToolSet = computed(() => new Set<CourseToolKey>(toolAvailabilityStore.tools))
const toolOptions = computed(() =>
  OFFLINE_COURSE_PACK_TOOL_OPTIONS.filter(
    ({ key }) => key === "course-home" || availableToolSet.value.has(key),
  ),
)
const selectedCount = computed(() => selectedTools.value.length)
const exercisesSelected = computed(() => selectedTools.value.includes("exercises"))
const progressPercent = computed(() => {
  if (progress.value.totalTools <= 0) return 0

  return Math.round((progress.value.completedTools / progress.value.totalTools) * 100)
})
const isPreparing = computed(() => progress.value.status === "preparing")
const isLoading = computed(
  () =>
    coursesStore.status === "loading" ||
    coursesStore.status === "idle" ||
    toolAvailabilityStore.status === "loading" ||
    packsStore.isLoading,
)
const hasBlockingError = computed(
  () =>
    (coursesStore.status === "error" && !coursesStore.hasContent) ||
    toolAvailabilityStore.status === "error",
)
const blockingError = computed(() => {
  if (toolAvailabilityStore.status === "error") {
    return t(`courseHome.toolErrors.${toolAvailabilityStore.errorCode ?? "server"}`)
  }

  return t(`courses.errors.${coursesStore.errorCode ?? "server"}`)
})

function formatBytes(value: number | null): string {
  if (value === null) return t("offlineCourse.unknown")
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`

  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return t("offlineCourse.never")

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function compatibilityLabel(compatibility: OfflineCoursePackCompatibility): string {
  return t(`offlineCourse.compatibility.${compatibility}`)
}

function compatibilityClass(compatibility: OfflineCoursePackCompatibility): string {
  switch (compatibility) {
    case "available_offline":
      return "bg-emerald-100 text-emerald-900"
    case "read_only_offline":
      return "bg-sky-100 text-sky-900"
    case "requires_online_start":
      return "bg-amber-100 text-amber-900"
    case "metadata_only":
      return "bg-slate-100 text-slate-700"
  }
}

function isSelected(key: OfflineCoursePackToolKey): boolean {
  return selectedTools.value.includes(key)
}

function toggleTool(key: OfflineCoursePackToolKey): void {
  if (isBusy.value) return

  selectedTools.value = isSelected(key)
    ? selectedTools.value.filter((candidate) => candidate !== key)
    : [...selectedTools.value, key]
}

function selectAll(): void {
  selectedTools.value = toolOptions.value.map(({ key }) => key)
}

function selectRecommended(): void {
  selectedTools.value = toolOptions.value
    .filter(({ selectedByDefault }) => selectedByDefault)
    .map(({ key }) => key)
}

async function load(force = false): Promise<void> {
  await coursesStore.loadOverview(force)

  if (entry.value) {
    await Promise.all([toolAvailabilityStore.load(entry.value, force), packsStore.refresh()])
  }
}

async function prepare(): Promise<void> {
  if (!entry.value) return

  if (exercisesSelected.value && prepareExerciseAttempts.value) {
    const confirmed = window.confirm(t("offlineCourse.exercisePreparationConfirm"))
    if (!confirmed) return
  }

  await packsStore.prepareCourse(
    entry.value,
    toolAvailabilityStore.tools,
    selectedTools.value,
    exercisesSelected.value && prepareExerciseAttempts.value,
  )
}

async function removeDownload(): Promise<void> {
  if (!manifest.value) return
  if (!window.confirm(t("offlineCourse.removeConfirm"))) return

  await packsStore.removeCourse(manifest.value)
}

watch(
  [toolOptions, manifest],
  () => {
    if (initializedSelection.value || toolOptions.value.length === 0) return

    const saved = manifest.value?.selectedTools.filter((key) =>
      toolOptions.value.some((option) => option.key === key),
    )
    selectedTools.value = saved?.length ? saved : toolOptions.value.map(({ key }) => key)
    initializedSelection.value = true
  },
  { immediate: true },
)

onMounted(() => void load())
</script>

<template>
  <LoadingState v-if="isLoading" :label="t('offlineCourse.loading')" />

  <ErrorState
    v-else-if="hasBlockingError"
    :title="t('offlineCourse.errorTitle')"
    :description="blockingError"
    :retry-label="t('actions.retry')"
    @retry="load(true)"
  />

  <CourseUnavailableState v-else-if="!context || !entry" kind="missing" />

  <div v-else class="space-y-5">
    <RouterLink
      :to="buildCourseRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("offlineCourse.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-5 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("offlineCourse.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("offlineCourse.title") }}
      </h1>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        {{ t("offlineCourse.description", { course: entry.course.title }) }}
      </p>
    </section>

    <section v-if="manifest" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {{ t(`offlineCourse.status.${manifest.status}`) }}
          </p>
          <h2 class="mt-1 text-lg font-semibold text-emerald-950">
            {{ manifest.courseTitle }}
          </h2>
        </div>
        <i class="pi pi-cloud-download text-2xl text-emerald-700" aria-hidden="true" />
      </div>

      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div class="rounded-xl bg-white/70 p-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-emerald-700">
            {{ t("offlineCourse.resources") }}
          </dt>
          <dd class="mt-1 text-lg font-semibold text-emerald-950">
            {{ manifest.resourceCount }}
          </dd>
        </div>
        <div class="rounded-xl bg-white/70 p-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-emerald-700">
            {{ t("offlineCourse.size") }}
          </dt>
          <dd class="mt-1 text-lg font-semibold text-emerald-950">
            {{ formatBytes(manifest.downloadedBytes) }}
          </dd>
        </div>
      </dl>
      <p class="mt-3 text-xs text-emerald-800">
        {{ t("offlineCourse.updatedAt", { date: formatDate(manifest.updatedAt) }) }}
      </p>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          class="min-h-touch rounded-xl bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="isBusy"
          @click="prepare"
        >
          {{ t("offlineCourse.update") }}
        </button>
        <button
          type="button"
          class="min-h-touch rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-800 disabled:opacity-50"
          :disabled="isBusy"
          @click="removeDownload"
        >
          {{ t("offlineCourse.remove") }}
        </button>
      </div>
      <RouterLink
        :to="buildCourseRoute(context)"
        class="mt-2 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 font-semibold text-emerald-900"
      >
        <i class="pi pi-wifi" aria-hidden="true" />
        {{ t("offlineCourse.testOffline") }}
      </RouterLink>
    </section>

    <section class="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="offline-selection-title">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="offline-selection-title" class="text-lg font-semibold text-slate-900">
            {{ t("offlineCourse.selectContent") }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ t("offlineCourse.selectContentDescription") }}
          </p>
        </div>
        <span class="text-chamilo-800 rounded-full bg-chamilo-50 px-3 py-1 text-xs font-semibold">
          {{ t("offlineCourse.selectedCount", { count: selectedCount }) }}
        </span>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="border-chamilo-300 text-chamilo-800 min-h-touch rounded-xl border px-3 text-sm font-semibold disabled:opacity-50"
          :disabled="isBusy"
          @click="selectAll"
        >
          {{ t("offlineCourse.selectAll") }}
        </button>
        <button
          type="button"
          class="min-h-touch rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
          :disabled="isBusy"
          @click="selectRecommended"
        >
          {{ t("offlineCourse.recommended") }}
        </button>
      </div>

      <div class="mt-4 space-y-2">
        <button
          v-for="option in toolOptions"
          :key="option.key"
          type="button"
          class="flex min-h-touch w-full items-center gap-3 rounded-xl border p-3 text-left transition"
          :class="
            isSelected(option.key)
              ? 'border-chamilo-400 bg-chamilo-50'
              : 'border-slate-200 bg-white'
          "
          :aria-pressed="isSelected(option.key)"
          :disabled="isBusy"
          @click="toggleTool(option.key)"
        >
          <span
            class="flex size-6 shrink-0 items-center justify-center rounded-md border"
            :class="
              isSelected(option.key)
                ? 'border-chamilo-700 bg-chamilo-700 text-white'
                : 'border-slate-300 text-transparent'
            "
          >
            <i class="pi pi-check text-xs" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-semibold text-slate-900">
              {{ t(`offlineCourse.tools.${option.key}`) }}
            </span>
            <span
              class="mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="compatibilityClass(option.compatibility)"
            >
              {{ compatibilityLabel(option.compatibility) }}
            </span>
          </span>
        </button>
      </div>

      <label
        v-if="exercisesSelected"
        class="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
      >
        <input
          v-model="prepareExerciseAttempts"
          type="checkbox"
          name="prepareExerciseAttempts"
          class="mt-1"
          :disabled="isBusy"
        />
        <span>
          <span class="block text-sm font-semibold text-amber-950">
            {{ t("offlineCourse.prepareExerciseAttempts") }}
          </span>
          <span class="mt-1 block text-xs leading-5 text-amber-900">
            {{ t("offlineCourse.prepareExerciseAttemptsDescription") }}
          </span>
        </span>
      </label>
    </section>

    <section v-if="isPreparing" class="rounded-2xl bg-white p-5 shadow-sm" aria-live="polite">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-900">
          {{ t("offlineCourse.preparing") }}
        </h2>
        <span class="text-sm font-semibold text-chamilo-700">{{ progressPercent }}%</span>
      </div>
      <div
        class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progressPercent"
      >
        <div
          class="h-full bg-chamilo-600 transition-[width]"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <p class="mt-3 text-sm font-semibold text-slate-800">
        {{ progress.currentTool ? t(`offlineCourse.tools.${progress.currentTool}`) : "" }}
      </p>
      <p class="mt-1 break-words text-xs text-slate-500">
        {{ progress.currentResource || t("offlineCourse.preparingContent") }}
      </p>
      <p class="mt-2 text-xs text-slate-500">
        {{
          t("offlineCourse.progressDetails", {
            completed: progress.completedTools,
            total: progress.totalTools,
            resources: progress.completedResources,
            size: formatBytes(progress.downloadedBytes),
          })
        }}
      </p>
      <button
        type="button"
        class="mt-4 min-h-touch w-full rounded-xl border border-amber-300 px-4 font-semibold text-amber-900"
        @click="packsStore.cancelPreparation"
      >
        {{ progress.cancelRequested ? t("offlineCourse.cancelling") : t("offlineCourse.cancel") }}
      </button>
    </section>

    <section v-else class="rounded-2xl bg-white p-5 shadow-sm">
      <button
        type="button"
        class="flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
        :disabled="selectedCount === 0 || isBusy || !connectivityStore.deviceOnline"
        @click="prepare"
      >
        <i class="pi pi-download" aria-hidden="true" />
        {{ manifest ? t("offlineCourse.updateSelected") : t("offlineCourse.makeAvailable") }}
      </button>
      <p v-if="!connectivityStore.deviceOnline" class="mt-3 text-sm text-amber-800" role="status">
        {{ t("offlineCourse.connectionRequired") }}
      </p>
    </section>

    <section
      v-if="manifest?.warnings.length || manifest?.failures.length"
      class="rounded-2xl border border-amber-200 bg-amber-50 p-5"
    >
      <h2 class="font-semibold text-amber-950">{{ t("offlineCourse.reviewTitle") }}</h2>
      <ul class="mt-3 space-y-2 text-sm text-amber-900">
        <li
          v-for="warning in manifest.warnings"
          :key="`${warning.tool}:${warning.code}:${warning.message}`"
        >
          <strong>{{ t(`offlineCourse.tools.${warning.tool}`) }}:</strong> {{ warning.message }}
        </li>
        <li v-for="failure in manifest.failures" :key="`${failure.tool}:${failure.code}`">
          <strong>{{ t(`offlineCourse.tools.${failure.tool}`) }}:</strong> {{ failure.message }}
        </li>
      </ul>
    </section>

    <section class="rounded-2xl bg-slate-900 p-5 text-white">
      <h2 class="font-semibold">{{ t("offlineCourse.storageTitle") }}</h2>
      <p class="mt-2 text-sm text-slate-300">
        {{
          t("offlineCourse.storageUsage", {
            usage: formatBytes(storage.usage),
            quota: formatBytes(storage.quota),
          })
        }}
      </p>
    </section>

    <p v-if="errorCode" class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
      {{ t(`offlineCourse.errors.${errorCode}`) }}
    </p>
  </div>
</template>
