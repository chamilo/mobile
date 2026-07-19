<script setup lang="ts">
import { computed, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

import AppHeader from "@/components/layout/AppHeader.vue"
import BottomNavigation from "@/components/layout/BottomNavigation.vue"
import OfflineBanner from "@/components/states/OfflineBanner.vue"
import { useBrandingStore } from "@/stores/branding"
import { useCampusStore } from "@/stores/campus"

const route = useRoute()
const { t } = useI18n()
const campusStore = useCampusStore()
const brandingStore = useBrandingStore()

const pageTitle = computed(() => t(route.meta.titleKey))
const showBottomNavigation = computed(() => route.meta.showBottomNavigation)
const siteName = computed(
  () => brandingStore.branding?.siteName ?? campusStore.selectedCampus?.displayName ?? "Chamilo",
)
const logoUrl = computed(() => brandingStore.branding?.logoUrl ?? null)
const logoAlt = computed(() => t("app.platformLogoAlt", { siteName: siteName.value }))

watch(
  () => campusStore.selectedCampus,
  (campus) => {
    if (campus) {
      void brandingStore.load(campus)
      return
    }

    brandingStore.reset()
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-dvh bg-slate-100">
    <AppHeader :title="pageTitle" :logo-url="logoUrl" :logo-alt="logoAlt" />
    <OfflineBanner />

    <main
      id="main-content"
      class="mx-auto w-full max-w-screen-sm px-4 py-6"
      :class="showBottomNavigation ? 'pb-24' : 'pb-8'"
    >
      <RouterView />
    </main>

    <BottomNavigation v-if="showBottomNavigation" />
  </div>
</template>
