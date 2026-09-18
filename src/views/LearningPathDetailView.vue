<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import LearningPathContentViewer from "@/components/learningPaths/LearningPathContentViewer.vue"
import LearningPathScormPlayer from "@/components/learningPaths/LearningPathScormPlayer.vue"
import LearningPathToc from "@/components/learningPaths/LearningPathToc.vue"
import AssignmentDetailView from "@/views/AssignmentDetailView.vue"
import ExercisePlayerView from "@/views/ExercisePlayerView.vue"
import ExerciseResultView from "@/views/ExerciseResultView.vue"
import ForumThreadView from "@/views/ForumThreadView.vue"
import ForumThreadsView from "@/views/ForumThreadsView.vue"
import SurveyDetailView from "@/views/SurveyDetailView.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildAssignmentDetailRoute,
  buildCourseLinksRoute,
  buildDocumentsRoute,
  buildExercisePlayerRoute,
  buildForumThreadRoute,
  buildForumsRoute,
  buildForumThreadsRoute,
  buildLearningPathsRoute,
  buildSurveyDetailRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { parseLearningPathAssignmentContentUrl } from "@/domain/assignments/learningPathContext"
import { parseLearningPathQuizContentUrl } from "@/domain/exercises/learningPathContext"
import {
  parseLearningPathForumContentUrl,
  parseLearningPathThreadContentUrl,
} from "@/domain/forums/learningPathContext"
import { parseLearningPathSurveyContentUrl } from "@/domain/surveys/learningPathContext"
import {
  isAssignmentLearningPathItem,
  isForumLearningPathItem,
  isQuizLearningPathItem,
  isSupportedLearningPathItem,
  isSurveyLearningPathItem,
  isThreadLearningPathItem,
} from "@/domain/learningPaths/contracts"
import type { CStudioChamiloResource } from "@/domain/learningPaths/cstudioResource"
import { resolveScormTargetedNavigationItem } from "@/domain/learningPaths/scormNavigation"
import { shouldRefreshScormProgress } from "@/domain/learningPaths/scormProgressRefresh"
import type {
  LearningPathRuntimeItem,
  LearningPathScormCommitPayload,
} from "@/domain/learningPaths/types"
import { useLearningPathRuntimeStore } from "@/stores/learningPathRuntime"
import { useLocaleStore } from "@/stores/locale"

const SYNC_INTERVAL_MS = 30_000
const SCORM_PROGRESS_REFRESH_DELAY_MS = 1_200

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
const router = useRouter()
const store = useLearningPathRuntimeStore()
const localeStore = useLocaleStore()
const scormPlayer = ref<InstanceType<typeof LearningPathScormPlayer> | null>(null)
const playerSection = ref<HTMLElement | null>(null)
const pendingItemId = ref<number | null>(null)
const embeddedExerciseAttemptId = ref<number | null>(null)
const embeddedForumThread = ref<{ id: number; title: string } | null>(null)
let syncTimer: ReturnType<typeof setInterval> | null = null
let scormProgressRefreshTimer: ReturnType<typeof setTimeout> | null = null

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
const currentItemPosition = computed(() => {
  const runtime = store.runtime
  if (!runtime) return null

  const contentItems = runtime.items.filter((item) => !item.isSection)
  const index = contentItems.findIndex((item) => item.id === runtime.currentItemId)

  return index >= 0 ? { current: index + 1, total: contentItems.length } : null
})
const pendingItem = computed(() =>
  pendingItemId.value
    ? (store.runtime?.items.find((item) => item.id === pendingItemId.value) ?? null)
    : null,
)
const displayedItem = computed(() => pendingItem.value ?? store.currentItem)
const currentItem = computed(() => store.currentItem)
const quizLaunch = computed(() => {
  const runtime = store.runtime
  const item = store.currentItem

  if (!runtime || !item || !isQuizLearningPathItem(item)) return null

  return parseLearningPathQuizContentUrl(
    runtime.contentUrl,
    runtime.lpId,
    item.id,
    runtime.title || props.learningPathTitle || "",
  )
})

const surveyLaunch = computed(() => {
  const runtime = store.runtime
  const item = store.currentItem

  if (!runtime || !item || !isSurveyLearningPathItem(item)) return null

  return parseLearningPathSurveyContentUrl(
    runtime.contentUrl,
    runtime.lpId,
    item.id,
    runtime.title || props.learningPathTitle || "",
  )
})

const assignmentLaunch = computed(() => {
  const runtime = store.runtime
  const item = store.currentItem
  const activeContext = context.value

  if (!runtime || !item || !activeContext || !isAssignmentLearningPathItem(item)) return null

  return parseLearningPathAssignmentContentUrl(
    runtime.contentUrl,
    runtime.lpId,
    item.id,
    activeContext.courseId,
    activeContext.sessionId,
    runtime.title || props.learningPathTitle || "",
  )
})

const forumLaunch = computed(() => {
  const runtime = store.runtime
  const item = store.currentItem
  const activeContext = context.value

  if (!runtime || !item || !activeContext || !isForumLearningPathItem(item)) return null

  return parseLearningPathForumContentUrl(
    runtime.contentUrl,
    runtime.lpId,
    item.id,
    activeContext.courseId,
    activeContext.sessionId,
    runtime.title || props.learningPathTitle || "",
  )
})

const threadLaunch = computed(() => {
  const runtime = store.runtime
  const item = store.currentItem
  const activeContext = context.value

  if (!runtime || !item || !activeContext || !isThreadLearningPathItem(item)) return null

  return parseLearningPathThreadContentUrl(
    runtime.contentUrl,
    runtime.lpId,
    item.id,
    activeContext.courseId,
    activeContext.sessionId,
    runtime.title || props.learningPathTitle || "",
  )
})

const embeddedLearningPathTitle = computed(
  () => store.runtime?.title || props.learningPathTitle || "",
)

function clearEmbeddedToolState(): void {
  embeddedExerciseAttemptId.value = null
  embeddedForumThread.value = null
}

async function handleEmbeddedExerciseFinished(attemptId: number): Promise<void> {
  embeddedExerciseAttemptId.value = attemptId
  await sync(true)
}

function openEmbeddedForumThread(threadId: number, threadTitle: string): void {
  embeddedForumThread.value = { id: threadId, title: threadTitle }
}

function closeEmbeddedForumThread(): void {
  embeddedForumThread.value = null
}

function itemTypeLabel(itemType: string): string {
  return itemType.replace(/_/g, " ") || t("learningPaths.item")
}

function statusLabel(status: string): string {
  const normalizedStatus = status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
  const supportedStatuses = new Set([
    "locked",
    "not_attempted",
    "incomplete",
    "completed",
    "passed",
    "succeeded",
    "browsed",
    "failed",
  ])

  return supportedStatuses.has(normalizedStatus)
    ? t(`learningPaths.status.${normalizedStatus}`)
    : status
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
    pendingItemId.value = null
    clearEmbeddedToolState()
    store.reset()
    await store.start(context.value, parsedLearningPathId.value)
  }
}

async function selectItem(itemId: number): Promise<void> {
  if (!context.value || !parsedLearningPathId.value || store.isBusy || pendingItemId.value) return

  pendingItemId.value = itemId
  clearEmbeddedToolState()

  await nextTick()
  playerSection.value?.scrollIntoView({ behavior: "smooth", block: "start" })

  try {
    await scormPlayer.value?.flush("navigation")
    await store.activateItem(context.value, parsedLearningPathId.value, itemId)
  } finally {
    pendingItemId.value = null
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

function scheduleScormProgressRefresh(payload: LearningPathScormCommitPayload): void {
  if (!shouldRefreshScormProgress(payload)) return

  if (scormProgressRefreshTimer) {
    clearTimeout(scormProgressRefreshTimer)
  }

  scormProgressRefreshTimer = setTimeout(() => {
    scormProgressRefreshTimer = null
    void sync(true)
  }, SCORM_PROGRESS_REFRESH_DELAY_MS)
}

async function openCStudioResource(resource: CStudioChamiloResource): Promise<void> {
  const activeContext = context.value
  if (!activeContext) return

  await scormPlayer.value?.flush("cstudio-resource")

  if (resource.type === "document" || resource.type === "video") {
    await router.push(buildDocumentsRoute(activeContext))
    return
  }

  if (resource.type === "link") {
    await router.push(buildCourseLinksRoute(activeContext))
    return
  }

  if (resource.type === "quiz") {
    await router.push(buildExercisePlayerRoute(activeContext, resource.id))
    return
  }

  if (resource.type === "student_publication") {
    await router.push(buildAssignmentDetailRoute(activeContext, resource.id, resource.title))
    return
  }

  if (resource.type === "forum") {
    await router.push(buildForumThreadsRoute(activeContext, resource.id, resource.title))
    return
  }

  if (resource.type === "thread") {
    if (resource.forumId) {
      await router.push(
        buildForumThreadRoute(
          activeContext,
          resource.forumId,
          resource.id,
          undefined,
          resource.title,
        ),
      )
      return
    }

    await router.push(buildForumsRoute(activeContext))
    return
  }

  await router.push(buildSurveyDetailRoute(activeContext, resource.id, "answer", resource.title))
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

  if (store.runtime) {
    const targetItem = resolveScormTargetedNavigationItem(store.runtime.items, request)
    if (targetItem) {
      await selectItem(targetItem.id)
      return
    }
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
    clearEmbeddedToolState()
    await store.restart(context.value, parsedLearningPathId.value)
  }
}

function canNavigateTo(item: LearningPathRuntimeItem | undefined): item is LearningPathRuntimeItem {
  return Boolean(item && isSupportedLearningPathItem(item) && !store.isBusy && !pendingItemId.value)
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

watch(
  () => store.currentItem?.id ?? 0,
  () => clearEmbeddedToolState(),
)

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
  if (scormProgressRefreshTimer) {
    clearTimeout(scormProgressRefreshTimer)
  }

  document.removeEventListener("visibilitychange", handleVisibilityChange)
  window.removeEventListener("pagehide", handlePageHide)
  void scormPlayer.value?.flush("unmount")
  void sync(false)
})
</script>

<template>
  <CourseUnavailableState v-if="!context || !parsedLearningPathId" kind="missing" />

  <div v-else class="space-y-3">
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
      <section class="rounded-xl bg-white p-3 shadow-sm">
        <div class="flex items-center gap-2">
          <RouterLink
            :to="buildLearningPathsRoute(context)"
            class="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-chamilo-700 hover:bg-slate-50"
            :aria-label="t('learningPaths.backToList')"
            :title="t('learningPaths.backToList')"
          >
            <i class="pi pi-arrow-left" aria-hidden="true" />
          </RouterLink>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h1 class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                {{ store.runtime.title || learningPathTitle }}
              </h1>
              <span class="shrink-0 text-xs font-semibold text-slate-700">
                {{ store.runtime.progress }}%
              </span>
            </div>
            <div
              class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"
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
          </div>

          <button
            v-if="store.runtime.canRestart"
            type="button"
            class="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50"
            :disabled="store.isBusy"
            :aria-label="t('learningPaths.restart')"
            :title="t('learningPaths.restart')"
            @click="restart"
          >
            <i class="pi pi-refresh" aria-hidden="true" />
          </button>
        </div>

        <div
          class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] leading-4 text-slate-500"
        >
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
          <span
            class="inline-flex items-center gap-1 font-medium"
            :class="store.offlineQueued ? 'text-amber-700' : 'text-emerald-700'"
            role="status"
            aria-live="polite"
          >
            <i
              :class="
                store.actionStatus === 'syncing'
                  ? 'pi pi-spinner pi-spin'
                  : store.offlineQueued
                    ? 'pi pi-cloud-upload'
                    : 'pi pi-check'
              "
              aria-hidden="true"
            />
            {{
              store.offlineQueued
                ? t("learningPaths.savedOfflineShort")
                : store.actionStatus === "syncing"
                  ? t("learningPaths.savingShort")
                  : t("learningPaths.savedShort")
            }}
          </span>
        </div>
      </section>

      <p
        v-if="store.actionErrorCode"
        class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        role="alert"
      >
        {{ actionErrorDescription }}
      </p>

      <section
        v-if="displayedItem"
        ref="playerSection"
        class="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
              {{ t("learningPaths.currentItem") }}
            </p>
            <h2 class="mt-0.5 break-words text-base font-semibold leading-6 text-slate-900">
              {{ displayedItem.title }}
            </h2>
            <p v-if="!pendingItemId" class="mt-0.5 text-xs capitalize text-slate-500">
              {{ itemTypeLabel(displayedItem.itemType) }}
              ·
              {{ statusLabel(displayedItem.status) }}
            </p>
          </div>
          <span
            v-if="currentItemPosition && !pendingItemId"
            class="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[0.7rem] font-medium text-slate-600"
          >
            {{
              t("learningPaths.itemPosition", {
                current: currentItemPosition.current,
                total: currentItemPosition.total,
              })
            }}
          </span>
        </div>

        <div
          v-if="pendingItemId || store.actionStatus === 'opening'"
          class="mt-3 flex min-h-28 items-center justify-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"
          role="status"
          aria-live="polite"
        >
          <i class="pi pi-spinner pi-spin text-lg text-chamilo-700" aria-hidden="true" />
          <span class="min-w-0 break-words">
            {{ t("learningPaths.openingNamedItem", { title: displayedItem.title }) }}
          </span>
        </div>

        <LoadingState
          v-else-if="store.contentStatus === 'loading'"
          class="mt-3"
          :label="t('learningPaths.contentLoading')"
        />

        <LearningPathScormPlayer
          v-else-if="
            currentItem && store.scormEntryUrl && store.contentStatus === 'ready' && store.runtime
          "
          ref="scormPlayer"
          :entry-url="store.scormEntryUrl"
          :runtime="store.runtime"
          :item="currentItem"
          :commit="commitScorm"
          @committed="scheduleScormProgressRefresh"
          @navigate="handleScormNavigation"
          @cstudio-resource="openCStudioResource"
        />

        <LearningPathContentViewer
          v-else-if="currentItem && store.contentBlob && store.contentStatus === 'ready'"
          class="mt-3"
          :blob="store.contentBlob"
          :item="currentItem"
          :content-url="store.runtime.contentUrl ?? ''"
          :locale="localeStore.contentLocale"
          :fallback-locales="localeStore.contentFallbackLocales"
          @download="store.downloadCurrentContent"
        />

        <ExerciseResultView
          v-else-if="
            currentItem &&
            quizLaunch &&
            embeddedExerciseAttemptId &&
            context &&
            isQuizLearningPathItem(currentItem) &&
            store.contentStatus === 'ready'
          "
          :key="`exercise-result-${currentItem.id}-${embeddedExerciseAttemptId ?? 0}`"
          class="mt-4"
          :course-id="courseId"
          :exercise-id="String(quizLaunch.exerciseId)"
          :attempt-id="String(embeddedExerciseAttemptId)"
          :session-id="sessionId"
          :membership-id="membershipId"
          :session-course-id="sessionCourseId"
          :source="source"
          origin="learnpath"
          :learning-path-id="String(quizLaunch.context.learningPathId)"
          :learning-path-item-id="String(quizLaunch.context.learningPathItemId)"
          :learning-path-item-view-id="
            quizLaunch.context.learningPathItemViewId > 0
              ? String(quizLaunch.context.learningPathItemViewId)
              : null
          "
          :learning-path-title="embeddedLearningPathTitle"
          embedded
        />

        <ExercisePlayerView
          v-else-if="
            currentItem &&
            quizLaunch &&
            context &&
            isQuizLearningPathItem(currentItem) &&
            store.contentStatus === 'ready'
          "
          :key="`exercise-${currentItem.id}`"
          class="mt-4"
          :course-id="courseId"
          :exercise-id="String(quizLaunch.exerciseId)"
          :session-id="sessionId"
          :membership-id="membershipId"
          :session-course-id="sessionCourseId"
          :source="source"
          origin="learnpath"
          :learning-path-id="String(quizLaunch.context.learningPathId)"
          :learning-path-item-id="String(quizLaunch.context.learningPathItemId)"
          :learning-path-item-view-id="
            quizLaunch.context.learningPathItemViewId > 0
              ? String(quizLaunch.context.learningPathItemViewId)
              : null
          "
          :learning-path-title="embeddedLearningPathTitle"
          embedded
          @finished="handleEmbeddedExerciseFinished"
        />

        <SurveyDetailView
          v-else-if="
            currentItem &&
            surveyLaunch &&
            context &&
            isSurveyLearningPathItem(currentItem) &&
            store.contentStatus === 'ready'
          "
          :key="`survey-${currentItem.id}`"
          class="mt-4"
          :course-id="courseId"
          :survey-id="String(surveyLaunch.surveyId)"
          :survey-title="currentItem.title"
          mode="answer"
          :invitation-lp-item-id="String(surveyLaunch.learningPathItemId)"
          :invitation-code="surveyLaunch.invitationCode"
          :learning-path-id="String(surveyLaunch.learningPathId)"
          :learning-path-title="embeddedLearningPathTitle"
          :session-id="sessionId"
          :membership-id="membershipId"
          :session-course-id="sessionCourseId"
          :source="source"
          embedded
          @completed="sync(true)"
        />

        <AssignmentDetailView
          v-else-if="
            currentItem &&
            assignmentLaunch &&
            context &&
            isAssignmentLearningPathItem(currentItem) &&
            store.contentStatus === 'ready'
          "
          :key="`assignment-${currentItem.id}`"
          class="mt-4"
          :course-id="courseId"
          :assignment-id="String(assignmentLaunch.assignmentId)"
          :assignment-title="currentItem.title"
          :learning-path-id="String(assignmentLaunch.learningPathId)"
          :learning-path-title="embeddedLearningPathTitle"
          :session-id="sessionId"
          :membership-id="membershipId"
          :session-course-id="sessionCourseId"
          :source="source"
          embedded
          @submitted="sync(true)"
        />

        <template
          v-else-if="
            currentItem &&
            forumLaunch &&
            context &&
            isForumLearningPathItem(currentItem) &&
            store.contentStatus === 'ready'
          "
        >
          <div v-if="embeddedForumThread" class="mt-4">
            <button
              type="button"
              class="mb-3 inline-flex min-h-touch items-center gap-2 rounded-lg px-2 text-sm font-semibold text-chamilo-700"
              @click="closeEmbeddedForumThread"
            >
              <i class="pi pi-arrow-left" aria-hidden="true" />
              {{ t("forums.backToThreads") }}
            </button>
            <ForumThreadView
              :key="`forum-thread-${embeddedForumThread.id}`"
              :course-id="courseId"
              :forum-id="String(forumLaunch.forumId)"
              :thread-id="String(embeddedForumThread.id)"
              :forum-title="currentItem.title"
              :thread-title="embeddedForumThread.title"
              :session-id="sessionId"
              :membership-id="membershipId"
              :session-course-id="sessionCourseId"
              :source="source"
              origin="learnpath"
              learning-path-entry="forum"
              :learning-path-id="String(forumLaunch.context.learningPathId)"
              :learning-path-item-id="String(forumLaunch.context.learningPathItemId)"
              :learning-path-title="embeddedLearningPathTitle"
              :group-id="
                forumLaunch.context.groupId > 0 ? String(forumLaunch.context.groupId) : null
              "
              embedded
            />
          </div>
          <ForumThreadsView
            v-else
            :key="`forum-${currentItem.id}`"
            class="mt-4"
            :course-id="courseId"
            :forum-id="String(forumLaunch.forumId)"
            :forum-title="currentItem.title"
            :session-id="sessionId"
            :membership-id="membershipId"
            :session-course-id="sessionCourseId"
            :source="source"
            origin="learnpath"
            learning-path-entry="forum"
            :learning-path-id="String(forumLaunch.context.learningPathId)"
            :learning-path-item-id="String(forumLaunch.context.learningPathItemId)"
            :learning-path-title="embeddedLearningPathTitle"
            :group-id="forumLaunch.context.groupId > 0 ? String(forumLaunch.context.groupId) : null"
            embedded
            @open-thread="openEmbeddedForumThread"
          />
        </template>

        <ForumThreadView
          v-else-if="
            currentItem &&
            threadLaunch &&
            context &&
            isThreadLearningPathItem(currentItem) &&
            store.contentStatus === 'ready'
          "
          :key="`thread-${currentItem.id}`"
          class="mt-4"
          :course-id="courseId"
          :forum-id="String(threadLaunch.forumId)"
          :thread-id="String(threadLaunch.threadId)"
          :forum-title="null"
          :thread-title="currentItem.title"
          :session-id="sessionId"
          :membership-id="membershipId"
          :session-course-id="sessionCourseId"
          :source="source"
          origin="learnpath"
          learning-path-entry="thread"
          :learning-path-id="String(threadLaunch.context.learningPathId)"
          :learning-path-item-id="String(threadLaunch.context.learningPathItemId)"
          :learning-path-title="embeddedLearningPathTitle"
          :group-id="threadLaunch.context.groupId > 0 ? String(threadLaunch.context.groupId) : null"
          embedded
        />

        <p
          v-else-if="
            currentItem &&
            store.contentStatus === 'ready' &&
            (isForumLearningPathItem(currentItem) || isThreadLearningPathItem(currentItem))
          "
          class="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"
        >
          {{ t("learningPaths.unsupportedItem") }}
        </p>

        <p
          v-else-if="currentItem && !isSupportedLearningPathItem(currentItem)"
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

        <div
          v-if="!store.runtime.hideArrowNavigation"
          class="mt-3 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2"
        >
          <button
            type="button"
            class="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-slate-300 text-slate-800 disabled:opacity-40"
            :disabled="!canNavigateTo(previousItem)"
            :aria-label="t('learningPaths.previous')"
            :title="t('learningPaths.previous')"
            @click="previousItem && selectItem(previousItem.id)"
          >
            <i class="pi pi-arrow-left" aria-hidden="true" />
          </button>

          <p class="truncate text-center text-xs font-medium text-slate-500" aria-live="polite">
            <template v-if="currentItemPosition">
              {{
                t("learningPaths.itemPosition", {
                  current: currentItemPosition.current,
                  total: currentItemPosition.total,
                })
              }}
            </template>
          </p>

          <button
            type="button"
            class="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl bg-chamilo-700 text-white disabled:opacity-40"
            :disabled="!canNavigateTo(nextItem)"
            :aria-label="t('learningPaths.next')"
            :title="t('learningPaths.next')"
            @click="nextItem && selectItem(nextItem.id)"
          >
            <i class="pi pi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section v-if="!store.runtime.hideToc">
        <h2 class="mb-2 text-base font-semibold text-slate-900">
          {{ t("learningPaths.contents") }}
        </h2>

        <LearningPathToc
          :items="store.runtime.items"
          :current-item-id="store.runtime.currentItemId"
          :busy="store.isBusy || Boolean(pendingItemId)"
          :accordion="store.runtime.accordionToc"
          :pending-item-id="pendingItemId"
          @select="selectItem"
        />
      </section>

      <p v-else class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        {{ t("learningPaths.tocHidden") }}
      </p>
    </template>
  </div>
</template>
