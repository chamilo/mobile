<script setup lang="ts">
import { computed, ref } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useOfflineSyncStore } from "@/stores/offlineSync"
import { usePushNotificationsStore } from "@/stores/pushNotifications"

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const pushNotificationsStore = usePushNotificationsStore()
const offlineSyncStore = useOfflineSyncStore()
const { profile } = storeToRefs(authStore)
const { selectedCampus } = storeToRefs(campusStore)
const {
  available: pushAvailable,
  status: pushStatus,
  errorCode: pushErrorCode,
  busy: pushBusy,
  canEnable: canEnablePush,
} = storeToRefs(pushNotificationsStore)
const busy = ref(false)

const pushStatusMessage = computed(() => {
  if (pushErrorCode.value) {
    return t(`notifications.errors.${pushErrorCode.value}`)
  }

  return t(`notifications.status.${pushStatus.value}`)
})

const initials = computed(() => {
  const name = profile.value?.fullName.trim() ?? ""
  const parts = name.split(/\s+/).filter(Boolean)

  if (parts.length > 1) {
    return `${parts[0]?.charAt(0) ?? ""}${parts[parts.length - 1]?.charAt(0) ?? ""}`.toUpperCase()
  }

  return name.slice(0, 2).toUpperCase()
})

async function logout(): Promise<void> {
  busy.value = true
  await authStore.signOut()
  busy.value = false

  if (!authStore.isAuthenticated) {
    await router.replace({ name: "login" })
  }
}
</script>

<template>
  <div v-if="profile" class="space-y-5">
    <section class="rounded-2xl bg-chamilo-900 p-5 text-white shadow-sm">
      <div class="flex items-center gap-4">
        <div
          class="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-semibold"
          aria-hidden="true"
        >
          {{ initials }}
        </div>
        <div class="min-w-0">
          <h2 class="truncate text-xl font-semibold">{{ profile.fullName }}</h2>
          <p class="truncate text-sm text-chamilo-100">@{{ profile.username }}</p>
          <p class="mt-1 truncate text-sm text-chamilo-100">{{ selectedCampus?.displayName }}</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="account-title">
      <h2 id="account-title" class="text-lg font-semibold text-slate-900">
        {{ t("profile.accountTitle") }}
      </h2>

      <dl class="mt-4 divide-y divide-slate-100">
        <div class="py-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
            {{ t("profile.email") }}
          </dt>
          <dd class="mt-1 break-all text-sm text-slate-900">{{ profile.email }}</dd>
        </div>
        <div class="py-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
            {{ t("profile.locale") }}
          </dt>
          <dd class="mt-1 text-sm text-slate-900">{{ profile.locale }}</dd>
        </div>
        <div class="py-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
            {{ t("profile.timezone") }}
          </dt>
          <dd class="mt-1 text-sm text-slate-900">{{ profile.timezone }}</dd>
        </div>
      </dl>
    </section>

    <section
      v-if="pushAvailable"
      class="rounded-2xl bg-white p-5 shadow-sm"
      aria-labelledby="notifications-title"
    >
      <div class="flex items-start gap-3">
        <div
          class="text-chamilo-800 flex size-11 shrink-0 items-center justify-center rounded-xl bg-chamilo-100"
          aria-hidden="true"
        >
          <i class="pi pi-bell text-lg" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 id="notifications-title" class="text-lg font-semibold text-slate-900">
            {{ t("notifications.title") }}
          </h2>
          <p class="mt-1 text-sm leading-6 text-slate-600">
            {{ t("notifications.description") }}
          </p>
          <p
            class="mt-3 text-sm font-medium"
            :class="pushErrorCode ? 'text-red-700' : 'text-slate-800'"
            role="status"
            aria-live="polite"
          >
            {{ pushStatusMessage }}
          </p>
        </div>
      </div>

      <button
        v-if="canEnablePush"
        type="button"
        class="mt-4 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
        :disabled="pushBusy"
        @click="pushNotificationsStore.enable"
      >
        <i :class="pushBusy ? 'pi pi-spin pi-spinner' : 'pi pi-bell'" aria-hidden="true" />
        {{ pushErrorCode ? t("notifications.retry") : t("notifications.enable") }}
      </button>
    </section>

    <RouterLink
      :to="{ name: 'offline-sync' }"
      class="flex min-h-touch w-full items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm"
    >
      <span class="flex items-center gap-3">
        <span
          class="text-chamilo-800 flex size-11 items-center justify-center rounded-xl bg-chamilo-100"
          aria-hidden="true"
        >
          <i class="pi pi-cloud-upload text-lg" />
        </span>
        <span class="text-left">
          <span class="block font-semibold text-slate-900">{{ t("offlineSync.title") }}</span>
          <span class="mt-1 block text-sm text-slate-600">
            {{
              t("profile.offlineSummary", {
                pending: offlineSyncStore.pendingCount,
                issues: offlineSyncStore.issueCount,
              })
            }}
          </span>
          <span
            v-if="authStore.isOfflineSession"
            class="mt-1 block text-xs font-semibold text-amber-700"
          >
            {{ t("profile.offlineSession") }}
          </span>
        </span>
      </span>
      <i class="pi pi-chevron-right text-slate-400" aria-hidden="true" />
    </RouterLink>

    <RouterLink
      :to="{ name: 'campuses' }"
      class="flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800"
    >
      <i class="pi pi-building" aria-hidden="true" />
      {{ t("profile.switchCampus") }}
    </RouterLink>

    <button
      type="button"
      class="flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-800 disabled:opacity-60"
      :disabled="busy"
      @click="logout"
    >
      <i :class="busy ? 'pi pi-spin pi-spinner' : 'pi pi-sign-out'" aria-hidden="true" />
      {{ busy ? t("profile.signingOut") : t("profile.signOut") }}
    </button>
  </div>
</template>
