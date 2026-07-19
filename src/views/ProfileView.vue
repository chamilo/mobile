<script setup lang="ts">
import { computed, ref } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const campusStore = useCampusStore()
const { profile } = storeToRefs(authStore)
const { selectedCampus } = storeToRefs(campusStore)
const busy = ref(false)

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
