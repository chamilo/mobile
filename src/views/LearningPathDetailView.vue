<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildLearningPathsRoute,
  CourseRouteContextError,
  parseCourseRouteContext,
} from "@/domain/courses/routeContext"
import { isOpenableLearningPathItem } from "@/domain/learningPaths/contracts"
import { useLearningPathRuntimeStore } from "@/stores/learningPathRuntime"

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

const errorDescription = computed(() => t(`learningPaths.errors.${store.errorCode ?? "server"}`))
const contentErrorDescription = computed(() =>
  t(`learningPaths.errors.${store.contentErrorCode ?? "server"}`),
)

const canOpenCurrentItem = computed(() =>
  store.runtime ? isOpenableLearningPathItem(store.currentItem, store.runtime) : false,
)

function itemTypeLabel(itemType: string): string {
  return itemType.replace(/_/g, " ") || t("learningPaths.item")
}

async function load(itemId?: number): Promise<void> {
  if (context.value && parsedLearningPathId.value) {
    await store.load(context.value, parsedLearningPathId.value, itemId)
  }
}

onMounted(() => {
  void load()
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
      @retry="load()"
    />

    <template v-else-if="store.runtime">
      <section class="rounded-2xl bg-white p-4 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
          {{ t("learningPaths.detailEyebrow") }}
        </p>
        <h1 class="mt-1 break-words text-xl font-semibold text-slate-900">
          {{ store.runtime.title || learningPathTitle }}
        </h1>

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
              class="h-full rounded-full bg-chamilo-600"
              :style="{ width: `${store.runtime.progress}%` }"
            />
          </div>
          <span class="text-sm font-semibold text-slate-700"> {{ store.runtime.progress }}% </span>
        </div>

        <p class="mt-2 text-xs text-slate-500">
          {{
            t("learningPaths.completedItems", {
              completed: store.runtime.completedItems,
              total: store.runtime.totalItems,
            })
          }}
        </p>
      </section>

      <div
        class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"
        role="status"
      >
        {{ t("learningPaths.readOnlyNotice") }}
      </div>

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
        </p>

        <button
          v-if="canOpenCurrentItem"
          type="button"
          class="mt-4 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          :disabled="store.contentStatus === 'loading'"
          @click="store.openCurrentItem"
        >
          <i class="pi pi-external-link" aria-hidden="true" />
          {{
            store.contentStatus === "loading"
              ? t("learningPaths.preparing")
              : t("learningPaths.openContent")
          }}
        </button>

        <p v-else class="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          {{ t("learningPaths.unsupportedItem") }}
        </p>

        <p
          v-if="store.contentErrorCode"
          class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {{ contentErrorDescription }}
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-slate-900">
          {{ t("learningPaths.contents") }}
        </h2>

        <div class="space-y-2">
          <button
            v-for="item in store.runtime.items"
            :key="item.id"
            type="button"
            class="flex min-h-touch w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm disabled:cursor-default"
            :class="
              item.id === store.runtime.currentItemId
                ? 'ring-chamilo-200 border-chamilo-500 ring-1'
                : 'border-slate-200'
            "
            :disabled="item.isSection || !item.available"
            :style="{ paddingLeft: `${12 + Math.min(item.level, 4) * 12}px` }"
            @click="load(item.id)"
          >
            <i
              :class="item.isSection ? 'pi pi-folder' : 'pi pi-file'"
              class="shrink-0 text-chamilo-700"
              aria-hidden="true"
            />

            <span class="min-w-0 flex-1">
              <span class="block break-words font-medium text-slate-900">
                {{ item.title }}
              </span>
              <span class="mt-0.5 block text-xs capitalize text-slate-500">
                {{ item.available ? itemTypeLabel(item.itemType) : t("learningPaths.unavailable") }}
              </span>
            </span>

            <i
              v-if="!item.isSection && item.available"
              class="pi pi-chevron-right text-xs text-slate-400"
              aria-hidden="true"
            />
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
