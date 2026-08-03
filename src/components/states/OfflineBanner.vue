<script setup lang="ts">
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import { useAuthStore } from "@/stores/auth"
import { useConnectivityStore } from "@/stores/connectivity"
import { useOfflineSyncStore } from "@/stores/offlineSync"

const { t } = useI18n()
const authStore = useAuthStore()
const connectivityStore = useConnectivityStore()
const syncStore = useOfflineSyncStore()
const { pendingCount, issueCount } = storeToRefs(syncStore)

const visible = computed(
  () =>
    !connectivityStore.deviceOnline ||
    connectivityStore.campusReachability === "unreachable" ||
    authStore.isOfflineSession ||
    pendingCount.value > 0 ||
    issueCount.value > 0,
)

const message = computed(() => {
  if (!connectivityStore.deviceOnline) return t("connectivity.deviceOffline")
  if (connectivityStore.campusReachability === "unreachable") {
    return t("connectivity.campusUnavailable")
  }
  if (authStore.isOfflineSession) return t("connectivity.offlineSession")
  if (issueCount.value > 0) return t("connectivity.syncIssues", { count: issueCount.value })

  return t("connectivity.pendingSync", { count: pendingCount.value })
})
</script>

<template>
  <div
    v-if="visible"
    class="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    role="status"
    aria-live="polite"
  >
    <div class="mx-auto flex max-w-screen-sm items-center gap-3">
      <i class="pi pi-cloud" aria-hidden="true" />
      <span class="min-w-0 flex-1">{{ message }}</span>
      <RouterLink
        v-if="authStore.isAuthenticated"
        :to="{ name: 'offline-sync' }"
        class="shrink-0 rounded-lg px-2 py-1 font-semibold underline underline-offset-2"
      >
        {{ t("connectivity.review") }}
      </RouterLink>
    </div>
  </div>
</template>
