<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import AnnouncementContent from "@/components/announcements/AnnouncementContent.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import { useCampusStore } from "@/stores/campus"
import { useMessagesStore } from "@/stores/messages"

const props = defineProps<{
  messageId: string
}>()

const { t } = useI18n()
const router = useRouter()
const campusStore = useCampusStore()
const messagesStore = useMessagesStore()
const { detailStatus, mutationStatus, selectedMessage, errorCode } = storeToRefs(messagesStore)
const numericMessageId = computed(() => Number.parseInt(props.messageId, 10))
const campusBaseUrl = computed(() => campusStore.selectedCampus?.baseUrl ?? "https://localhost")
const errorMessage = computed(() =>
  errorCode.value ? t(`messages.errors.${errorCode.value}`) : t("messages.errors.server"),
)
const replyRecipient = computed(() => {
  const message = selectedMessage.value

  if (!message) {
    return null
  }

  if (message.box === "inbox") {
    return {
      id: message.senderId,
      name: message.senderName,
    }
  }

  const recipientId = message.recipientIds[0]
  const recipientName = message.recipientNames[0]

  return recipientId && recipientName ? { id: recipientId, name: recipientName } : null
})
const replySubject = computed(() => {
  const title = selectedMessage.value?.title ?? ""

  return /^re:/i.test(title) ? title : `Re: ${title}`
})

function formatDate(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      }).format(date)
}

async function load(): Promise<void> {
  if (!Number.isInteger(numericMessageId.value) || numericMessageId.value <= 0) {
    return
  }

  await messagesStore.loadDetail(numericMessageId.value)
}

async function removeMessage(): Promise<void> {
  const message = selectedMessage.value

  if (!message || !globalThis.confirm(t("messages.deleteConfirmation"))) {
    return
  }

  if (await messagesStore.remove(message.id)) {
    await router.replace({ name: "messages" })
  }
}

onMounted(load)
onUnmounted(messagesStore.clearDetail)
</script>

<template>
  <div class="space-y-5">
    <RouterLink
      :to="{ name: 'messages' }"
      class="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-chamilo-700"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      {{ t("messages.backToMessages") }}
    </RouterLink>

    <LoadingState v-if="detailStatus === 'loading'" :label="t('messages.loadingDetail')" />

    <ErrorState
      v-else-if="detailStatus === 'error' || !selectedMessage"
      :title="t('messages.detailErrorTitle')"
      :description="errorMessage"
      :retry-label="t('messages.retry')"
      @retry="load"
    />

    <article v-else class="overflow-hidden rounded-2xl bg-white shadow-sm">
      <header class="border-b border-slate-200 p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-chamilo-700">
              {{
                selectedMessage.box === "sent"
                  ? t("messages.to", {
                      names: selectedMessage.recipientNames.join(", "),
                    })
                  : t("messages.from", { name: selectedMessage.senderName })
              }}
            </p>
            <h2 class="mt-2 text-xl font-semibold text-slate-900">
              {{ selectedMessage.title }}
            </h2>
            <time class="mt-2 block text-xs text-slate-500" :datetime="selectedMessage.sendDate">
              {{ formatDate(selectedMessage.sendDate) }}
            </time>
          </div>

          <button
            type="button"
            class="flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-amber-600 hover:bg-amber-50"
            :aria-label="
              selectedMessage.starred ? t('messages.actions.unstar') : t('messages.actions.star')
            "
            :disabled="mutationStatus === 'loading'"
            @click="messagesStore.setStarred(selectedMessage, !selectedMessage.starred)"
          >
            <i
              :class="selectedMessage.starred ? 'pi pi-star-fill' : 'pi pi-star'"
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      <div class="p-5">
        <AnnouncementContent
          :html="selectedMessage.content ?? ''"
          :campus-base-url="campusBaseUrl"
        />

        <p v-if="selectedMessage.attachmentCount > 0" class="mt-5 text-sm text-slate-600">
          <i class="pi pi-paperclip mr-1" aria-hidden="true" />
          {{
            t("messages.attachmentCount", {
              count: selectedMessage.attachmentCount,
            })
          }}
        </p>
      </div>

      <footer class="grid gap-2 border-t border-slate-200 p-4 sm:grid-cols-2">
        <RouterLink
          v-if="replyRecipient"
          :to="{
            name: 'message-compose',
            query: {
              recipientId: replyRecipient.id,
              recipientName: replyRecipient.name,
              subject: replySubject,
              parentId: selectedMessage.id,
            },
          }"
          class="flex min-h-touch items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white"
        >
          <i class="pi pi-reply" aria-hidden="true" />
          {{ t("messages.actions.reply") }}
        </RouterLink>
        <button
          type="button"
          class="flex min-h-touch items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-800"
          :disabled="mutationStatus === 'loading'"
          @click="removeMessage"
        >
          <i class="pi pi-trash" aria-hidden="true" />
          {{ t("messages.actions.delete") }}
        </button>
      </footer>
    </article>
  </div>
</template>
