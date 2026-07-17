<script setup lang="ts">
import { computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import CourseUnavailableState from "@/components/courseHome/CourseUnavailableState.vue"
import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import {
  buildCourseRoute,
  parseCourseRouteContext,
  CourseRouteContextError,
} from "@/domain/courses/routeContext"
import type { CourseLink } from "@/domain/links/types"
import { useCourseLinksStore } from "@/stores/courseLinks"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const store = useCourseLinksStore()
const { status, snapshot, errorCode, openErrorCode } = storeToRefs(store)

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const errorDescription = computed(() => t(`courseLinks.errors.${errorCode.value ?? "server"}`))
const openErrorDescription = computed(() =>
  t(`courseLinks.errors.${openErrorCode.value ?? "open_failed"}`),
)

function hostname(link: CourseLink): string {
  return new URL(link.url).hostname
}

function open(link: CourseLink): void {
  store.openLink(link)
}

async function load(): Promise<void> {
  if (context.value) await store.load(context.value)
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
      {{ t("courseLinks.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("courseLinks.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("courseLinks.title") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t("courseLinks.description") }}
      </p>
    </section>

    <LoadingState
      v-if="status === 'loading' || status === 'idle'"
      :label="t('courseLinks.loading')"
    />

    <ErrorState
      v-else-if="status === 'error'"
      :title="t('courseLinks.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else-if="snapshot">
      <div
        v-if="openErrorCode"
        class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        role="alert"
      >
        {{ openErrorDescription }}
      </div>

      <section v-for="category in snapshot.categories" :key="category.iid" class="space-y-3">
        <div class="px-1">
          <h2 class="text-base font-semibold text-slate-900">
            {{ category.title }}
          </h2>
          <p v-if="category.description" class="mt-1 text-sm text-slate-600">
            {{ category.description }}
          </p>
        </div>

        <ul v-if="category.links.length" class="space-y-3">
          <li v-for="link in category.links" :key="link.iid">
            <button
              type="button"
              class="flex min-h-touch w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm"
              @click="open(link)"
            >
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chamilo-50 text-lg text-chamilo-700"
              >
                <i class="pi pi-external-link" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block break-words font-semibold text-slate-900">
                  {{ link.title }}
                </span>
                <span v-if="link.description" class="mt-1 block text-sm text-slate-600">
                  {{ link.description }}
                </span>
                <span class="mt-1 block truncate text-xs text-slate-500">
                  {{ hostname(link) }}
                </span>
              </span>
              <i class="pi pi-arrow-up-right shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          </li>
        </ul>

        <p
          v-else
          class="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500"
        >
          {{ t("courseLinks.emptyCategory") }}
        </p>
      </section>

      <section v-if="snapshot.uncategorized.length" class="space-y-3">
        <h2 v-if="snapshot.categories.length" class="px-1 text-base font-semibold text-slate-900">
          {{ t("courseLinks.otherLinks") }}
        </h2>

        <ul class="space-y-3">
          <li v-for="link in snapshot.uncategorized" :key="link.iid">
            <button
              type="button"
              class="flex min-h-touch w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm"
              @click="open(link)"
            >
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chamilo-50 text-lg text-chamilo-700"
              >
                <i class="pi pi-external-link" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block break-words font-semibold text-slate-900">
                  {{ link.title }}
                </span>
                <span v-if="link.description" class="mt-1 block text-sm text-slate-600">
                  {{ link.description }}
                </span>
                <span class="mt-1 block truncate text-xs text-slate-500">
                  {{ hostname(link) }}
                </span>
              </span>
              <i class="pi pi-arrow-up-right shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </section>

      <EmptyState
        v-if="snapshot.totalItems === 0"
        :title="t('courseLinks.emptyTitle')"
        :description="t('courseLinks.emptyDescription')"
      />
    </template>
  </div>
</template>
