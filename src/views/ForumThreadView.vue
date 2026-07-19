<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildForumThreadsRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
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
}>()

const { t } = useI18n()
const store = useForumsStore()

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

const usableContext = computed(
  () => context.value && parsedForumId.value !== null && parsedThreadId.value !== null,
)

const errorDescription = computed(() => t(`forums.errors.${store.thread.errorCode ?? "server"}`))

async function load(): Promise<void> {
  if (context.value && parsedForumId.value !== null && parsedThreadId.value !== null) {
    await store.loadThread(context.value, parsedForumId.value, parsedThreadId.value)
  }
}

function formatAttachmentSize(size: number | null): string {
  if (size === null || size < 0) return ""

  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!usableContext" kind="missing" />

  <div v-else-if="context && parsedForumId !== null && parsedThreadId !== null" class="space-y-5">
    <RouterLink
      :to="
        buildForumThreadsRoute(
          context,
          parsedForumId,
          store.thread.data?.forumTitle || props.forumTitle || undefined,
        )
      "
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("forums.backToThreads") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ store.thread.data?.forumTitle || props.forumTitle || t("forums.thread.eyebrow") }}
      </p>
      <h1 class="mt-1 break-words text-xl font-semibold text-slate-900">
        {{ store.thread.data?.threadTitle || props.threadTitle || t("forums.thread.title") }}
      </h1>
      <p v-if="store.thread.data?.posterFullName" class="mt-2 text-sm text-slate-600">
        {{
          t("forums.threads.startedBy", {
            name: store.thread.data.posterFullName,
          })
        }}
        <span v-if="store.thread.data.posterRoleLabel">
          · {{ store.thread.data.posterRoleLabel }}
        </span>
      </p>
      <p v-if="store.thread.data?.relativeTime" class="mt-1 text-xs text-slate-500">
        {{ store.thread.data.relativeTime }}
      </p>
    </section>

    <div class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900" role="status">
      {{ t("forums.thread.readOnlyNotice") }}
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
                <span class="min-w-0 flex-1 break-words">
                  {{ attachment.filename }}
                </span>
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
