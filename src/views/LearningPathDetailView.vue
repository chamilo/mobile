<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import LearningPathContentViewer from "@/components/learningPaths/LearningPathContentViewer.vue"
import LearningPathScormPlayer from "@/components/learningPaths/LearningPathScormPlayer.vue"
import LearningPathToc from "@/components/learningPaths/LearningPathToc.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildLearningPathsRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { isSupportedLearningPathItem } from "@/domain/learningPaths/contracts"
import type {
  LearningPathRuntimeItem,
  LearningPathScormCommitPayload,
} from "@/domain/learningPaths/types"
import { useLearningPathRuntimeStore } from "@/stores/learningPathRuntime"

const SYNC_INTERVAL_MS = 30_000

const props = defineProps<{
  courseId: string
  learningPathId: string
  learningPathTitle: string | null
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const store = useLearningPathRuntimeStore()
const scormPlayer = ref<InstanceType<typeof LearningPathScormPlayer> | null>(null)
let syncTimer: ReturnType<typeof setInterval> | null = null

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

const parsedLearningPathId = computed(() => {
  const value = Number(props.learningPathId)

  return Number.isInteger(value) && value > 0 ? value : null
})

const routeKey = computed(() =>
  [
    props.courseId,
    props.learningPathId,
    props.sessionId ?? "",
    props.membershipId ?? "",
    props.sessionCourseId ?? "",
    props.source ?? "",
  ].join(":"),
)

const errorDescription = computed(() => t(`learningPaths.errors.${store.errorCode ?? "server"}`))
const actionErrorDescription = computed(() =>
  t(`learningPaths.errors.${store.actionErrorCode ?? "server"}`),
)
const contentErrorDescription = computed(() =>
  t(`learningPaths.errors.${store.contentErrorCode ?? "server"}`),
)

const previousItem = computed(() =>
  store.runtime?.items.find(({ id }) => id === store.runtime?.previousItemId),
)
const nextItem = computed(() =>
  store.runtime?.items.find(({ id }) => id === store.runtime?.nextItemId),
)

function itemTypeLabel(itemType: string): string {
  return itemType.replace(/_/g, " ") || t("learningPaths.item")
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return hours > 0
    ? [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
    : [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
}

async function start(): Promise<void> {
  if (context.value && parsedLearningPathId.value) {
    store.reset()
    await store.start(context.value, parsedLearningPathId.value)
  }
}

async function selectItem(itemId: number): Promise<void> {
  if (context.value && parsedLearningPathId.value) {
    await scormPlayer.value?.flush("navigation")
    await store.activateItem(context.value, parsedLearningPathId.value, itemId)
  }
}

async function commitScorm(payload: LearningPathScormCommitPayload): Promise<void> {
  if (!context.value || !parsedLearningPathId.value || !store.runtime) {
    return
  }

  await store.commitScorm(
    context.value,
    parsedLearningPathId.value,
    store.runtime.currentItemId,
    store.runtime.scorm,
    store.runtime.actionToken,
    payload,
  )
}

async function handleScormNavigation(request: string): Promise<void> {
  if (request === "continue" && nextItem.value) {
    await selectItem(nextItem.value.id)
    return
  }
  if (request === "previous" && previousItem.value) {
    await selectItem(previousItem.value.id)
    return
  }

  if (["exit", "exitAll", "suspendAll", "abandon", "abandonAll"].includes(request)) {
    await scormPlayer.value?.flush("exit")
  }
}

async function sync(refresh = true): Promise<void> {
  if (context.value && parsedLearningPathId.value && store.status === "ready") {
    await store.sync(context.value, parsedLearningPathId.value, refresh)
  }
}

async function restart(): Promise<void> {
  if (
    context.value &&
    parsedLearningPathId.value &&
    window.confirm(t("learningPaths.restartConfirm"))
  ) {
    await scormPlayer.value?.flush("restart")
    await store.restart(context.value, parsedLearningPathId.value)
  }
}

function canNavigateTo(item: LearningPathRuntimeItem | undefined): item is LearningPathRuntimeItem {
  return Boolean(item && isSupportedLearningPathItem(item) && !store.isBusy)
}

function handleVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    void scormPlayer.value?.flush("visibility-hidden")
    void sync(false)
  }
}

function handlePageHide(): void {
  void scormPlayer.value?.flush("pagehide")
  void sync(false)
}

watch(routeKey, () => {
  void start()
})

onMounted(() => {
  void start()
  syncTimer = setInterval(() => {
    void sync(true)
  }, SYNC_INTERVAL_MS)
  document.addEventListener("visibilitychange", handleVisibilityChange)
  window.addEventListener("pagehide", handlePageHide)
})

onBeforeUnmount(() => {
  if (syncTimer) {
    clearInterval(syncTimer)
  }

  document.removeEventListener("visibilitychange", handleVisibilityChange)
  window.removeEventListener("pagehide", handlePageHide)
  void scormPlayer.value?.flush("unmount")
  void sync(false)
})
</script>

<template>
  <CourseUnavailableState v-if="!context || !parsedLearningPathId" kind="missing" />

  <div v-else class="space-y-4">
    <RouterLink
      :to="buildLearningPathsRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("learningPaths.backToList") }}
    </RouterLink>

    <LoadingState
      v-if="store.status === 'loading' || store.status === 'idle'"
      :label="t('learningPaths.detailLoading')"
    />

    <ErrorState
      v-else-if="store.status === 'error'"
      :title="t('learningPaths.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="start"
    />

    <template v-else-if="store.runtime">
      <section class="rounded-2xl bg-white p-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
              {{ t("learningPaths.detailEyebrow") }}
            </p>
            <h1 class="mt-1 break-words text-xl font-semibold text-slate-900">
              {{ store.runtime.title || learningPathTitle }}
            </h1>
          </div>

          <button
            v-if="store.runtime.canRestart"
            type="button"
            class="inline-flex min-h-touch shrink-0 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            :disabled="store.isBusy"
            @click="restart"
          >
            <i class="pi pi-refresh" aria-hidden="true" />
            {{ t("learningPaths.restart") }}
          </button>
        </div>

        <div class="mt-3 flex items-center gap-3">
          <div
            class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            :aria-label="t('learningPaths.progress')"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="store.runtime.progress"
          >
            <div
              class="h-full rounded-full bg-chamilo-600 transition-[width]"
              :style="{ width: `${store.runtime.progress}%` }"
            />
          </div>
          <span class="text-sm font-semibold text-slate-700"> {{ store.runtime.progress }}% </span>
        </div>

        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            {{
              t("learningPaths.completedItems", {
                completed: store.runtime.completedItems,
                total: store.runtime.totalItems,
              })
            }}
          </span>
          <span>{{
            t("learningPaths.timeSpent", { time: formatDuration(store.runtime.totalTime) })
          }}</span>
          <span v-if="store.runtime.currentAttempt > 0">
            {{ t("learningPaths.attempt", { attempt: store.runtime.currentAttempt }) }}
          </span>
        </div>
      </section>

      <div
        class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        role="status"
        aria-live="polite"
      >
        {{
          store.actionStatus === "syncing"
            ? t("learningPaths.syncing")
            : t("learningPaths.progressSaved")
        }}
      </div>

      <p
        v-if="store.actionErrorCode"
        class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        role="alert"
      >
        {{ actionErrorDescription }}
      </p>

      <section
        v-if="store.currentItem"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ t("learningPaths.currentItem") }}
        </p>
        <h2 class="mt-1 break-words font-semibold text-slate-900">
          {{ store.currentItem.title }}
        </h2>
        <p class="mt-1 text-xs capitalize text-slate-500">
          {{ itemTypeLabel(store.currentItem.itemType) }}
          ·
          {{ store.currentItem.status }}
        </p>

        <div
          v-if="store.actionStatus === 'opening'"
          class="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
          role="status"
        >
          {{ t("learningPaths.openingItem") }}
        </div>

        <LoadingState
          v-else-if="store.contentStatus === 'loading'"
          class="mt-4"
          :label="t('learningPaths.contentLoading')"
        />

        <LearningPathScormPlayer
          v-else-if="store.scormEntryUrl && store.contentStatus === 'ready' && store.runtime"
          ref="scormPlayer"
          :entry-url="store.scormEntryUrl"
          :runtime="store.runtime"
          :item="store.currentItem"
          :commit="commitScorm"
          @navigate="handleScormNavigation"
        />

        <LearningPathContentViewer
          v-else-if="store.contentBlob && store.contentStatus === 'ready'"
          class="mt-4"
          :blob="store.contentBlob"
          :item="store.currentItem"
          @open-external="store.openCurrentContent"
          @download="store.downloadCurrentContent"
        />

        <p
          v-else-if="!isSupportedLearningPathItem(store.currentItem)"
          class="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
        >
          {{ t("learningPaths.unsupportedItem") }}
        </p>

        <p
          v-if="store.scormSaving"
          class="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"
          role="status"
        >
          {{ t("learningPaths.scormSaving") }}
        </p>

        <p
          v-if="store.contentErrorCode"
          class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {{ contentErrorDescription }}
        </p>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            class="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 font-semibold text-slate-800 disabled:opacity-40"
            :disabled="!canNavigateTo(previousItem)"
            @click="previousItem && selectItem(previousItem.id)"
          >
            <i class="pi pi-arrow-left" aria-hidden="true" />
            {{ t("learningPaths.previous") }}
          </button>

          <button
            type="button"
            class="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-3 font-semibold text-white disabled:opacity-40"
            :disabled="!canNavigateTo(nextItem)"
            @click="nextItem && selectItem(nextItem.id)"
          >
            {{ t("learningPaths.next") }}
            <i class="pi pi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section v-if="!store.runtime.hideToc">
        <h2 class="mb-2 text-lg font-semibold text-slate-900">
          {{ t("learningPaths.contents") }}
        </h2>

        <LearningPathToc
          :items="store.runtime.items"
          :current-item-id="store.runtime.currentItemId"
          :busy="store.isBusy"
          :accordion="store.runtime.accordionToc"
          @select="selectItem"
        />
      </section>

      <p v-else class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        {{ t("learningPaths.tocHidden") }}
      </p>
    </template>
  </div>
</template>
