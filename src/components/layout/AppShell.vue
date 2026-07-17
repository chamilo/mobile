<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

import AppHeader from "@/components/layout/AppHeader.vue"
import BottomNavigation from "@/components/layout/BottomNavigation.vue"
import OfflineBanner from "@/components/states/OfflineBanner.vue"

const route = useRoute()
const { t } = useI18n()

const pageTitle = computed(() => t(route.meta.titleKey))
const showBottomNavigation = computed(() => route.meta.showBottomNavigation)
</script>

<template>
  <div class="min-h-dvh bg-slate-100">
    <AppHeader :title="pageTitle" />
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
