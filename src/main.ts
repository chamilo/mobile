import { createApp } from "vue"
import { createPinia } from "pinia"

import "primeicons/primeicons.css"
import "@/assets/main.css"

import App from "@/App.vue"
import { i18n } from "@/i18n"
import { primeVue } from "@/plugins/primevue"
import { router } from "@/router"
import { registerAuthGuards } from "@/router/authGuards"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"

const pinia = createPinia()
const app = createApp(App)

useCampusStore(pinia).initialize()
useConnectivityStore(pinia).initialize()
registerAuthGuards(router, pinia)

app.use(pinia).use(router).use(i18n).use(primeVue)
app.mount("#app")
