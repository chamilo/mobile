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
import { documentIcon, formatDocumentSize } from "@/domain/documents/presentation"
import type { CourseDocument } from "@/domain/documents/types"
import { useDocumentsStore } from "@/stores/documents"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const store = useDocumentsStore()
const { status, deliveryStatus, visibleItems, breadcrumbs, errorCode, deliveryErrorCode } =
  storeToRefs(store)

const context = computed(() => {
  try {
    return parseCourseRouteContext(props)
  } catch (error) {
    if (error instanceof CourseRouteContextError) return null
    throw error
  }
})

const errorDescription = computed(() => t(`documents.errors.${errorCode.value ?? "server"}`))
const deliveryErrorDescription = computed(() =>
  t(`documents.errors.${deliveryErrorCode.value ?? "server"}`),
)

function secondaryLabel(item: CourseDocument): string {
  if (item.filetype === "folder") return t("documents.folder")

  const parts = [item.file.mimeType, formatDocumentSize(item.file.size)].filter(
    (part): part is string => Boolean(part),
  )

  return parts.join(" · ") || t("documents.file")
}

async function activate(item: CourseDocument): Promise<void> {
  if (item.filetype === "folder") {
    store.openFolder(item)
    return
  }

  if (context.value) {
    await store.openDocument(context.value, item)
  }
}

async function download(item: CourseDocument): Promise<void> {
  if (context.value) {
    await store.downloadDocument(context.value, item)
  }
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
      {{ t("documents.backToCourse") }}
    </RouterLink>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("documents.eyebrow") }}
      </p>
      <h1 class="mt-1 text-xl font-semibold text-slate-900">
        {{ t("documents.title") }}
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ t("documents.description") }}
      </p>
    </section>

    <LoadingState
      v-if="status === 'loading' || status === 'idle'"
      :label="t('documents.loading')"
    />

    <ErrorState
      v-else-if="status === 'error'"
      :title="t('documents.errorTitle')"
      :description="errorDescription"
      :retry-label="t('actions.retry')"
      @retry="load"
    />

    <template v-else>
      <nav
        class="flex flex-wrap items-center gap-1 rounded-2xl bg-white p-3 text-sm shadow-sm"
        :aria-label="t('documents.breadcrumbLabel')"
      >
        <template v-for="(breadcrumb, index) in breadcrumbs" :key="`${breadcrumb.nodeId}-${index}`">
          <i v-if="index > 0" class="pi pi-angle-right text-slate-400" aria-hidden="true" />
          <button
            type="button"
            class="min-h-touch rounded-lg px-2 font-semibold text-chamilo-700 disabled:text-slate-700"
            :disabled="index === breadcrumbs.length - 1"
            @click="store.navigateTo(breadcrumb.nodeId)"
          >
            {{ index === 0 ? t("documents.title") : breadcrumb.title }}
          </button>
        </template>
      </nav>

      <div
        v-if="deliveryErrorCode"
        class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        role="alert"
      >
        {{ deliveryErrorDescription }}
      </div>

      <ul v-if="visibleItems.length" class="space-y-3">
        <li
          v-for="item in visibleItems"
          :key="item.iid"
          class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded-xl text-left"
              :disabled="deliveryStatus === 'loading'"
              @click="activate(item)"
            >
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chamilo-50 text-lg text-chamilo-700"
              >
                <i :class="documentIcon(item)" aria-hidden="true" />
              </span>
              <span class="min-w-0">
                <span class="block break-words font-semibold text-slate-900">
                  {{ item.title }}
                </span>
                <span class="mt-1 block text-xs text-slate-500">
                  {{ secondaryLabel(item) }}
                </span>
              </span>
            </button>

            <button
              v-if="item.filetype !== 'folder' && item.downloadUrl"
              type="button"
              class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50"
              :aria-label="t('documents.downloadNamed', { title: item.title })"
              :disabled="deliveryStatus === 'loading'"
              @click="download(item)"
            >
              <i class="pi pi-download" aria-hidden="true" />
            </button>

            <i
              v-if="item.filetype === 'folder'"
              class="pi pi-angle-right shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </div>
        </li>
      </ul>

      <EmptyState
        v-else
        :title="t('documents.emptyTitle')"
        :description="t('documents.emptyDescription')"
      />
    </template>

    <p
      v-if="deliveryStatus === 'loading'"
      class="fixed inset-x-4 bottom-20 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg"
      role="status"
    >
      {{ t("documents.preparing") }}
    </p>
  </div>
</template>
