<script setup lang="ts">
import { computed, ref } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import type { MobileMessageRecipient } from "@/domain/messages/types"
import { useMessagesStore } from "@/stores/messages"

const props = defineProps<{
  recipientId?: string | null
  recipientName?: string | null
  subject?: string | null
  parentId?: string | null
}>()

const { t } = useI18n()
const router = useRouter()
const messagesStore = useMessagesStore()
const { mutationStatus, recipientStatus, recipients, errorCode } = storeToRefs(messagesStore)
const lockedRecipientId = Number.parseInt(props.recipientId ?? "", 10)
const lockedParentId = Number.parseInt(props.parentId ?? "", 10)
const selectedRecipient = ref<MobileMessageRecipient | null>(
  Number.isInteger(lockedRecipientId) && lockedRecipientId > 0 && props.recipientName
    ? {
        id: lockedRecipientId,
        username: "",
        fullName: props.recipientName,
      }
    : null,
)
const recipientQuery = ref("")
const title = ref(props.subject ?? "")
const content = ref("")
const validationMessage = ref<string | null>(null)

const busy = computed(
  () => mutationStatus.value === "loading" || recipientStatus.value === "loading",
)
const serviceError = computed(() =>
  errorCode.value ? t(`messages.errors.${errorCode.value}`) : null,
)

async function searchRecipients(): Promise<void> {
  validationMessage.value = null

  if (recipientQuery.value.trim().length < 2) {
    validationMessage.value = t("messages.composeForm.recipientSearchMinimum")
    return
  }

  await messagesStore.searchRecipients(recipientQuery.value)
}

function chooseRecipient(recipient: MobileMessageRecipient): void {
  selectedRecipient.value = recipient
  recipientQuery.value = ""
  messagesStore.clearRecipients()
}

function clearRecipient(): void {
  selectedRecipient.value = null
  messagesStore.clearRecipients()
}

async function submit(): Promise<void> {
  validationMessage.value = null

  if (!selectedRecipient.value || !title.value.trim() || !content.value.trim()) {
    validationMessage.value = t("messages.composeForm.validation")
    return
  }

  const message = await messagesStore.send({
    recipientId: selectedRecipient.value.id,
    title: title.value,
    content: content.value,
    parentId: Number.isInteger(lockedParentId) && lockedParentId > 0 ? lockedParentId : null,
  })

  if (message) {
    if (message.id < 0) {
      await router.replace({ name: "messages", query: { box: "sent" } })
      return
    }

    await router.replace({
      name: "message-detail",
      params: { messageId: message.id },
    })
  }
}
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

    <section class="rounded-2xl bg-white p-5 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-700">
        {{ t("messages.composeForm.eyebrow") }}
      </p>
      <h2 class="mt-1 text-2xl font-semibold text-slate-900">
        {{ t("messages.composeForm.title") }}
      </h2>

      <form class="mt-5 space-y-5" @submit.prevent="submit">
        <div>
          <label class="block text-sm font-medium text-slate-700">
            {{ t("messages.composeForm.recipient") }}
          </label>

          <div
            v-if="selectedRecipient"
            class="border-chamilo-200 mt-2 flex min-h-touch items-center justify-between gap-3 rounded-xl border bg-chamilo-50 px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">
                {{ selectedRecipient.fullName }}
              </p>
              <p v-if="selectedRecipient.username" class="truncate text-xs text-slate-500">
                @{{ selectedRecipient.username }}
              </p>
            </div>
            <button
              v-if="!props.recipientId"
              type="button"
              class="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-600"
              :aria-label="t('messages.composeForm.changeRecipient')"
              @click="clearRecipient"
            >
              <i class="pi pi-times" aria-hidden="true" />
            </button>
          </div>

          <div v-else class="mt-2">
            <div class="flex gap-2">
              <input
                v-model="recipientQuery"
                name="message_recipient_search"
                type="search"
                autocomplete="off"
                class="min-h-touch min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100"
                :placeholder="t('messages.composeForm.recipientPlaceholder')"
              />
              <button
                type="button"
                class="min-h-touch rounded-xl bg-slate-800 px-4 font-semibold text-white"
                :disabled="busy"
                @click="searchRecipients"
              >
                <i
                  :class="recipientStatus === 'loading' ? 'pi pi-spin pi-spinner' : 'pi pi-search'"
                  aria-hidden="true"
                />
                <span class="sr-only">{{ t("messages.composeForm.searchRecipient") }}</span>
              </button>
            </div>

            <ul
              v-if="recipients.length > 0"
              class="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200"
            >
              <li v-for="recipient in recipients" :key="recipient.id">
                <button
                  type="button"
                  class="flex min-h-touch w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50"
                  @click="chooseRecipient(recipient)"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold text-slate-900">
                      {{ recipient.fullName }}
                    </span>
                    <span class="block truncate text-xs text-slate-500">
                      @{{ recipient.username }}
                    </span>
                  </span>
                  <i class="pi pi-chevron-right text-slate-400" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </div>
        </div>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">
            {{ t("messages.composeForm.subject") }}
          </span>
          <input
            v-model="title"
            name="message_subject"
            type="text"
            maxlength="255"
            class="mt-2 min-h-touch w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">
            {{ t("messages.composeForm.content") }}
          </span>
          <textarea
            v-model="content"
            name="message_content"
            rows="10"
            class="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 leading-6 outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100"
          />
        </label>

        <p
          v-if="validationMessage || serviceError"
          class="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {{ validationMessage ?? serviceError }}
        </p>

        <button
          type="submit"
          class="flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-chamilo-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
          :disabled="busy"
        >
          <i
            :class="mutationStatus === 'loading' ? 'pi pi-spin pi-spinner' : 'pi pi-send'"
            aria-hidden="true"
          />
          {{
            mutationStatus === "loading"
              ? t("messages.composeForm.sending")
              : t("messages.composeForm.send")
          }}
        </button>
      </form>
    </section>
  </div>
</template>
