<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import type { CStudioChamiloResource } from "@/domain/learningPaths/cstudioResource"
import type {
  LearningPathRuntime,
  LearningPathRuntimeItem,
  LearningPathScormCommitPayload,
} from "@/domain/learningPaths/types"
import { installCStudioScormBridge } from "@/services/learningPaths/CStudioScormBridge"
import {
  createScormRuntimeApi,
  type ScormRuntimeContext,
} from "@/services/learningPaths/scormRuntimeApi.js"

interface ScormWindow extends Window {
  API?: Record<string, (...arguments_: string[]) => string>
  api?: Record<string, (...arguments_: string[]) => string>
  API_1484_11?: Record<string, (...arguments_: string[]) => string>
  api_1484_11?: Record<string, (...arguments_: string[]) => string>
}

const props = defineProps<{
  entryUrl: string
  runtime: LearningPathRuntime
  item: LearningPathRuntimeItem
  commit: (payload: LearningPathScormCommitPayload) => Promise<void>
}>()

const emit = defineEmits<{
  navigate: [request: string]
  committed: [payload: LearningPathScormCommitPayload]
  cstudioResource: [resource: CStudioChamiloResource]
}>()

const { t } = useI18n()
const frame = ref<HTMLIFrameElement | null>(null)
const frameReady = ref(false)
const frameLoading = ref(true)
const isLocalWebFixture = computed(() => props.entryUrl.includes("/__scorm-fixtures/"))
let context: ScormRuntimeContext | null = null
let periodicTimer: ReturnType<typeof setInterval> | null = null
let cstudioBridgeCleanup: (() => void) | null = null

function clearWindowApi(): void {
  const target = window as ScormWindow

  if (target.API === context?.api12) delete target.API
  if (target.api === context?.api12) delete target.api
  if (target.API_1484_11 === context?.api2004) delete target.API_1484_11
  if (target.api_1484_11 === context?.api2004) delete target.api_1484_11
}

function clearCStudioBridge(): void {
  cstudioBridgeCleanup?.()
  cstudioBridgeCleanup = null
}

function destroyRuntime(): void {
  clearCStudioBridge()
  clearWindowApi()
  context?.destroy()
  context = null
  frameReady.value = false
}

async function createRuntime(): Promise<void> {
  destroyRuntime()

  const scorm = props.runtime.scorm
  if (
    !props.entryUrl ||
    !scorm.packageEntryPath ||
    (props.item.itemType === "sco" && !scorm.enabled)
  ) {
    return
  }

  context = createScormRuntimeApi({
    version: scorm.version,
    initialValues: scorm.values,
    forceCommit: scorm.forceCommit,
    debug: scorm.debug,
    lpId: props.runtime.lpId,
    itemId: props.item.id,
    itemViewId: scorm.itemViewId,
    lpViewId: scorm.lpViewId,
    userId: scorm.userId,
    lpType: scorm.lpType,
    itemType: scorm.itemType,
    commit: async (payload) => {
      await props.commit(payload)
      emit("committed", payload)
    },
    beacon: (payload) => {
      void props.commit(payload)
      return true
    },
    onNavigate: (request) => emit("navigate", request),
    hasNextItem: props.runtime.nextItemId > 0,
    hasPreviousItem: props.runtime.previousItemId > 0,
    navigationTargets: props.runtime.items
      .filter(({ ref }) => Boolean(ref?.trim()))
      .map(({ ref, available, isSection }) => ({
        ref: ref?.trim() ?? "",
        available: available && !isSection,
      })),
  })

  const target = window as ScormWindow
  if (scorm.version === "2004") {
    target.API_1484_11 = context.api2004
    target.api_1484_11 = context.api2004
    delete target.API
    delete target.api
  } else {
    target.API = context.api12
    target.api = context.api12
    delete target.API_1484_11
    delete target.api_1484_11
  }

  await nextTick()
  frameLoading.value = true
  frameReady.value = true
}

async function flush(reason = "flush"): Promise<void> {
  await context?.flush(reason)
}

function installCStudioBridge(): void {
  clearCStudioBridge()

  try {
    const contentDocument = frame.value?.contentDocument
    if (!contentDocument) return

    const hasCStudioResource = Boolean(
      contentDocument.querySelector(
        ".cstudio-chamilo-resource, iframe.cstudio-chamilo-resource-frame",
      ),
    )
    if (!props.runtime.isCStudioContent && !hasCStudioResource) return

    cstudioBridgeCleanup = installCStudioScormBridge(contentDocument, {
      openLabel: t("learningPaths.cstudioOpenInMobile"),
      unavailableLabel: t("learningPaths.cstudioResourceUnavailable"),
      onOpen: (resource) => emit("cstudioResource", resource),
    })
  } catch {
    context?.logLms("CStudio resource bridge is not available for this frame.", 2)
  }
}

function handleLoad(): void {
  frameLoading.value = false
  context?.logLms("SCORM content iframe loaded.", 2)
  installCStudioBridge()
}

function handleVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    void flush("visibility-hidden")
  }
}

watch(
  () => [props.entryUrl, props.runtime.scorm.itemViewId, props.item.id] as const,
  () => void createRuntime(),
  { immediate: true },
)

onMounted(() => {
  periodicTimer = setInterval(() => void flush("timer"), 30_000)
  document.addEventListener("visibilitychange", handleVisibilityChange)
})

onBeforeUnmount(() => {
  if (periodicTimer) clearInterval(periodicTimer)
  document.removeEventListener("visibilitychange", handleVisibilityChange)
  void flush("unmount")
  destroyRuntime()
})

defineExpose({ flush })
</script>

<template>
  <div class="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <p
      v-if="isLocalWebFixture"
      class="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="status"
    >
      {{ t("learningPaths.scormLocalFixture") }}
    </p>
    <div
      v-if="frameLoading"
      class="absolute inset-x-0 top-0 z-10 flex min-h-touch items-center justify-center gap-2 bg-white/95 px-4 text-sm text-slate-600"
      role="status"
    >
      <i class="pi pi-spin pi-spinner" aria-hidden="true" />
      {{ t("learningPaths.scormStarting") }}
    </div>

    <iframe
      v-if="frameReady"
      ref="frame"
      :key="`${item.id}-${runtime.scorm.itemViewId}-${entryUrl}`"
      :src="entryUrl"
      :title="item.title"
      class="h-[68dvh] min-h-[480px] w-full bg-white"
      sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups allow-downloads"
      referrerpolicy="same-origin"
      @load="handleLoad"
    />
  </div>
</template>
