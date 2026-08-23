import { createI18n } from "vue-i18n"

import en from "@/i18n/locales/en"
import feedbackEn from "@/i18n/locales/feedback.en"

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en,
  },
})

i18n.global.mergeLocaleMessage("en", feedbackEn)
