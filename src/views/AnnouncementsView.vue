<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"

import FeaturePlaceholder from "@/components/states/FeaturePlaceholder.vue"
import { CourseRouteContextError, parseCourseRouteContext } from "@/domain/courses/routeContext"

const props = defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()

const { t } = useI18n()
const hasValidContext = computed(() => {
  try {
    parseCourseRouteContext(props)
    return true
  } catch (error) {
    if (error instanceof CourseRouteContextError) {
      return false
    }

    throw error
  }
})
</script>

<template>
  <FeaturePlaceholder
    icon="pi pi-megaphone"
    :title="t('placeholders.announcements.title')"
    :description="
      hasValidContext
        ? t('placeholders.announcements.description')
        : t('courseHome.states.missing.description')
    "
  />
</template>
