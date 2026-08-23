<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import CampusCard from "@/components/campus/CampusCard.vue"
import CampusForm from "@/components/campus/CampusForm.vue"
import type { CampusProfile, CampusProfileInput } from "@/domain/campus/types"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

const { t } = useI18n()
const campusStore = useCampusStore()
const authStore = useAuthStore()
const { profiles, selectedCampusId, errorCode } = storeToRefs(campusStore)

const editingCampus = ref<CampusProfile | null>(null)
const pendingRemovalId = ref<string | null>(null)
const busy = ref(false)

const storeErrorMessage = computed(() =>
  errorCode.value ? t(`campus.storeErrors.${errorCode.value}`) : null,
)

async function addOrUpdateCampus(input: CampusProfileInput): Promise<void> {
  busy.value = true

  try {
    if (editingCampus.value) {
      const campusId = editingCampus.value.id
      const changesConnection =
        editingCampus.value.baseUrl !== input.baseUrl ||
        editingCampus.value.allowInsecureHttp !== Boolean(input.allowInsecureHttp)

      if (changesConnection) {
        const cleared = await authStore.clearCampusSession(campusId)

        if (!cleared) {
          return
        }
      }

      campusStore.updateCampus(campusId, input)
      editingCampus.value = null
    } else {
      campusStore.addCampus(input)
      authStore.resetActiveSession()
    }
  } finally {
    busy.value = false
  }
}

function editCampus(campus: CampusProfile): void {
  editingCampus.value = campus
  pendingRemovalId.value = null
  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function selectCampus(id: string): Promise<void> {
  if (campusStore.selectCampus(id)) {
    authStore.resetActiveSession()
  }
}

function retryErrors(): void {
  campusStore.initialize()
}

async function confirmRemoval(id: string): Promise<void> {
  const cleared = await authStore.clearCampusSession(id)

  if (!cleared) {
    return
  }

  campusStore.removeCampus(id)
  pendingRemovalId.value = null

  if (editingCampus.value?.id === id) {
    editingCampus.value = null
  }
}

onMounted(() => {
  // Authentication errors belong to the login screen. Do not leak stale login
  // state into a different campus context after the user navigates back here.
  authStore.clearError()
})
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-2xl bg-chamilo-900 p-5 text-white shadow-sm">
      <p class="text-sm font-medium text-chamilo-100">{{ t("campus.eyebrow") }}</p>
      <h2 class="mt-1 text-2xl font-semibold">{{ t("campus.title") }}</h2>
      <p class="mt-2 text-sm leading-6 text-chamilo-100">{{ t("campus.description") }}</p>
    </section>

    <div
      v-if="storeErrorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
      aria-live="assertive"
    >
      <p class="text-sm text-red-900">{{ storeErrorMessage }}</p>
      <button
        type="button"
        class="mt-3 min-h-touch rounded-xl border border-red-300 bg-white px-4 py-2 font-medium text-red-800"
        @click="retryErrors"
      >
        {{ t("actions.retry") }}
      </button>
    </div>

    <CampusForm
      :campus="editingCampus"
      :busy="busy"
      @submit="addOrUpdateCampus"
      @cancel="editingCampus = null"
    />

    <section aria-labelledby="saved-campuses-title">
      <div class="flex items-center justify-between gap-3">
        <h2 id="saved-campuses-title" class="text-lg font-semibold text-slate-900">
          {{ t("campus.savedTitle") }}
        </h2>
        <span class="text-sm text-slate-500">
          {{ t("campus.count", { count: profiles.length }) }}
        </span>
      </div>

      <div
        v-if="profiles.length === 0"
        class="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center"
      >
        <i class="pi pi-building text-2xl text-slate-400" aria-hidden="true" />
        <h3 class="mt-3 font-semibold text-slate-900">{{ t("campus.emptyTitle") }}</h3>
        <p class="mt-1 text-sm text-slate-600">{{ t("campus.emptyDescription") }}</p>
      </div>

      <div v-else class="mt-3 space-y-3">
        <CampusCard
          v-for="campus in profiles"
          :key="campus.id"
          :campus="campus"
          :selected="campus.id === selectedCampusId"
          :confirm-removal="campus.id === pendingRemovalId"
          @select="selectCampus"
          @edit="editCampus"
          @request-removal="pendingRemovalId = $event"
          @confirm-removal="confirmRemoval"
          @cancel-removal="pendingRemovalId = null"
        />
      </div>
    </section>

    <RouterLink
      v-if="selectedCampusId"
      :to="{ name: 'login' }"
      class="flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white"
    >
      {{ t("actions.continue") }}
      <i class="pi pi-arrow-right" aria-hidden="true" />
    </RouterLink>
  </div>
</template>
