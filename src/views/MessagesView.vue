<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { storeToRefs } from "pinia"
import { useI18n } from "vue-i18n"

import EmptyState from "@/components/states/EmptyState.vue"
import ErrorState from "@/components/states/ErrorState.vue"
import LoadingState from "@/components/states/LoadingState.vue"
import type { MessageBox, MobileMessage } from "@/domain/messages/types"
import { useMessagesStore } from "@/stores/messages"

const { t } = useI18n()
const messagesStore = useMessagesStore()
const { listStatus, mutationStatus, currentBox, items, errorCode } = storeToRefs(messagesStore)
const search = ref("")
const unreadOnly = ref(false)
const starredOnly = ref(false)

const errorMessage = computed(() =>
  errorCode.value ? t(`messages.errors.${errorCode.value}`) : t("messages.errors.server"),
)
const isBusy = computed(() => listStatus.value === "loading" || mutationStatus.value === "loading")

function formatDate(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
}

async function load(box: MessageBox = currentBox.value): Promise<void> {
  await messagesStore.loadList(box, {
    search: search.value,
    unread: box === "inbox" && unreadOnly.value ? true : undefined,
    starred: starredOnly.value ? true : undefined,
  })
}

async function selectBox(box: MessageBox): Promise<void> {
  unreadOnly.value = false
  await load(box)
}

async function removeMessage(message: MobileMessage): Promise<void> {
  if (!globalThis.confirm(t("messages.deleteConfirmation"))) {
    return
  }

  await messagesStore.remove(message.id)
}

onMounted(() => load("inbox"))
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-2xl bg-chamilo-900 p-5 text-white shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-chamilo-100">
            {{ t("messages.eyebrow") }}
          </p>
          <h2 class="mt-1 text-2xl font-semibold">{{ t("messages.title") }}</h2>
          <p class="mt-2 text-sm leading-6 text-chamilo-100">
            {{ t("messages.description") }}
          </p>
        </div>

        <RouterLink
          :to="{ name: 'message-compose' }"
          class="flex min-h-touch shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-chamilo-900"
        >
          <i class="pi pi-pencil" aria-hidden="true" />
          {{ t("messages.compose") }}
        </RouterLink>
      </div>
    </section>

    <section class="rounded-2xl bg-white p-4 shadow-sm">
      <div class="grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist">
        <button
          v-for="box in ['inbox', 'sent'] as MessageBox[]"
          :key="box"
          type="button"
          class="min-h-touch rounded-lg px-3 py-2 text-sm font-semibold transition"
          :class="
            currentBox === box
              ? 'text-chamilo-800 bg-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          "
          role="tab"
          :aria-selected="currentBox === box"
          @click="selectBox(box)"
        >
          {{ t(`messages.boxes.${box}`) }}
        </button>
      </div>

      <form class="mt-4 space-y-3" @submit.prevent="load()">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">{{ t("messages.search") }}</span>
          <div class="mt-1 flex gap-2">
            <input
              v-model="search"
              name="message_search"
              type="search"
              class="min-h-touch min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-chamilo-600 focus:ring-2 focus:ring-chamilo-100"
              :placeholder="t('messages.searchPlaceholder')"
            />
            <button
              type="submit"
              class="min-h-touch rounded-xl bg-chamilo-700 px-4 text-sm font-semibold text-white"
              :disabled="isBusy"
            >
              <i class="pi pi-search" aria-hidden="true" />
              <span class="sr-only">{{ t("messages.search") }}</span>
            </button>
          </div>
        </label>

        <div class="flex flex-wrap gap-4">
          <label v-if="currentBox === 'inbox'" class="flex min-h-touch items-center gap-2 text-sm">
            <input v-model="unreadOnly" name="unread_only" type="checkbox" class="size-5" />
            {{ t("messages.unreadOnly") }}
          </label>
          <label class="flex min-h-touch items-center gap-2 text-sm">
            <input v-model="starredOnly" name="starred_only" type="checkbox" class="size-5" />
            {{ t("messages.starredOnly") }}
          </label>
          <button
            type="button"
            class="min-h-touch text-sm font-semibold text-chamilo-700"
            :disabled="isBusy"
            @click="load()"
          >
            {{ t("messages.applyFilters") }}
          </button>
        </div>
      </form>
    </section>

    <LoadingState v-if="listStatus === 'loading'" :label="t('messages.loading')" />

    <ErrorState
      v-else-if="listStatus === 'error'"
      :title="t('messages.errorTitle')"
      :description="errorMessage"
      :retry-label="t('messages.retry')"
      @retry="load()"
    />

    <EmptyState
      v-else-if="listStatus === 'ready' && items.length === 0"
      :title="t('messages.emptyTitle')"
      :description="t('messages.emptyDescription')"
    />

    <section v-else class="space-y-3" :aria-label="t(`messages.boxes.${currentBox}`)">
      <article
        v-for="message in items"
        :key="message.id"
        class="overflow-hidden rounded-2xl border bg-white shadow-sm"
        :class="
          !message.read && message.box === 'inbox' ? 'border-chamilo-300' : 'border-slate-200'
        "
      >
        <RouterLink
          :to="{ name: 'message-detail', params: { messageId: message.id } }"
          class="block p-4 transition hover:bg-slate-50"
        >
          <div class="flex items-start gap-3">
            <span
              class="mt-1 size-2.5 shrink-0 rounded-full"
              :class="!message.read && message.box === 'inbox' ? 'bg-chamilo-600' : 'bg-slate-300'"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <p class="truncate text-sm font-semibold text-slate-900">
                  {{
                    message.box === "sent" ? message.recipientNames.join(", ") : message.senderName
                  }}
                </p>
                <time class="shrink-0 text-xs text-slate-500" :datetime="message.sendDate">
                  {{ formatDate(message.sendDate) }}
                </time>
              </div>
              <h3 class="mt-1 truncate font-semibold text-slate-900">
                {{ message.title }}
              </h3>
              <p class="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                {{ message.preview }}
              </p>
            </div>
          </div>
        </RouterLink>

        <div class="flex justify-end gap-1 border-t border-slate-100 px-2 py-1">
          <button
            type="button"
            class="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-amber-600 hover:bg-amber-50"
            :aria-label="
              message.starred ? t('messages.actions.unstar') : t('messages.actions.star')
            "
            :disabled="mutationStatus === 'loading'"
            @click="messagesStore.setStarred(message, !message.starred)"
          >
            <i :class="message.starred ? 'pi pi-star-fill' : 'pi pi-star'" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
            :aria-label="t('messages.actions.delete')"
            :disabled="mutationStatus === 'loading'"
            @click="removeMessage(message)"
          >
            <i class="pi pi-trash" aria-hidden="true" />
          </button>
        </div>
      </article>
    </section>
  </div>
</template>
