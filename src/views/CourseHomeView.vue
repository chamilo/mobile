<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import FeaturePlaceholder from "@/components/states/FeaturePlaceholder.vue"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
}>()

const { t } = useI18n()
const contextLabel = computed(() =>
  props.sessionId
    ? t("placeholders.courseHome.sessionContext", {
        courseId: props.courseId,
        sessionId: props.sessionId,
      })
    : t("placeholders.courseHome.directContext", {
        courseId: props.courseId,
        membershipId: props.membershipId ?? "-",
      }),
)
</script>

<template>
  <FeaturePlaceholder
    icon="pi pi-graduation-cap"
    :title="t('placeholders.courseHome.title')"
    :description="t('placeholders.courseHome.description')"
  >
    <p class="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{{ contextLabel }}</p>
  </FeaturePlaceholder>
</template>
