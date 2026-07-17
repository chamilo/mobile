import { createApp } from "vue"
import { createPinia } from "pinia"

import "primeicons/primeicons.css"
import "@/assets/main.css"

import App from "@/App.vue"
import { i18n } from "@/i18n"
import { primeVue } from "@/plugins/primevue"
import { router } from "@/router"

createApp(App).use(createPinia()).use(router).use(i18n).use(primeVue).mount("#app")
