<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildForumThreadsRoute,
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
  threadId: string
  forumTitle: string | null
  threadTitle: string | null
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
const store = useForumsStore()
const showComposer = ref(false)
const replyTitle = ref("")
const replyText = ref("")
const postNotification = ref(false)
const validationError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

function positiveInteger(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const parsedForumId = computed(() => positiveInteger(props.forumId))
const parsedThreadId = computed(() => positiveInteger(props.threadId))
const hasLearningPathRouteContext = computed(() => hasForumLearningPathRouteContext(props))
const learningPathContext = computed(() => parseForumLearningPathRouteContext(props))
const usableContext = computed(
  () =>
    context.value &&
    parsedForumId.value !== null &&
    parsedThreadId.value !== null &&
    (!hasLearningPathRouteContext.value || learningPathContext.value !== null),
)
const backRoute = computed(() => {
  if (!context.value || parsedForumId.value === null) return null

  if (learningPathContext.value?.entry === "thread") {
    return buildLearningPathDetailRoute(
      context.value,
      learningPathContext.value.learningPathId,
      learningPathContext.value.learningPathTitle || undefined,
    )
  }

  return buildForumThreadsRoute(
    context.value,
    parsedForumId.value,
    store.thread.data?.forumTitle || props.forumTitle || undefined,
    learningPathContext.value,
  )
})
const canReply = computed(() => store.thread.data?.canReply === true)
const errorDescription = computed(() => t(`forums.errors.${store.thread.errorCode ?? "server"}`))
const writeErrorDescription = computed(() =>
  t(`forums.errors.${store.write.errorCode ?? "server"}`),
)

async function load(): Promise<void> {
  if (
    !usableContext.value ||
    !context.value ||
    parsedForumId.value === null ||
    parsedThreadId.value === null
  ) {
    return
  }

  await store.loadThread(
    context.value,
    parsedForumId.value,
    parsedThreadId.value,
    learningPathContext.value,
  )
}

function formatAttachmentSize(size: number | null): string {
  if (size === null || size < 0) return ""
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function openComposer(): void {
  replyTitle.value = `Re: ${store.thread.data?.threadTitle || props.threadTitle || ""}`.trim()
  validationError.value = null
  successMessage.value = null
  store.resetWrite()
  showComposer.value = true
}

function closeComposer(): void {
  showComposer.value = false
  replyText.value = ""
  postNotification.value = false
  validationError.value = null
  store.resetWrite()
}

async function submitReply(): Promise<void> {
  if (
    !usableContext.value ||
    !context.value ||
    parsedForumId.value === null ||
    parsedThreadId.value === null ||
    !canReply.value
  ) {
    return
  }

  validationError.value = null
  successMessage.value = null
  store.resetWrite()

  if (!replyTitle.value.trim()) {
    validationError.value = t("forums.write.titleRequired")
    return
  }

  if (!replyText.value.trim()) {
    validationError.value = t("forums.write.textRequired")
    return
  }

  const result = await store.createReply(
    context.value,
    parsedForumId.value,
    parsedThreadId.value,
    {
      title: replyTitle.value,
      text: replyText.value,
      postNotification: postNotification.value,
    },
    learningPathContext.value,
  )

  if (!result) return

  const publishedMessage =
    result.postId < 0
      ? t("offlineSync.savedForSync")
      : result.requiresApproval
        ? t("forums.write.pendingApproval")
        : t("forums.write.replyPublished")

  closeComposer()
  successMessage.value = publishedMessage
  await load()
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!usableContext" kind="missing" />

  <div v-else-if="context && parsedForumId !== null && parsedThreadId !== null" class="space-y-5">
    <RouterLink
      :to="
        backRoute ??
        buildForumThreadsRoute(
          context,
          parsedForumId,
          store.thread.data?.forumTitle || props.forumTitle || undefined,
          learningPathContext,
        )
      "
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ learningPathContext?.entry === "thread" ? t("learningPaths.backToList") : t("forums.backToThreads") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ store.thread.data?.forumTitle || props.forumTitle || t("forums.thread.eyebrow") }}
      </p>
      <h1 class="mt-1 break-words text-xl font-semibold text-slate-900">
        {{ store.thread.data?.threadTitle || props.threadTitle || t("forums.thread.title") }}
      </h1>
      <p v-if="store.thread.data?.posterFullName" class="mt-2 text-sm text-slate-600">
        {{ t("forums.threads.startedBy", { name: store.thread.data.posterFullName }) }}
        <span v-if="store.thread.data.posterRoleLabel">
          · {{ store.thread.data.posterRoleLabel }}
        </span>
      </p>
      <p v-if="store.thread.data?.relativeTime" class="mt-1 text-xs text-slate-500">
        {{ store.thread.data.relativeTime }}
      </p>

      <button
        v-if="canReply && !showComposer"
        type="button"
        class="hover:bg-chamilo-800 mt-4 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
        @click="openComposer"
      >
        <i class="pi pi-reply" aria-hidden="true" />
        {{ t("forums.write.reply") }}
      </button>
    </section>

    <p
      v-if="successMessage"
      class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900"
      role="status"
    >
      {{ successMessage }}
    </p>

    <section v-if="showComposer && canReply" class="rounded-2xl bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-900">{{ t("forums.write.reply") }}</h2>
        <button
          type="button"
          class="flex min-h-touch min-w-touch items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
          :aria-label="t('actions.cancel')"
          @click="closeComposer"
        >
          <i class="pi pi-times" aria-hidden="true" />
        </button>
      </div>

      <form class="mt-4 space-y-4" @submit.prevent="submitReply">
        <div>
          <label for="forum-reply-title" class="text-sm font-semibold text-slate-800">
            {{ t("forums.write.title") }}
          </label>
          <input
            id="forum-reply-title"
            v-model="replyTitle"
            name="forumReplyTitle"
            type="text"
            maxlength="250"
            class="focus:ring-chamilo-200 mt-1 min-h-touch w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-chamilo-600 focus:outline-none focus:ring-2"
          />
        </div>

        <div>
          <label for="forum-reply-text" class="text-sm font-semibold text-slate-800">
            {{ t("forums.write.message") }}
          </label>
          <textarea
            id="forum-reply-text"
            v-model="replyText"
            name="forumReplyText"
            rows="7"
            class="focus:ring-chamilo-200 mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-chamilo-600 focus:outline-none focus:ring-2"
          />
        </div>

        <label
          class="flex min-h-touch items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
          <input v-model="postNotification" name="forumReplyNotification" type="checkbox" />
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
            store.write.status === "saving"
              ? t("forums.write.saving")
              : t("forums.write.publishReply")
          }}
        </button>
      </form>
    </section>

    <div
      v-if="store.thread.data && !canReply"
      class="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"
      role="status"
    >
      {{ t("forums.write.replyUnavailable") }}
    </div>

    <LoadingState
      v-if="store.thread.status === 'loading' || store.thread.status === 'idle'"
      :label="t('forums.thread.loading')"
    />

    <ErrorState
      v-else-if="store.thread.status === 'error'"
      :title="t('forums.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.thread.data">
      <div v-if="store.thread.data.posts.length" class="space-y-3">
        <article
          v-for="post in store.thread.data.posts"
          :key="post.id"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-slate-900">
                {{ post.posterFullName || t("forums.unknownAuthor") }}
              </p>
              <p class="mt-0.5 text-xs text-slate-500">
                <span v-if="post.posterRoleLabel">{{ post.posterRoleLabel }}</span>
                <span v-if="post.posterRoleLabel && post.relativeTime"> · </span>
                <span v-if="post.relativeTime">{{ post.relativeTime }}</span>
              </p>
            </div>

            <span
              v-if="post.statusLabel && post.statusLabel !== 'Validated'"
              class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900"
            >
              {{ post.statusLabel }}
            </span>
          </div>

          <p
            v-if="post.parentId"
            class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {{ t("forums.thread.reply") }}
          </p>

          <h2 v-if="post.title" class="mt-3 break-words font-semibold text-slate-900">
            {{ post.title }}
          </h2>

          <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {{ post.text || t("forums.thread.emptyPost") }}
          </p>

          <div v-if="post.attachments.length" class="mt-4 border-t border-slate-100 pt-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {{ t("forums.thread.attachments") }}
            </p>
            <ul class="mt-2 space-y-2">
              <li
                v-for="attachment in post.attachments"
                :key="attachment.id"
                class="flex min-h-touch items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                <i class="pi pi-paperclip text-chamilo-700" aria-hidden="true" />
                <span class="min-w-0 flex-1 break-words">{{ attachment.filename }}</span>
                <span v-if="attachment.size !== null" class="shrink-0 text-xs text-slate-500">
                  {{ formatAttachmentSize(attachment.size) }}
                </span>
              </li>
            </ul>
          </div>
        </article>
      </div>

      <EmptyState
        v-else
        :title="t('forums.thread.emptyTitle')"
        :description="t('forums.thread.emptyDescription')"
      />
    </template>
  </div>
</template>
