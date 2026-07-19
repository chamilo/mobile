<script setup lang="ts">
import Button from "primevue/button"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import FeaturePlaceholder from "@/components/states/FeaturePlaceholder.vue"

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <FeaturePlaceholder
    icon="pi pi-exclamation-circle"
    :title="t('placeholders.notFound.title')"
    :description="t('placeholders.notFound.description')"
  >
    <Button
      unstyled
      type="button"
      class="mt-5 min-h-touch rounded-xl bg-chamilo-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-chamilo-900"
      :label="t('actions.goToCourses')"
      @click="router.push({ name: 'courses' })"
    />
  </FeaturePlaceholder>
</template>
