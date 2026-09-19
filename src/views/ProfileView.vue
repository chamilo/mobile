<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { getLanguageDisplayName, normalizeChamiloLocale } from "@/domain/i18n/locale"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  getBiometricUnlockStateForCampus,
  setBiometricUnlockForCampus,
  type BiometricUnlockState,
  type BiometricUnlockToggleResult,
} from "@/services/auth/createTokenStorage"
import {
  UserProfileApiService,
  UserProfileUpdateError,
  type UserProfileUpdateErrorCode,
} from "@/services/profile/UserProfileApiService"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useLocaleStore } from "@/stores/locale"
import { useOfflineSyncStore } from "@/stores/offlineSync"
import { usePushNotificationsStore } from "@/stores/pushNotifications"

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const localeStore = useLocaleStore()
const pushNotificationsStore = usePushNotificationsStore()
const offlineSyncStore = useOfflineSyncStore()
const { profile } = storeToRefs(authStore)
const { selectedCampus } = storeToRefs(campusStore)
const { languageCatalog } = storeToRefs(localeStore)
const {
  available: pushAvailable,
  status: pushStatus,
  errorCode: pushErrorCode,
  busy: pushBusy,
  canEnable: canEnablePush,
  canRetry: canRetryPush,
  canDisable: canDisablePush,
  preferenceEnabled: pushPreferenceEnabled,
} = storeToRefs(pushNotificationsStore)
const busy = ref(false)
const localeBusy = ref(false)
const localeErrorCode = ref<UserProfileUpdateErrorCode | null>(null)
const localeSaved = ref(false)
const selectedProfileLocale = ref("")
const biometricBusy = ref(false)
const biometricResult = ref<BiometricUnlockToggleResult | null>(null)
const biometricState = ref<BiometricUnlockState>({
  supportedPlatform: false,
  availability: "unsupported",
  enabled: false,
  rememberedSession: true,
})

const pushStatusMessage = computed(() => {
  if (pushStatus.value === "disabled") {
    return t("notifications.status.disabled")
  }

  if (pushErrorCode.value) {
    return t(`notifications.errors.${pushErrorCode.value}`)
  }

  return t(`notifications.status.${pushStatus.value}`)
})

const biometricStatusMessage = computed(() => {
  if (
    biometricResult.value === "cancelled" ||
    biometricResult.value === "error" ||
    biometricResult.value === "remember_me_required"
  ) {
    return t(`biometrics.status.${biometricResult.value}`)
  }

  if (
    biometricState.value.enabled &&
    biometricState.value.availability !== "available"
  ) {
    return t(`biometrics.availability.${biometricState.value.availability}`)
  }

  if (biometricState.value.enabled) {
    return t("biometrics.status.enabled")
  }

  if (!biometricState.value.rememberedSession) {
    return t("biometrics.status.remember_me_required")
  }

  if (biometricState.value.availability === "available") {
    return t("biometrics.status.disabled")
  }

  return t(`biometrics.availability.${biometricState.value.availability}`)
})

const canEnableBiometrics = computed(
  () =>
    biometricState.value.availability === "available" &&
    biometricState.value.rememberedSession &&
    !biometricState.value.enabled,
)

const initials = computed(() => {
  const name = profile.value?.fullName.trim() ?? ""
  const parts = name.split(/\s+/).filter(Boolean)

  if (parts.length > 1) {
    return `${parts[0]?.charAt(0) ?? ""}${parts[parts.length - 1]?.charAt(0) ?? ""}`.toUpperCase()
  }

  return name.slice(0, 2).toUpperCase()
})

const languageOptions = computed(() => {
  const values = [...languageCatalog.value.availableLocales]
  const currentLocale = normalizeChamiloLocale(profile.value?.locale)

  if (currentLocale && !values.some((value) => normalizeChamiloLocale(value) === currentLocale)) {
    values.push(currentLocale)
  }

  return values
    .map((value) => normalizeChamiloLocale(value))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .map((value) => ({
      value,
      label: getLanguageDisplayName(value, languageCatalog.value),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
})

const localeStatusMessage = computed(() => {
  if (localeErrorCode.value) return t(`profile.localeErrors.${localeErrorCode.value}`)
  if (localeSaved.value) return t("profile.localeUpdated")
  if (authStore.isOfflineSession) return t("profile.localeOffline")

  return null
})

watch(
  () => profile.value?.locale ?? "",
  (locale) => {
    selectedProfileLocale.value = normalizeChamiloLocale(locale)
  },
  { immediate: true },
)

async function updateProfileLocale(): Promise<void> {
  const campus = selectedCampus.value
  const currentProfile = profile.value
  const nextLocale = normalizeChamiloLocale(selectedProfileLocale.value)
  const currentLocale = normalizeChamiloLocale(currentProfile?.locale)

  localeSaved.value = false
  localeErrorCode.value = null

  if (!campus || !currentProfile || !nextLocale || nextLocale === currentLocale) {
    selectedProfileLocale.value = currentLocale
    return
  }

  localeBusy.value = true

  try {
    const service = new UserProfileApiService(createAuthenticatedHttpClient(campus))
    await service.updateLocale(currentProfile.id, nextLocale)
    await authStore.applyCurrentProfileLocale(nextLocale)
    localeStore.setUserLocale(nextLocale)
    selectedProfileLocale.value = nextLocale
    localeSaved.value = true
  } catch (error) {
    selectedProfileLocale.value = currentLocale
    localeErrorCode.value =
      error instanceof UserProfileUpdateError ? error.code : "server"
  } finally {
    localeBusy.value = false
  }
}

async function refreshBiometricState(): Promise<void> {
  const campusId = selectedCampus.value?.id

  if (!campusId) return

  biometricState.value = await getBiometricUnlockStateForCampus(campusId)
}

async function toggleBiometricUnlock(): Promise<void> {
  const campusId = selectedCampus.value?.id

  if (!campusId || biometricBusy.value) return

  biometricBusy.value = true
  biometricResult.value = null

  try {
    biometricResult.value = await setBiometricUnlockForCampus(
      campusId,
      !biometricState.value.enabled,
    )
    await refreshBiometricState()
  } finally {
    biometricBusy.value = false
  }
}

async function logout(): Promise<void> {
  busy.value = true
  await authStore.signOut()
  busy.value = false

  if (!authStore.isAuthenticated) {
    await router.replace({ name: "login" })
  }
}

onMounted(() => {
  void refreshBiometricState()

  if (selectedCampus.value && !authStore.isOfflineSession) {
    void localeStore.refreshCampusConfiguration(selectedCampus.value)
  }
})
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
          <dt>
            <label
              for="profile-locale"
              class="text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              {{ t("profile.locale") }}
            </label>
          </dt>
          <dd class="mt-2">
            <div class="relative">
              <select
                id="profile-locale"
                v-model="selectedProfileLocale"
                name="profileLocale"
                class="min-h-touch w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                :disabled="localeBusy || authStore.isOfflineSession || languageOptions.length === 0"
                :aria-describedby="localeStatusMessage ? 'profile-locale-status' : undefined"
                @change="updateProfileLocale"
              >
                <option
                  v-for="option in languageOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <i
                :class="localeBusy ? 'pi pi-spin pi-spinner' : 'pi pi-chevron-down'"
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
            </div>
            <p
              v-if="localeStatusMessage"
              id="profile-locale-status"
              class="mt-2 text-xs"
              :class="localeErrorCode ? 'text-red-700' : 'text-slate-500'"
              role="status"
              aria-live="polite"
            >
              {{ localeStatusMessage }}
            </p>
          </dd>
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
      v-if="biometricState.supportedPlatform"
      class="rounded-2xl bg-white p-5 shadow-sm"
      aria-labelledby="biometric-title"
    >
      <div class="flex items-start gap-3">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chamilo-100 text-chamilo-800"
          aria-hidden="true"
        >
          <i class="pi pi-shield text-lg" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 id="biometric-title" class="text-lg font-semibold text-slate-900">
            {{ t("biometrics.title") }}
          </h2>
          <p class="mt-1 text-sm leading-6 text-slate-600">
            {{ t("biometrics.description") }}
          </p>
          <p
            class="mt-3 text-sm font-medium text-slate-800"
            role="status"
            aria-live="polite"
          >
            {{ biometricStatusMessage }}
          </p>
        </div>
      </div>

      <button
        v-if="biometricState.enabled || biometricState.availability === 'available'"
        type="button"
        class="mt-4 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        :class="
          biometricState.enabled
            ? 'border border-slate-300 bg-white text-slate-800'
            : 'bg-chamilo-700 text-white'
        "
        :disabled="
          biometricBusy || (!biometricState.enabled && !canEnableBiometrics)
        "
        @click="toggleBiometricUnlock"
      >
        <i :class="biometricBusy ? 'pi pi-spin pi-spinner' : 'pi pi-shield'" aria-hidden="true" />
        {{
          biometricBusy
            ? biometricState.enabled
              ? t("biometrics.disabling")
              : t("biometrics.enabling")
            : biometricState.enabled
              ? t("biometrics.disable")
              : t("biometrics.enable")
        }}
      </button>
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

      <div class="mt-4 grid gap-2">
        <button
          v-if="canEnablePush || canRetryPush"
          type="button"
          class="flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
          :disabled="pushBusy"
          @click="pushNotificationsStore.enable"
        >
          <i :class="pushBusy ? 'pi pi-spin pi-spinner' : 'pi pi-bell'" aria-hidden="true" />
          {{ canRetryPush ? t("notifications.retry") : t("notifications.enable") }}
        </button>

        <button
          v-if="canDisablePush && pushPreferenceEnabled"
          type="button"
          class="flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 disabled:opacity-60"
          :disabled="pushBusy"
          @click="pushNotificationsStore.disable"
        >
          <i
            :class="
              pushBusy && pushStatus === 'disabling' ? 'pi pi-spin pi-spinner' : 'pi pi-bell-slash'
            "
            aria-hidden="true"
          />
          {{
            pushBusy && pushStatus === "disabling"
              ? t("notifications.disabling")
              : t("notifications.disable")
          }}
        </button>
      </div>
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
