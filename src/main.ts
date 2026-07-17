import { createApp } from "vue"
import { createPinia } from "pinia"

import "primeicons/primeicons.css"
import "@/assets/main.css"

import App from "@/App.vue"
import { i18n } from "@/i18n"
import { primeVue } from "@/plugins/primevue"
import { router } from "@/router"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"

const pinia = createPinia()
const app = createApp(App)

app.use(pinia).use(router).use(i18n).use(primeVue)

useCampusStore(pinia).initialize()
useConnectivityStore(pinia).initialize()

app.mount("#app")
