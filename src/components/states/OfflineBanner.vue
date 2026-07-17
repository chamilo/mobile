<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import { useConnectivityStore } from "@/stores/connectivity"

const { t } = useI18n()
const connectivityStore = useConnectivityStore()
const { isOnline } = storeToRefs(connectivityStore)
</script>

<template>
  <div
    v-if="!isOnline"
    class="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    role="status"
    aria-live="polite"
  >
    <div class="mx-auto flex max-w-screen-sm items-center gap-3">
      <i class="pi pi-wifi" aria-hidden="true" />
      <span>{{ t("connectivity.offline") }}</span>
    </div>
  </div>
</template>
