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
import {
  registerActiveCampusSessionResetListener,
  registerAuthenticatedCampusSessionListener,
  registerBeforeCampusSessionClearListener,
} from "@/services/auth/AuthSessionLifecycle"
import { browserCampusCacheRepository } from "@/services/cache/BrowserCampusCacheRepository"
import { registerNativeAppListeners } from "@/services/native/registerNativeAppListeners"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"
import { usePushNotificationsStore } from "@/stores/pushNotifications"

const pinia = createPinia()
const app = createApp(App)

registerCampusSessionDataCleaner((campusId) => browserCampusCacheRepository.clearCampus(campusId))

useCampusStore(pinia).initialize()
useConnectivityStore(pinia).initialize()
const pushNotificationsStore = usePushNotificationsStore(pinia)
void pushNotificationsStore.initialize(router)
registerAuthenticatedCampusSessionListener((campus, userId) =>
  pushNotificationsStore.activateSession(campus, userId),
)
registerBeforeCampusSessionClearListener((campus) =>
  pushNotificationsStore.deactivateSession(campus),
)
registerActiveCampusSessionResetListener(() => pushNotificationsStore.suspendActiveSession())
registerAuthGuards(router, pinia)

app.use(pinia).use(router).use(i18n).use(primeVue)
app.mount("#app")

void registerNativeAppListeners(router)
