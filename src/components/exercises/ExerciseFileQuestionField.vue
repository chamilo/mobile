<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import type { ExerciseAttemptFile, ExerciseQuestion } from "@/domain/exercises/types"
import { ExerciseWavRecorder } from "@/services/exercises/ExerciseWavRecorder"

const props = defineProps<{
  question: ExerciseQuestion
  files: ExerciseAttemptFile[]
  disabled?: boolean
}>()
const emit = defineEmits<{ "file-selected": [file: File | null] }>()
const { t } = useI18n()
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const recording = ref(false)
const recorderError = ref("")
const recorder = new ExerciseWavRecorder()
const oral = computed(() => props.question.type === 13)
const accept = computed(() => (oral.value ? ".wav,.ogg,audio/wav,audio/ogg" : undefined))

function selectFile(file: File | null): void {
  selectedFile.value = file
  emit("file-selected", file)
}

function clearSelectedFile(): void {
  if (fileInput.value) fileInput.value.value = ""
  selectFile(null)
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  recorderError.value = ""

  if (oral.value && file && !/\.(wav|ogg)$/i.test(file.name)) {
    recorderError.value = t("exercises.oralFileInvalid")
    input.value = ""
    selectFile(null)
    return
  }

  selectFile(file)
}

async function startRecording(): Promise<void> {
  recorderError.value = ""
  try {
    await recorder.start()
    recording.value = true
  } catch {
    recorderError.value = t("exercises.audioRecordingUnavailable")
  }
}

async function stopRecording(): Promise<void> {
  try {
    selectFile(await recorder.stop())
  } catch {
    recorderError.value = t("exercises.audioRecordingFailed")
  } finally {
    recording.value = false
  }
}

watch(
  () => props.files.map((file) => file.id).join(","),
  () => {
    if (props.files.length > 0) clearSelectedFile()
  },
)

onBeforeUnmount(() => void recorder.cancel())
</script>

<template>
  <div class="space-y-4">
    <div v-if="files.length" class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <p class="text-sm font-semibold text-emerald-900">{{ t("exercises.savedFiles") }}</p>
      <ul class="mt-2 space-y-1 text-sm text-emerald-900">
        <li v-for="file in files" :key="file.id" class="break-all">{{ file.name }}</li>
      </ul>
    </div>

    <div v-if="oral" class="space-y-2">
      <button
        v-if="!recording"
        type="button"
        class="min-h-touch w-full rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
        :disabled="disabled || !recorder.supported"
        @click="startRecording"
      >
        <i class="pi pi-microphone mr-2" aria-hidden="true" />{{ t("exercises.startRecording") }}
      </button>
      <button
        v-else
        type="button"
        class="min-h-touch w-full rounded-xl bg-red-700 px-4 font-semibold text-white"
        @click="stopRecording"
      >
        <i class="pi pi-stop-circle mr-2" aria-hidden="true" />{{ t("exercises.stopRecording") }}
      </button>
      <p class="text-xs text-slate-600">{{ t("exercises.oralFileHint") }}</p>
    </div>

    <label class="block text-sm font-medium text-slate-700">
      {{ oral ? t("exercises.chooseAudioFile") : t("exercises.chooseAnswerFile") }}
      <input
        ref="fileInput"
        :name="`question-${question.id}-file`"
        type="file"
        :accept="accept"
        :disabled="disabled || recording"
        class="mt-2 block min-h-touch w-full rounded-xl border border-slate-300 bg-white p-2"
        @change="onFileChange"
      />
    </label>

    <div v-if="selectedFile" class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <p class="break-all font-medium text-slate-900">{{ selectedFile.name }}</p>
      <p class="mt-1 text-xs text-slate-600">{{ t("exercises.fileReadyToUpload") }}</p>
      <button
        type="button"
        class="mt-2 min-h-touch text-sm font-semibold text-chamilo-700"
        @click="clearSelectedFile"
      >
        {{ t("exercises.removeSelectedFile") }}
      </button>
    </div>

    <p v-if="recorderError" class="text-sm text-red-700" role="alert">{{ recorderError }}</p>
  </div>
</template>
