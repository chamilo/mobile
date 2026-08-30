import { createI18n } from "vue-i18n"

import en from "@/i18n/locales/en"
import esOverrides from "@/i18n/locales/es"
import feedbackEn from "@/i18n/locales/feedback.en"
import frOverrides from "@/i18n/locales/fr_FR"
import { mergeMessages } from "@/i18n/mergeMessages"

const englishMessages = mergeMessages(en, feedbackEn)
const spanishMessages = mergeMessages(englishMessages, esOverrides)
const frenchMessages = mergeMessages(englishMessages, frOverrides)

const bundledMessages = {
  "en-US": englishMessages,
  es: spanishMessages,
  "fr-FR": frenchMessages,
}

export type InterfaceBundleLocale = keyof typeof bundledMessages

export const i18n = createI18n({
  legacy: false,
  locale: "en-US",
  fallbackLocale: "en-US",
  messages: bundledMessages,
})

export function applyInterfaceLocale(
  locale: string,
  bundleLocale: InterfaceBundleLocale,
): void {
  // vue-i18n only needs the bundled message locale. Keep the resolved BCP-47
  // locale separately on the document so regional/custom Chamilo locales do
  // not have to be registered as duplicate message bundles at runtime.
  i18n.global.locale.value = bundleLocale

  if (typeof document !== "undefined") {
    document.documentElement.lang = locale
  }
}
