<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import {
  isSupportedOfficeAnswerFile,
  matchesOfficeAnswerTemplate,
  officeAnswerAccept,
} from "@/domain/exercises/officeAnswer"
import type { ExerciseAttemptFile, ExerciseQuestion } from "@/domain/exercises/types"

const props = defineProps<{
  question: ExerciseQuestion
  files: ExerciseAttemptFile[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  "file-selected": [file: File | null]
  prepare: []
  "open-file": [file: ExerciseAttemptFile]
}>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const validationError = ref("")
const templateName = computed(() => props.question.onlyoffice?.templateName?.trim() ?? "")
const accept = computed(() => officeAnswerAccept(templateName.value))
const prepared = computed(() => props.files.length > 0)

function selectFile(file: File | null): void {
  selectedFile.value = file
  emit("file-selected", file)
}

function clearSelectedFile(): void {
  validationError.value = ""
  if (fileInput.value) fileInput.value.value = ""
  selectFile(null)
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  validationError.value = ""

  if (!file) {
    selectFile(null)
    return
  }

  if (!isSupportedOfficeAnswerFile(file.name)) {
    validationError.value = t("exercises.office.invalidFile")
    input.value = ""
    selectFile(null)
    return
  }

  if (!matchesOfficeAnswerTemplate(file.name, templateName.value)) {
    validationError.value = t("exercises.office.formatMismatch")
    input.value = ""
    selectFile(null)
    return
  }

  selectFile(file)
}

watch(
  () => props.files.map((file) => `${file.id}:${file.name}`).join(","),
  () => {
    if (props.files.length > 0) clearSelectedFile()
  },
)
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p class="font-semibold text-slate-900">{{ t("exercises.office.title") }}</p>
      <p v-if="templateName" class="mt-1 break-all text-sm text-slate-700">
        {{ t("exercises.office.template", { name: templateName }) }}
      </p>
      <p class="mt-2 text-sm leading-6 text-slate-600">{{ t("exercises.office.help") }}</p>
      <p class="mt-2 text-xs text-slate-500">{{ t("exercises.office.requiresConnection") }}</p>
    </div>

    <button
      v-if="!prepared"
      type="button"
      class="min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
      :disabled="disabled"
      @click="emit('prepare')"
    >
      <i class="pi pi-file-edit mr-2" aria-hidden="true" />{{ t("exercises.office.prepare") }}
    </button>

    <div v-else class="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p class="text-sm font-semibold text-emerald-900">{{ t("exercises.office.prepared") }}</p>
      <div
        v-for="file in files"
        :key="file.id"
        class="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <p class="break-all text-sm font-medium text-slate-900">{{ file.name }}</p>
          <p v-if="file.size > 0" class="mt-1 text-xs text-slate-500">
            {{ t("exercises.office.fileSize", { size: Math.ceil(file.size / 1024) }) }}
          </p>
        </div>
        <button
          type="button"
          class="min-h-touch shrink-0 rounded-xl border border-chamilo-700 px-4 text-sm font-semibold text-chamilo-700 disabled:opacity-50"
          :disabled="disabled"
          @click="emit('open-file', file)"
        >
          <i class="pi pi-external-link mr-2" aria-hidden="true" />{{ t("exercises.office.open") }}
        </button>
      </div>
    </div>

    <label v-if="prepared" class="block text-sm font-medium text-slate-700">
      {{ t("exercises.office.chooseCompleted") }}
      <input
        ref="fileInput"
        :name="`question-${question.id}-office-file`"
        type="file"
        :accept="accept"
        :disabled="disabled"
        class="mt-2 block min-h-touch w-full rounded-xl border border-slate-300 bg-white p-2"
        @change="onFileChange"
      />
    </label>

    <div v-if="selectedFile" class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <p class="break-all font-medium text-slate-900">{{ selectedFile.name }}</p>
      <p class="mt-1 text-xs text-slate-600">{{ t("exercises.office.fileReady") }}</p>
      <button
        type="button"
        class="mt-2 min-h-touch text-sm font-semibold text-chamilo-700"
        @click="clearSelectedFile"
      >
        {{ t("exercises.removeSelectedFile") }}
      </button>
    </div>

    <p v-if="validationError" class="text-sm text-red-700" role="alert">{{ validationError }}</p>
  </div>
</template>
