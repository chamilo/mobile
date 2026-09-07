<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"

import type { AuthCredentials } from "@/domain/auth/types"

const props = defineProps<{
  busy: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  submit: [credentials: AuthCredentials, rememberMe: boolean]
}>()

const { t } = useI18n()
const username = ref("")
const password = ref("")
const rememberMe = ref(true)
const validationError = ref<string | null>(null)

function submit(): void {
  const normalizedUsername = username.value.trim()

  if (!normalizedUsername) {
    validationError.value = t("auth.validation.usernameRequired")

    return
  }

  if (!password.value) {
    validationError.value = t("auth.validation.passwordRequired")

    return
  }

  validationError.value = null
  const credentials: AuthCredentials = {
    username: normalizedUsername,
    password: password.value,
  }

  const persistSession = rememberMe.value
  password.value = ""
  emit("submit", credentials, persistSession)
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="submit">
    <div>
      <label for="username" class="text-sm font-medium text-slate-800">
        {{ t("auth.form.username") }}
      </label>
      <input
        id="username"
        v-model="username"
        name="username"
        type="text"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        :disabled="props.busy"
        class="focus:ring-chamilo-200 mt-2 min-h-touch w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-chamilo-600 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </div>

    <div>
      <label for="password" class="text-sm font-medium text-slate-800">
        {{ t("auth.form.password") }}
      </label>
      <input
        id="password"
        v-model="password"
        name="password"
        type="password"
        autocomplete="current-password"
        :disabled="props.busy"
        class="focus:ring-chamilo-200 mt-2 min-h-touch w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-chamilo-600 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </div>

    <label
      class="flex min-h-touch cursor-pointer items-center gap-3 rounded-xl px-1 py-1 text-sm text-slate-700"
    >
      <input
        v-model="rememberMe"
        name="rememberMe"
        type="checkbox"
        class="size-5 rounded border-slate-300 text-chamilo-700 focus:ring-2 focus:ring-chamilo-200"
        :disabled="props.busy"
      />
      <span>{{ t("auth.form.rememberMe") }}</span>
    </label>

    <div
      v-if="validationError || props.errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
      role="alert"
      aria-live="assertive"
    >
      {{ validationError ?? props.errorMessage }}
    </div>

    <button
      type="submit"
      class="hover:bg-chamilo-800 flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="props.busy"
    >
      <i v-if="props.busy" class="pi pi-spin pi-spinner" aria-hidden="true" />
      <i v-else class="pi pi-sign-in" aria-hidden="true" />
      {{ props.busy ? t("auth.form.signingIn") : t("auth.form.submit") }}
    </button>
  </form>
</template>
