<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import FeaturePlaceholder from "@/components/states/FeaturePlaceholder.vue"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

const { t } = useI18n()
const { profile } = storeToRefs(useAuthStore())
const { selectedCampus } = storeToRefs(useCampusStore())
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <p class="text-sm text-slate-500">{{ t("courses.signedInAs") }}</p>
      <p class="mt-1 font-semibold text-slate-900">{{ profile?.fullName }}</p>
      <p class="text-sm text-slate-600">{{ selectedCampus?.displayName }}</p>
    </section>

    <FeaturePlaceholder
      icon="pi pi-book"
      :title="t('placeholders.courses.title')"
      :description="t('placeholders.courses.description')"
    />
  </div>
</template>
