<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildForumThreadRoute,
  buildForumsRoute,
  buildLearningPathDetailRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import {
  hasForumLearningPathRouteContext,
  parseForumLearningPathRouteContext,
} from "@/domain/forums/learningPathContext"
import { useForumsStore } from "@/stores/forums"

const props = defineProps<{
  courseId: string
  forumId: string
  forumTitle: string | null
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
  origin: string | null
  learningPathEntry: string | null
  learningPathId: string | null
  learningPathItemId: string | null
  learningPathTitle: string | null
  groupId: string | null
}>()

const { t } = useI18n()
const router = useRouter()
const store = useForumsStore()
const showComposer = ref(false)
const title = ref("")
const text = ref("")
const postNotification = ref(false)
const validationError = ref<string | null>(null)

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const parsedForumId = computed(() => {
  const value = Number(props.forumId)
  return Number.isInteger(value) && value > 0 ? value : null
})

const hasLearningPathRouteContext = computed(() => hasForumLearningPathRouteContext(props))
const learningPathContext = computed(() => parseForumLearningPathRouteContext(props))
const usableContext = computed(
  () =>
    context.value &&
    parsedForumId.value !== null &&
    (!hasLearningPathRouteContext.value || learningPathContext.value !== null),
)
const backRoute = computed(() => {
  if (!context.value) return null

  return learningPathContext.value
    ? buildLearningPathDetailRoute(
        context.value,
        learningPathContext.value.learningPathId,
        learningPathContext.value.learningPathTitle || undefined,
      )
    : buildForumsRoute(context.value)
})
const canCreateThread = computed(
  () =>
    store.threads.data?.allowNewThreads === true &&
    store.threads.data.forumLocked === false &&
    store.threads.data.availabilityStatus === "open",
)

const errorDescription = computed(() => t(`forums.errors.${store.threads.errorCode ?? "server"}`))
const writeErrorDescription = computed(() =>
  t(`forums.errors.${store.write.errorCode ?? "server"}`),
)

async function load(): Promise<void> {
  if (!usableContext.value || !context.value || parsedForumId.value === null) return

  await store.loadThreads(context.value, parsedForumId.value, learningPathContext.value)
}

function resetComposer(): void {
  showComposer.value = false
  title.value = ""
  text.value = ""
  postNotification.value = false
  validationError.value = null
  store.resetWrite()
}

async function submitThread(): Promise<void> {
  if (
    !usableContext.value ||
    !context.value ||
    parsedForumId.value === null ||
    !canCreateThread.value
  ) {
    return
  }

  validationError.value = null
  store.resetWrite()

  if (!title.value.trim()) {
    validationError.value = t("forums.write.titleRequired")
    return
  }

  if (!text.value.trim()) {
    validationError.value = t("forums.write.textRequired")
    return
  }

  const result = await store.createThread(
    context.value,
    parsedForumId.value,
    {
      title: title.value,
      text: text.value,
      postNotification: postNotification.value,
    },
    learningPathContext.value,
  )

  if (!result) return

  if (result.threadId < 0) {
    resetComposer()
    return
  }

  const route = buildForumThreadRoute(
    context.value,
    parsedForumId.value,
    result.threadId,
    store.threads.data?.forumTitle || props.forumTitle || undefined,
    title.value.trim(),
    learningPathContext.value,
  )

  resetComposer()
  await router.push(route)
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!usableContext" kind="missing" />

  <div v-else-if="context && parsedForumId !== null" class="space-y-5">
    <RouterLink
      :to="backRoute ?? buildForumsRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ learningPathContext ? t("learningPaths.backToList") : t("forums.backToForums") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("forums.threads.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ store.threads.data?.forumTitle || props.forumTitle || t("forums.threads.title") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t("forums.threads.description") }}
      </p>

      <button
        v-if="canCreateThread"
        type="button"
        class="hover:bg-chamilo-800 mt-4 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
        @click="showComposer = !showComposer"
      >
        <i :class="showComposer ? 'pi pi-times' : 'pi pi-plus'" aria-hidden="true" />
        {{ showComposer ? t("actions.cancel") : t("forums.write.newThread") }}
      </button>
    </section>

    <section v-if="showComposer && canCreateThread" class="rounded-2xl bg-white p-4 shadow-sm">
      <h2 class="text-lg font-semibold text-slate-900">
        {{ t("forums.write.newThread") }}
      </h2>

      <form class="mt-4 space-y-4" @submit.prevent="submitThread">
        <div>
          <label for="forum-thread-title" class="text-sm font-semibold text-slate-800">
            {{ t("forums.write.title") }}
          </label>
          <input
            id="forum-thread-title"
            v-model="title"
            name="forumThreadTitle"
            type="text"
            maxlength="250"
            class="focus:ring-chamilo-200 mt-1 min-h-touch w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-chamilo-600 focus:outline-none focus:ring-2"
            autocomplete="off"
          />
        </div>

        <div>
          <label for="forum-thread-text" class="text-sm font-semibold text-slate-800">
            {{ t("forums.write.message") }}
          </label>
          <textarea
            id="forum-thread-text"
            v-model="text"
            name="forumThreadText"
            rows="7"
            class="focus:ring-chamilo-200 mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-chamilo-600 focus:outline-none focus:ring-2"
          />
        </div>

        <label
          class="flex min-h-touch items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
          <input v-model="postNotification" name="forumThreadNotification" type="checkbox" />
          <span>{{ t("forums.write.notify") }}</span>
        </label>

        <p v-if="validationError" class="text-sm font-medium text-red-700" role="alert">
          {{ validationError }}
        </p>

        <p
          v-if="store.write.status === 'error'"
          class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {{ writeErrorDescription }}
        </p>

        <button
          type="submit"
          class="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="store.write.status === 'saving'"
        >
          <i class="pi pi-send" aria-hidden="true" />
          {{
            store.write.status === "saving" ? t("forums.write.saving") : t("forums.write.publish")
          }}
        </button>
      </form>
    </section>

    <div
      v-if="store.threads.data && !canCreateThread"
      class="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"
      role="status"
    >
      {{ t("forums.write.threadCreationUnavailable") }}
    </div>

    <LoadingState
      v-if="store.threads.status === 'loading' || store.threads.status === 'idle'"
      :label="t('forums.threads.loading')"
    />

    <ErrorState
      v-else-if="store.threads.status === 'error'"
      :title="t('forums.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.threads.data">
      <div v-if="store.threads.data.items.length" class="space-y-3">
        <RouterLink
          v-for="thread in store.threads.data.items"
          :key="thread.id"
          :to="
            buildForumThreadRoute(
              context,
              parsedForumId,
              thread.id,
              store.threads.data?.forumTitle || props.forumTitle || undefined,
              thread.title,
              learningPathContext,
            )
          "
          class="hover:border-chamilo-300 block min-h-touch rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="break-words font-semibold text-slate-900">{{ thread.title }}</h2>
                <span
                  v-if="thread.sticky"
                  class="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-900"
                >
                  {{ t("forums.badges.sticky") }}
                </span>
                <span
                  v-if="thread.locked || thread.lockedByGradebook"
                  class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900"
                >
                  {{ t("forums.badges.locked") }}
                </span>
              </div>

              <p v-if="thread.posterFullName" class="mt-2 text-sm text-slate-600">
                {{ t("forums.threads.startedBy", { name: thread.posterFullName }) }}
                <span v-if="thread.posterRoleLabel"> · {{ thread.posterRoleLabel }} </span>
              </p>
              <p v-if="thread.relativeTime" class="mt-1 text-xs text-slate-500">
                {{ thread.relativeTime }}
              </p>
            </div>

            <i class="pi pi-chevron-right mt-1 text-slate-400" aria-hidden="true" />
          </div>

          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
              {{ t("forums.counts.replies", { count: thread.replyCount }) }}
            </span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
              {{ t("forums.counts.views", { count: thread.viewCount }) }}
            </span>
            <span
              v-if="thread.subscribed"
              class="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-900"
            >
              {{ t("forums.badges.subscribed") }}
            </span>
          </div>

          <p
            v-if="thread.lastPosterFullName || thread.lastPostRelativeTime"
            class="mt-3 text-xs text-slate-500"
          >
            {{
              t("forums.threads.lastPost", {
                name: thread.lastPosterFullName || t("forums.unknownAuthor"),
                time: thread.lastPostRelativeTime || "",
              })
            }}
          </p>
        </RouterLink>
      </div>

      <EmptyState
        v-else
        :title="t('forums.threads.emptyTitle')"
        :description="t('forums.threads.emptyDescription')"
      />
    </template>
  </div>
</template>
