<script setup lang="ts">
import { computed } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

import LoginForm from "@/components/auth/LoginForm.vue"
import type { AuthCredentials } from "@/domain/auth/types"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const campusStore = useCampusStore()
const authStore = useAuthStore()
const { selectedCampus } = storeToRefs(campusStore)
const { status, errorCode } = storeToRefs(authStore)

const busy = computed(() => status.value === "authenticating" || status.value === "restoring")
const errorMessage = computed(() => (errorCode.value ? t(`auth.errors.${errorCode.value}`) : null))

function getSafeRedirect(): string | null {
  const redirect = route.query.redirect

  return typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")
    ? redirect
    : null
}

async function signIn(credentials: AuthCredentials): Promise<void> {
  const authenticated = await authStore.signIn(credentials)

  if (!authenticated) {
    return
  }

  await router.replace(getSafeRedirect() ?? { name: "courses" })
}
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-2xl bg-white p-5 shadow-sm">
      <div class="flex items-start gap-3">
        <div
          class="text-chamilo-800 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-chamilo-100 text-xl"
        >
          <i class="pi pi-building" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-slate-500">{{ t("auth.campusLabel") }}</p>
          <h2 class="truncate text-lg font-semibold text-slate-900">
            {{ selectedCampus?.displayName }}
          </h2>
          <p class="truncate text-sm text-slate-600">{{ selectedCampus?.baseUrl }}</p>
        </div>
      </div>

      <RouterLink
        :to="{ name: 'campuses' }"
        class="mt-4 inline-flex min-h-touch items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-chamilo-700"
      >
        <i class="pi pi-arrow-left" aria-hidden="true" />
        {{ t("auth.chooseAnotherCampus") }}
      </RouterLink>
    </section>

    <section class="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="login-title">
      <p class="text-sm font-medium text-chamilo-700">{{ t("auth.eyebrow") }}</p>
      <h2 id="login-title" class="mt-1 text-2xl font-semibold text-slate-900">
        {{ t("auth.title") }}
      </h2>
      <p class="mt-2 text-sm leading-6 text-slate-600">{{ t("auth.description") }}</p>

      <div class="mt-5">
        <LoginForm :busy="busy" :error-message="errorMessage" @submit="signIn" />
      </div>
    </section>

    <p class="px-2 text-center text-xs leading-5 text-slate-500">
      {{ t("auth.passwordNotice") }}
    </p>
  </div>
</template>
