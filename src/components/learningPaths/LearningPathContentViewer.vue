<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from "vue"
import { useI18n } from "vue-i18n"

import {
  inspectLearningPathContent,
  prepareResponsiveHtmlDocument,
  type LearningPathViewerKind,
} from "@/domain/learningPaths/contentViewer"
import type { LearningPathRuntimeItem } from "@/domain/learningPaths/types"

const props = defineProps<{
  blob: Blob
  item: LearningPathRuntimeItem
  contentUrl?: string
  locale: string
  fallbackLocales: string[]
}>()

const emit = defineEmits<{
  download: []
}>()

const { t } = useI18n()
const viewerKind = ref<LearningPathViewerKind>("unsupported")
const preparing = ref(true)
const objectUrl = ref("")
const textContent = ref("")
const htmlContent = ref("")
const preparedBlob = shallowRef<Blob | null>(null)
let refreshSequence = 0

function revokeObjectUrl(): void {
  if (!objectUrl.value) return

  URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = ""
}

async function refreshViewer(): Promise<void> {
  const sequence = ++refreshSequence
  preparing.value = true
  revokeObjectUrl()
  preparedBlob.value = null
  textContent.value = ""
  htmlContent.value = ""

  try {
    const inspection = await inspectLearningPathContent(
      props.blob,
      props.item.title,
      props.contentUrl ?? "",
    )

    if (sequence !== refreshSequence) return

    viewerKind.value = inspection.kind

    if (inspection.kind === "html") {
      htmlContent.value = prepareResponsiveHtmlDocument(
        inspection.textContent,
        props.locale,
        props.fallbackLocales,
      )
      return
    }

    if (inspection.kind === "text") {
      textContent.value = inspection.textContent
      return
    }

    if (["image", "video", "audio", "frame"].includes(inspection.kind)) {
      preparedBlob.value =
        props.blob.type.trim().toLowerCase().split(";", 1)[0] === inspection.mimeType
          ? props.blob
          : new Blob([props.blob], { type: inspection.mimeType })
      objectUrl.value = URL.createObjectURL(preparedBlob.value)
    }
  } catch {
    if (sequence === refreshSequence) {
      viewerKind.value = "unsupported"
    }
  } finally {
    if (sequence === refreshSequence) {
      preparing.value = false
    }
  }
}

watch(
  () => [
    props.blob,
    props.item.id,
    props.contentUrl ?? "",
    props.locale,
    JSON.stringify(props.fallbackLocales),
  ] as const,
  () => {
    void refreshViewer()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  refreshSequence += 1
  revokeObjectUrl()
})
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div
      v-if="preparing"
      class="flex min-h-32 items-center justify-center gap-3 p-4 text-sm text-slate-600"
      role="status"
      aria-live="polite"
    >
      <i class="pi pi-spinner pi-spin text-chamilo-700" aria-hidden="true" />
      <span>{{ t("learningPaths.preparing") }}</span>
    </div>

    <img
      v-else-if="viewerKind === 'image'"
      :src="objectUrl"
      :alt="item.title"
      class="mx-auto max-h-[72dvh] w-auto max-w-full object-contain"
    />

    <video
      v-else-if="viewerKind === 'video'"
      :src="objectUrl"
      class="max-h-[72dvh] w-full bg-black"
      controls
      playsinline
    />

    <audio v-else-if="viewerKind === 'audio'" :src="objectUrl" class="w-full p-3" controls />

    <pre
      v-else-if="viewerKind === 'text'"
      class="max-h-[72dvh] overflow-auto whitespace-pre-wrap break-words p-3 text-sm leading-6 text-slate-800"
      >{{ textContent }}</pre
    >

    <iframe
      v-else-if="viewerKind === 'html'"
      :srcdoc="htmlContent"
      :title="item.title"
      class="h-[72dvh] min-h-[360px] w-full bg-white"
      sandbox="allow-same-origin"
      referrerpolicy="no-referrer"
    />

    <iframe
      v-else-if="viewerKind === 'frame'"
      :src="objectUrl"
      :title="item.title"
      class="h-[72dvh] min-h-[360px] w-full bg-white"
      sandbox="allow-same-origin"
      referrerpolicy="no-referrer"
    />

    <div v-else class="space-y-3 p-3">
      <p class="text-sm leading-6 text-slate-700">
        {{ t("learningPaths.viewerUnsupported") }}
      </p>
      <button
        type="button"
        class="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-800"
        @click="emit('download')"
      >
        <i class="pi pi-download" aria-hidden="true" />
        {{ t("learningPaths.downloadContent") }}
      </button>
    </div>
  </div>
</template>
