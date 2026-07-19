<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildForumThreadRoute,
  buildForumsRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { useForumsStore } from "@/stores/forums"

const props = defineProps<{
  courseId: string
  forumId: string
  forumTitle: string | null
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

const parsedForumId = computed(() => {
  const value = Number(props.forumId)
  return Number.isInteger(value) && value > 0 ? value : null
})

const usableContext = computed(() => context.value && parsedForumId.value !== null)

const errorDescription = computed(() => t(`forums.errors.${store.threads.errorCode ?? "server"}`))

async function load(): Promise<void> {
  if (context.value && parsedForumId.value !== null) {
    await store.loadThreads(context.value, parsedForumId.value)
  }
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!usableContext" kind="missing" />

  <div v-else-if="context && parsedForumId !== null" class="space-y-5">
    <RouterLink
      :to="buildForumsRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("forums.backToForums") }}
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
    </section>

    <div class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900" role="status">
      {{ t("forums.readOnlyNotice") }}
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
            )
          "
          class="hover:border-chamilo-300 block min-h-touch rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="break-words font-semibold text-slate-900">
                  {{ thread.title }}
                </h2>
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
                {{
                  t("forums.threads.startedBy", {
                    name: thread.posterFullName,
                  })
                }}
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
