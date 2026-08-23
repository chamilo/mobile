<script setup lang="ts">
import { computed, reactive, watch } from "vue"
import { useI18n } from "vue-i18n"

import {
  CampusValidationError,
  normalizeCampusProfileInput,
  type CampusValidationErrorCode,
} from "@/domain/campus/normalizeCampusUrl"
import type { CampusProfile, CampusProfileInput } from "@/domain/campus/types"

const props = defineProps<{
  campus?: CampusProfile | null
  busy?: boolean
}>()

const emit = defineEmits<{
  submit: [input: CampusProfileInput]
  cancel: []
}>()

const { t } = useI18n()

const form = reactive({
  displayName: "",
  baseUrl: "",
  allowInsecureHttp: false,
})

const validationCode = reactive<{
  displayName: CampusValidationErrorCode | null
  baseUrl: CampusValidationErrorCode | null
}>({
  displayName: null,
  baseUrl: null,
})

const isEditing = computed(() => Boolean(props.campus))
const isDevelopment = import.meta.env.DEV
const protocolPrefix = computed(() =>
  isDevelopment && form.allowInsecureHttp ? "http://" : "https://",
)

function stripProtocol(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "")
}

function resetForm(): void {
  form.displayName = props.campus?.displayName ?? ""
  form.baseUrl = stripProtocol(props.campus?.baseUrl ?? "")
  form.allowInsecureHttp = props.campus?.allowInsecureHttp ?? false
  validationCode.displayName = null
  validationCode.baseUrl = null
}

watch(() => props.campus, resetForm, { immediate: true })

function getValidationMessage(code: CampusValidationErrorCode | null): string | null {
  return code ? t(`campus.validation.${code}`) : null
}

function submit(): void {
  validationCode.displayName = null
  validationCode.baseUrl = null

  try {
    const input = normalizeCampusProfileInput({
      displayName: form.displayName,
      baseUrl: `${protocolPrefix.value}${stripProtocol(form.baseUrl)}`,
      allowInsecureHttp: form.allowInsecureHttp,
    })
    emit("submit", input)

    if (!isEditing.value) {
      resetForm()
    }
  } catch (error) {
    if (!(error instanceof CampusValidationError)) {
      throw error
    }

    if (error.code.startsWith("display_name")) {
      validationCode.displayName = error.code
    } else {
      validationCode.baseUrl = error.code
    }
  }
}
</script>

<template>
  <form class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" @submit.prevent="submit">
    <div class="flex items-start gap-3">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-chamilo-50 text-chamilo-700"
        aria-hidden="true"
      >
        <i class="pi pi-building" />
      </div>
      <div>
        <h2 class="text-lg font-semibold text-slate-900">
          {{ isEditing ? t("campus.form.editTitle") : t("campus.form.addTitle") }}
        </h2>
        <p class="mt-1 text-sm text-slate-600">{{ t("campus.form.description") }}</p>
      </div>
    </div>

    <div class="mt-5 space-y-4">
      <div>
        <label for="campus-name" class="text-sm font-medium text-slate-800">
          {{ t("campus.form.name") }}
        </label>
        <input
          id="campus-name"
          v-model="form.displayName"
          name="campusName"
          type="text"
          autocomplete="organization"
          maxlength="80"
          class="mt-2 min-h-touch w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
          :aria-invalid="Boolean(validationCode.displayName)"
          :aria-describedby="validationCode.displayName ? 'campus-name-error' : undefined"
        />
        <p
          v-if="validationCode.displayName"
          id="campus-name-error"
          class="mt-2 text-sm text-red-700"
          role="alert"
        >
          {{ getValidationMessage(validationCode.displayName) }}
        </p>
      </div>

      <div>
        <label for="campus-url" class="text-sm font-medium text-slate-800">
          {{ t("campus.form.url") }}
        </label>
        <div
          class="mt-2 flex min-h-touch overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-chamilo-600 focus-within:ring-2 focus-within:ring-chamilo-100"
        >
          <span
            class="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-base font-medium text-slate-600"
            aria-hidden="true"
          >
            {{ protocolPrefix }}
          </span>
          <input
            id="campus-url"
            v-model="form.baseUrl"
            name="campusUrl"
            type="text"
            inputmode="url"
            autocomplete="url"
            placeholder="campus.example.org"
            class="min-w-0 flex-1 border-0 bg-white px-3 py-2 text-base text-slate-900 outline-none"
            :aria-invalid="Boolean(validationCode.baseUrl)"
            :aria-describedby="validationCode.baseUrl ? 'campus-url-error' : 'campus-url-help'"
          />
        </div>
        <p id="campus-url-help" class="mt-2 text-sm text-slate-500">
          {{ t("campus.form.urlPrefixHelp") }}
        </p>
        <p
          v-if="validationCode.baseUrl"
          id="campus-url-error"
          class="mt-2 text-sm text-red-700"
          role="alert"
        >
          {{ getValidationMessage(validationCode.baseUrl) }}
        </p>
      </div>

      <label
        v-if="isDevelopment"
        class="flex min-h-touch cursor-pointer items-start gap-3 rounded-xl bg-slate-50 px-3 py-3"
      >
        <input
          v-model="form.allowInsecureHttp"
          name="allowInsecureHttp"
          type="checkbox"
          class="mt-1 size-5 shrink-0"
        />
        <span>
          <span class="block text-sm font-medium text-slate-800">
            {{ t("campus.form.allowHttp") }}
          </span>
          <span class="mt-1 block text-xs leading-5 text-slate-500">
            {{ t("campus.form.allowHttpHelp") }}
          </span>
        </span>
      </label>
    </div>

    <div class="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        v-if="isEditing"
        type="button"
        class="min-h-touch rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700"
        @click="emit('cancel')"
      >
        {{ t("actions.cancel") }}
      </button>
      <button
        type="submit"
        class="min-h-touch rounded-xl bg-chamilo-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="busy"
      >
        {{ isEditing ? t("actions.saveChanges") : t("actions.addCampus") }}
      </button>
    </div>
  </form>
</template>
