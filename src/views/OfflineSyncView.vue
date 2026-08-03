<script setup lang="ts">
import { computed, onMounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import { buildCourseOfflineSetupRoute } from "@/domain/courses/routeContext"
import type {
  LearningPathRegularSyncPayload,
  OfflineHttpWritePayload,
  OfflineOperation,
  OfflineOperationState,
} from "@/domain/offline/types"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"
import { useOfflineCoursePacksStore } from "@/stores/offlineCoursePacks"
import { useOfflineSyncStore } from "@/stores/offlineSync"

const { t } = useI18n()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const connectivityStore = useConnectivityStore()
const syncStore = useOfflineSyncStore()
const packsStore = useOfflineCoursePacksStore()
const { operations, pendingCount, issueCount, lastSyncedAt, errorCode, isSyncing } =
  storeToRefs(syncStore)
const {
  manifests,
  storage,
  accountData,
  isPreparingAccountData,
  errorCode: packsErrorCode,
} = storeToRefs(packsStore)

const connectionLabel = computed(() => {
  if (!connectivityStore.deviceOnline) return t("offlineSync.connection.deviceOffline")
  if (connectivityStore.campusReachability === "unreachable") {
    return t("offlineSync.connection.campusUnavailable")
  }
  if (connectivityStore.campusReachability === "reachable") {
    return t("offlineSync.connection.campusReachable")
  }

  return t("offlineSync.connection.checkPending")
})

const connectionClass = computed(() => {
  if (!connectivityStore.deviceOnline || connectivityStore.campusReachability === "unreachable") {
    return "border-amber-200 bg-amber-50 text-amber-900"
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-900"
})

function operationLabel(operation: OfflineOperation): string {
  if (operation.type === "http_write") {
    const payload = operation.payload as OfflineHttpWritePayload
    return t(`offlineSync.operationTypes.${payload.category}`)
  }

  return t(`offlineSync.operationTypes.${operation.type}`)
}

function operationDescription(operation: OfflineOperation): string {
  if (operation.type === "http_write") {
    return (operation.payload as OfflineHttpWritePayload).description
  }

  const payload = operation.payload as LearningPathRegularSyncPayload
  return t("offlineSync.learningPathContext", {
    course: payload.context.courseId,
    learningPath: payload.learningPathId,
    item: payload.itemId,
  })
}

function stateClass(state: OfflineOperationState): string {
  switch (state) {
    case "pending":
    case "retryable":
      return "bg-amber-100 text-amber-900"
    case "syncing":
      return "bg-sky-100 text-sky-900"
    case "requires_login":
    case "unknown_delivery":
    case "conflict":
    case "failed_permanent":
      return "bg-red-100 text-red-900"
  }
}

function canRetry(state: OfflineOperationState): boolean {
  return state !== "pending" && state !== "retryable" && state !== "syncing"
}

function formatDate(value: string | null): string {
  if (!value) return t("offlineSync.never")

  return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  )
}

function formatBytes(value: number | null): string {
  if (value === null) return t("offlineCourse.unknown")
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`

  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}

onMounted(async () => {
  const campus = campusStore.selectedCampus
  const profile = authStore.profile

  if (campus && profile) {
    await Promise.all([syncStore.activateSession(campus, profile.id), packsStore.refresh()])
  }
})
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-2xl bg-white p-5 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("offlineSync.eyebrow") }}
      </p>
      <h2 class="mt-1 text-xl font-semibold text-slate-900">{{ t("offlineSync.title") }}</h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">{{ t("offlineSync.description") }}</p>
    </section>

    <section class="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="connection-title">
      <h2 id="connection-title" class="text-lg font-semibold text-slate-900">
        {{ t("offlineSync.connection.title") }}
      </h2>
      <div class="mt-3 rounded-xl border p-3 text-sm" :class="connectionClass" role="status">
        <div class="flex items-center gap-2">
          <i
            :class="connectivityStore.deviceOnline ? 'pi pi-wifi' : 'pi pi-wifi-off'"
            aria-hidden="true"
          />
          <span class="font-semibold">{{ connectionLabel }}</span>
        </div>
      </div>
      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div class="rounded-xl bg-slate-50 p-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
            {{ t("offlineSync.pending") }}
          </dt>
          <dd class="mt-1 text-xl font-semibold text-slate-900">{{ pendingCount }}</dd>
        </div>
        <div class="rounded-xl bg-slate-50 p-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
            {{ t("offlineSync.issues") }}
          </dt>
          <dd class="mt-1 text-xl font-semibold text-slate-900">{{ issueCount }}</dd>
        </div>
      </dl>
      <p class="mt-3 text-xs text-slate-500">
        {{ t("offlineSync.lastSync", { date: formatDate(lastSyncedAt) }) }}
      </p>

      <button
        type="button"
        class="mt-4 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
        :disabled="isSyncing || !connectivityStore.deviceOnline || pendingCount === 0"
        @click="syncStore.syncNow('manual')"
      >
        <i :class="isSyncing ? 'pi pi-spin pi-spinner' : 'pi pi-sync'" aria-hidden="true" />
        {{ isSyncing ? t("offlineSync.syncing") : t("offlineSync.syncNow") }}
      </button>

      <p v-if="errorCode" class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
        {{ t(`offlineSync.errors.${errorCode}`) }}
      </p>
    </section>

    <section class="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="offline-downloads-title">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="offline-downloads-title" class="text-lg font-semibold text-slate-900">
            {{ t("offlineSync.downloadsTitle") }}
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ t("offlineSync.downloadsDescription") }}
          </p>
        </div>
        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
          {{ manifests.length }}
        </span>
      </div>

      <div v-if="manifests.length" class="mt-4 space-y-3">
        <RouterLink
          v-for="manifest in manifests"
          :key="manifest.courseKey"
          :to="buildCourseOfflineSetupRoute(manifest.context)"
          class="flex min-h-touch items-center gap-3 rounded-xl border border-slate-200 p-3"
        >
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"
          >
            <i class="pi pi-check-circle" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold text-slate-900">{{
              manifest.courseTitle
            }}</span>
            <span class="mt-1 block text-xs text-slate-500">
              {{
                t("offlineSync.downloadSummary", {
                  resources: manifest.resourceCount,
                  size: formatBytes(manifest.downloadedBytes),
                })
              }}
            </span>
          </span>
          <i class="pi pi-chevron-right text-slate-400" aria-hidden="true" />
        </RouterLink>
      </div>

      <div v-else class="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <p class="font-semibold text-slate-800">{{ t("offlineSync.noDownloadsTitle") }}</p>
        <p class="mt-1">{{ t("offlineSync.noDownloadsDescription") }}</p>
      </div>

      <p class="mt-3 text-xs text-slate-500">
        {{
          t("offlineSync.storageUsage", {
            usage: formatBytes(storage.usage),
            quota: formatBytes(storage.quota),
          })
        }}
      </p>
    </section>

    <section class="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="offline-account-title">
      <h2 id="offline-account-title" class="text-lg font-semibold text-slate-900">
        {{ t("offlineSync.accountDataTitle") }}
      </h2>
      <p class="mt-1 text-sm text-slate-600">
        {{ t("offlineSync.accountDataDescription") }}
      </p>
      <p v-if="accountData" class="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
        {{
          t("offlineSync.accountDataReady", {
            count: accountData.messageCount,
            date: formatDate(accountData.preparedAt),
          })
        }}
      </p>
      <button
        type="button"
        class="border-chamilo-300 text-chamilo-800 mt-4 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border px-4 font-semibold disabled:opacity-50"
        :disabled="isPreparingAccountData || !connectivityStore.deviceOnline"
        @click="packsStore.prepareAccountData"
      >
        <i
          :class="isPreparingAccountData ? 'pi pi-spin pi-spinner' : 'pi pi-download'"
          aria-hidden="true"
        />
        {{
          isPreparingAccountData
            ? t("offlineSync.preparingAccountData")
            : t("offlineSync.prepareAccountData")
        }}
      </button>
      <p
        v-if="packsErrorCode"
        class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
        role="alert"
      >
        {{ t(`offlineCourse.errors.${packsErrorCode}`) }}
      </p>
    </section>

    <section class="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="outbox-title">
      <div class="flex items-center justify-between gap-3">
        <h2 id="outbox-title" class="text-lg font-semibold text-slate-900">
          {{ t("offlineSync.outboxTitle") }}
        </h2>
        <button
          type="button"
          class="flex min-h-touch min-w-touch items-center justify-center rounded-xl text-chamilo-700"
          :aria-label="t('offlineSync.refresh')"
          @click="syncStore.refresh"
        >
          <i class="pi pi-refresh" aria-hidden="true" />
        </button>
      </div>

      <div
        v-if="operations.length === 0"
        class="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"
      >
        <p class="font-semibold text-slate-800">{{ t("offlineSync.emptyTitle") }}</p>
        <p class="mt-1">{{ t("offlineSync.emptyDescription") }}</p>
      </div>

      <ul v-else class="mt-4 space-y-3">
        <li
          v-for="operation in operations"
          :key="operation.id"
          class="rounded-xl border border-slate-200 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-slate-900">
                {{ operationLabel(operation) }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                {{ operationDescription(operation) }}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="stateClass(operation.state)"
            >
              {{ t(`offlineSync.states.${operation.state}`) }}
            </span>
          </div>

          <p v-if="operation.errorCode" class="mt-2 text-xs text-red-700">
            {{ t("offlineSync.operationError", { code: operation.errorCode }) }}
          </p>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <button
              v-if="canRetry(operation.state)"
              type="button"
              class="border-chamilo-300 text-chamilo-800 min-h-touch rounded-xl border px-3 text-sm font-semibold"
              @click="syncStore.retryOperation(operation.id)"
            >
              {{ t("offlineSync.retry") }}
            </button>
            <button
              type="button"
              class="min-h-touch rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-800"
              :class="canRetry(operation.state) ? '' : 'col-span-2'"
              @click="syncStore.discardOperation(operation.id)"
            >
              {{ t("offlineSync.discard") }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section class="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
      <h2 class="font-semibold">{{ t("offlineSync.currentScopeTitle") }}</h2>
      <p class="mt-1 leading-6">{{ t("offlineSync.currentScopeDescription") }}</p>
    </section>
  </div>
</template>
