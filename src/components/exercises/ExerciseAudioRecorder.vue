<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue"
import { useI18n } from "vue-i18n"

import { encodeMonoPcm16Wav } from "@/domain/exercises/audioRecording"

const props = defineProps<{
  questionId: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  recorded: [file: File]
}>()

const { t } = useI18n()
const recording = ref(false)
const error = ref(false)
const elapsedSeconds = ref(0)

let stream: MediaStream | null = null
let audioContext: AudioContext | null = null
let source: MediaStreamAudioSourceNode | null = null
let processor: ScriptProcessorNode | null = null
let samples: Float32Array[] = []
let timer: ReturnType<typeof setInterval> | null = null

const elapsedLabel = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
})

function stopTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}

async function cleanupCapture(): Promise<void> {
  stopTimer()
  processor?.disconnect()
  source?.disconnect()
  processor = null
  source = null

  for (const track of stream?.getTracks() ?? []) track.stop()
  stream = null

  if (audioContext && audioContext.state !== "closed") {
    await audioContext.close().catch(() => undefined)
  }
  audioContext = null
}

async function start(): Promise<void> {
  if (props.disabled || recording.value) return
  error.value = false

  if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
    error.value = true
    return
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    audioContext = new AudioContext()
    await audioContext.resume()
    source = audioContext.createMediaStreamSource(stream)
    processor = audioContext.createScriptProcessor(4096, 1, 1)
    samples = []

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0)
      samples.push(new Float32Array(input))
    }

    source.connect(processor)
    processor.connect(audioContext.destination)

    elapsedSeconds.value = 0
    timer = setInterval(() => {
      elapsedSeconds.value += 1
    }, 1000)
    recording.value = true
  } catch {
    await cleanupCapture()
    error.value = true
  }
}

async function stop(): Promise<void> {
  if (!recording.value || !audioContext) return

  const sampleRate = audioContext.sampleRate
  recording.value = false
  await cleanupCapture()

  if (samples.length === 0) {
    error.value = true
    return
  }

  const wav = encodeMonoPcm16Wav(samples, sampleRate)
  const file = new File([wav], `oral-expression-${props.questionId}.wav`, {
    type: "audio/wav",
  })
  samples = []
  emit("recorded", file)
}

onBeforeUnmount(() => {
  recording.value = false
  void cleanupCapture()
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div class="flex flex-wrap items-center gap-3">
      <button
        v-if="!recording"
        type="button"
        class="min-h-touch rounded-xl bg-chamilo-700 px-4 font-semibold text-white disabled:opacity-50"
        :disabled="disabled"
        @click="start"
      >
        <i class="pi pi-microphone mr-2" aria-hidden="true" />
        {{ t("exercises.fileAnswer.startRecording") }}
      </button>
      <button
        v-else
        type="button"
        class="min-h-touch rounded-xl bg-red-700 px-4 font-semibold text-white"
        @click="stop"
      >
        <i class="pi pi-stop-circle mr-2" aria-hidden="true" />
        {{ t("exercises.fileAnswer.stopRecording") }}
      </button>
      <span
        v-if="recording"
        class="font-mono text-sm font-semibold text-red-700"
        aria-live="polite"
      >
        {{ elapsedLabel }}
      </span>
    </div>

    <p v-if="error" class="mt-3 text-sm text-amber-900" role="alert">
      {{ t("exercises.fileAnswer.microphoneUnavailable") }}
    </p>
  </div>
</template>
