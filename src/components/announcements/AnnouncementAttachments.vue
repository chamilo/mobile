<script setup lang="ts">
import { useI18n } from "vue-i18n"

import { formatAttachmentSize } from "@/domain/announcements/formatAttachmentSize"
import type { AnnouncementAttachment } from "@/domain/announcements/types"

defineProps<{
  attachments: AnnouncementAttachment[]
}>()

const { t } = useI18n()
</script>

<template>
  <section v-if="attachments.length" aria-labelledby="announcement-attachments-title">
    <h2 id="announcement-attachments-title" class="text-base font-semibold text-slate-900">
      {{ t("announcements.attachmentsTitle") }}
    </h2>

    <ul class="mt-3 space-y-3">
      <li
        v-for="attachment in attachments"
        :key="attachment.id"
        class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
      >
        <i class="pi pi-paperclip mt-1 text-chamilo-700" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="break-words text-sm font-semibold text-slate-900">
            {{ attachment.filename }}
          </p>
          <p class="mt-1 text-xs text-slate-500">{{ formatAttachmentSize(attachment.size) }}</p>
          <p v-if="attachment.comment" class="mt-2 text-sm leading-5 text-slate-600">
            {{ attachment.comment }}
          </p>
          <p class="mt-2 text-xs leading-5 text-slate-500">
            {{ t("announcements.attachmentDownloadDeferred") }}
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>
