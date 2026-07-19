<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildCourseRoute,
  buildForumThreadsRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import type {
  ForumAvailabilityStatus,
  ForumCategoryGroup,
  ForumSummary,
} from "@/domain/forums/types"
import { useForumsStore } from "@/stores/forums"

const props = defineProps<{
  courseId: string
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

const errorDescription = computed(() => t(`forums.errors.${store.list.errorCode ?? "server"}`))

function availabilityLabel(status: ForumAvailabilityStatus): string {
  return t(`forums.availability.${status}`)
}

async function load(): Promise<void> {
  if (context.value) {
    await store.loadForums(context.value)
  }
}

function groupsWithForums(): ForumCategoryGroup[] {
  return store.list.data?.categories ?? []
}

function uncategorizedForums(): ForumSummary[] {
  return store.list.data?.uncategorized ?? []
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!context" kind="missing" />

  <div v-else class="space-y-5">
    <RouterLink
      :to="buildCourseRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("forums.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("forums.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("forums.title") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t("forums.description") }}
      </p>
    </section>

    <div class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900" role="status">
      {{ t("forums.readOnlyNotice") }}
    </div>

    <LoadingState
      v-if="store.list.status === 'loading' || store.list.status === 'idle'"
      :label="t('forums.loading')"
    />

    <ErrorState
      v-else-if="store.list.status === 'error'"
      :title="t('forums.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="store.list.data">
      <div v-if="store.list.data.totalItems" class="space-y-5">
        <section v-for="group in groupsWithForums()" :key="group.category.id" class="space-y-3">
          <div>
            <h2 class="font-semibold text-slate-900">
              {{ group.category.title }}
            </h2>
            <p v-if="group.category.description" class="mt-1 text-sm text-slate-600">
              {{ group.category.description }}
            </p>
          </div>

          <RouterLink
            v-for="forum in group.forums"
            :key="forum.id"
            :to="buildForumThreadsRoute(context, forum.id, forum.title)"
            class="hover:border-chamilo-300 block min-h-touch rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h3 class="break-words font-semibold text-slate-900">
                  {{ forum.title }}
                </h3>
                <p
                  v-if="forum.description"
                  class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600"
                >
                  {{ forum.description }}
                </p>
              </div>
              <i class="pi pi-chevron-right mt-1 text-slate-400" aria-hidden="true" />
            </div>

            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                {{ t("forums.counts.threads", { count: forum.threadCount }) }}
              </span>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                {{ t("forums.counts.posts", { count: forum.postCount }) }}
              </span>
              <span
                v-if="forum.locked"
                class="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900"
              >
                {{ t("forums.badges.locked") }}
              </span>
              <span
                v-if="forum.availabilityStatus !== 'open'"
                class="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900"
              >
                {{ availabilityLabel(forum.availabilityStatus) }}
              </span>
              <span
                v-if="forum.groupForum"
                class="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-900"
              >
                {{ t("forums.badges.group") }}
              </span>
              <span
                v-if="forum.moderated"
                class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"
              >
                {{ t("forums.badges.moderated") }}
              </span>
              <span
                v-if="forum.subscribed"
                class="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-900"
              >
                {{ t("forums.badges.subscribed") }}
              </span>
            </div>
          </RouterLink>
        </section>

        <section v-if="uncategorizedForums().length" class="space-y-3">
          <h2 class="font-semibold text-slate-900">
            {{ t("forums.uncategorized") }}
          </h2>

          <RouterLink
            v-for="forum in uncategorizedForums()"
            :key="forum.id"
            :to="buildForumThreadsRoute(context, forum.id, forum.title)"
            class="hover:border-chamilo-300 block min-h-touch rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h3 class="break-words font-semibold text-slate-900">
                  {{ forum.title }}
                </h3>
                <p
                  v-if="forum.description"
                  class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600"
                >
                  {{ forum.description }}
                </p>
              </div>
              <i class="pi pi-chevron-right mt-1 text-slate-400" aria-hidden="true" />
            </div>

            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                {{ t("forums.counts.threads", { count: forum.threadCount }) }}
              </span>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                {{ t("forums.counts.posts", { count: forum.postCount }) }}
              </span>
              <span
                v-if="forum.locked"
                class="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900"
              >
                {{ t("forums.badges.locked") }}
              </span>
              <span
                v-if="forum.availabilityStatus !== 'open'"
                class="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900"
              >
                {{ availabilityLabel(forum.availabilityStatus) }}
              </span>
            </div>
          </RouterLink>
        </section>
      </div>

      <EmptyState
        v-else
        :title="t('forums.emptyTitle')"
        :description="t('forums.emptyDescription')"
      />
    </template>
  </div>
</template>
