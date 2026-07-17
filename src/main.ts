import { createApp } from "vue"
import { createPinia } from "pinia"

import "primeicons/primeicons.css"
import "@/assets/main.css"

import App from "@/App.vue"
import { i18n } from "@/i18n"
import { primeVue } from "@/plugins/primevue"
import { router } from "@/router"
import { registerAuthGuards } from "@/router/authGuards"
import { registerCampusSessionDataCleaner } from "@/services/auth/CampusSessionDataCleaner"
import { browserCampusCacheRepository } from "@/services/cache/BrowserCampusCacheRepository"
import { registerNativeAppListeners } from "@/services/native/registerNativeAppListeners"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"

const pinia = createPinia()
const app = createApp(App)

registerCampusSessionDataCleaner((campusId) => browserCampusCacheRepository.clearCampus(campusId))

useCampusStore(pinia).initialize()
useConnectivityStore(pinia).initialize()
registerAuthGuards(router, pinia)

app.use(pinia).use(router).use(i18n).use(primeVue)
app.mount("#app")

void registerNativeAppListeners(router)
