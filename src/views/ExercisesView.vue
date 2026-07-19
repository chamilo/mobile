<script setup lang="ts">
import CourseToolCollectionView from "@/components/courseTools/CourseToolCollectionView.vue"

defineProps<{
  courseId: string
  sessionId: string | null
  membershipId: string | null
  sessionCourseId: string | null
  source: string | null
}>()
</script>

<template>
  <CourseToolCollectionView tool="exercises" v-bind="$props" />
</template>
