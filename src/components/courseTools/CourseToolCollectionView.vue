<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildCourseRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import type { AcceleratedCourseToolKey } from "@/domain/courseTools/types"
import { useCourseToolCollectionsStore } from "@/stores/courseToolCollections"

const props = defineProps<{
  tool: AcceleratedCourseToolKey
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const store = useCourseToolCollectionsStore()

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const state = computed(() => store.states[props.tool])
const prefix = computed(() => `acceleratedTools.${props.tool}`)
const errorDescription = computed(() =>
  t(`acceleratedTools.errors.${state.value.errorCode ?? "server"}`),
)

async function load(): Promise<void> {
  if (context.value) {
    await store.load(props.tool, context.value)
  }
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
      {{ t("acceleratedTools.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t(`${prefix}.eyebrow`) }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t(`${prefix}.title`) }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t(`${prefix}.description`) }}
      </p>
    </section>

    <LoadingState
      v-if="state.status === 'loading' || state.status === 'idle'"
      :label="t('acceleratedTools.loading')"
    />

    <ErrorState
      v-else-if="state.status === 'error'"
      :title="t('acceleratedTools.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="state.collection">
      <div
        v-if="state.collection.warningKey"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        role="status"
      >
        {{ t(state.collection.warningKey) }}
      </div>

      <div v-if="state.collection.items.length" class="space-y-3">
        <article
          v-for="item in state.collection.items"
          :key="item.id"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h2 class="break-words font-semibold text-slate-900">
                {{ item.title }}
              </h2>
              <p v-if="item.description" class="mt-2 text-sm leading-6 text-slate-600">
                {{ item.description }}
              </p>
            </div>
            <span
              v-if="item.status"
              class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {{ item.status }}
            </span>
          </div>

          <ul v-if="item.metadata.length" class="mt-3 space-y-1 text-xs text-slate-500">
            <li v-for="metadata in item.metadata" :key="metadata">
              {{ metadata }}
            </li>
          </ul>

          <div v-if="item.progress !== null" class="mt-4">
            <div class="mb-1 flex justify-between text-xs font-semibold text-slate-600">
              <span>{{ t("acceleratedTools.progress") }}</span>
              <span>{{ Math.round(item.progress) }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                class="h-full rounded-full bg-chamilo-600"
                :style="{
                  width: `${Math.max(0, Math.min(100, item.progress))}%`,
                }"
              />
            </div>
          </div>

          <p v-if="item.score" class="mt-3 text-sm font-semibold text-chamilo-700">
            {{ t("acceleratedTools.score") }}: {{ item.score }}
          </p>
        </article>
      </div>

      <EmptyState
        v-else
        :title="t(`${prefix}.emptyTitle`)"
        :description="t(`${prefix}.emptyDescription`)"
      />
    </template>
  </div>
</template>
