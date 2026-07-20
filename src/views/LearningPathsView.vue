<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildCourseRoute,
  buildLearningPathDetailRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import type { CourseToolCard } from "@/domain/courseTools/types"
import { useCourseToolCollectionsStore } from "@/stores/courseToolCollections"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const store = useCourseToolCollectionsStore()
const state = computed(() => store.states["learning-paths"])

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

const items = computed(() => state.value.collection?.items ?? [])
const errorDescription = computed(() =>
  t(`acceleratedTools.errors.${state.value.errorCode ?? "server"}`),
)

function itemId(item: CourseToolCard): number | null {
  const parsed = Number(item.id)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function detailRoute(item: CourseToolCard) {
  const id = itemId(item)

  return context.value && id
    ? buildLearningPathDetailRoute(context.value, id, item.title)
    : buildCourseRoute(context.value!)
}

async function load(): Promise<void> {
  if (context.value) {
    await store.load("learning-paths", context.value)
  }
}

onMounted(load)
</script>

<template>
  <CourseUnavailableState v-if="!context" kind="missing" />

  <div v-else class="space-y-4">
    <RouterLink
      :to="buildCourseRoute(context)"
      class="inline-flex min-h-touch items-center gap-2 rounded-xl px-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("learningPaths.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("learningPaths.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("learningPaths.title") }}
      </h1>
      <p class="mt-1 text-sm text-slate-600">
        {{ t("learningPaths.description") }}
      </p>
    </section>

    <LoadingState
      v-if="state.status === 'loading' || state.status === 'idle'"
      :label="t('learningPaths.loading')"
    />

    <ErrorState
      v-else-if="state.status === 'error'"
      :title="t('learningPaths.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <div v-else-if="items.length" class="space-y-2">
      <RouterLink
        v-for="item in items"
        :key="item.id"
        :to="detailRoute(item)"
        class="group block rounded-xl border border-slate-200 bg-white p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-chamilo-600 focus:ring-offset-2"
      >
        <div class="flex items-center gap-3">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chamilo-50 text-chamilo-700"
            aria-hidden="true"
          >
            <i class="pi pi-sitemap" />
          </span>

          <div class="min-w-0 flex-1">
            <h2 class="break-words font-semibold text-slate-900">
              {{ item.title }}
            </h2>

            <div v-if="item.progress !== null" class="mt-2 flex items-center gap-2">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  class="h-full rounded-full bg-chamilo-600"
                  :style="{ width: `${item.progress}%` }"
                />
              </div>
              <span class="text-xs font-semibold text-slate-600"> {{ item.progress }}% </span>
            </div>
          </div>

          <i
            class="pi pi-chevron-right text-sm text-slate-400 group-hover:text-chamilo-700"
            aria-hidden="true"
          />
        </div>
      </RouterLink>
    </div>

    <EmptyState
      v-else
      :title="t('learningPaths.emptyTitle')"
      :description="t('learningPaths.emptyDescription')"
    />
  </div>
</template>
