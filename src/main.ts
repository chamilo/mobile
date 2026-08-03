import { createApp, watch } from "vue"
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
import { clearOfflineCampusData } from "@/services/offline/clearOfflineCampusData"
import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"
import { useConnectivityStore } from "@/stores/connectivity"
import { useOfflineSyncStore } from "@/stores/offlineSync"
import { usePushNotificationsStore } from "@/stores/pushNotifications"

const pinia = createPinia()
const app = createApp(App)

registerCampusSessionDataCleaner((campusId) => browserCampusCacheRepository.clearCampus(campusId))
registerCampusSessionDataCleaner(clearOfflineCampusData)

const campusStore = useCampusStore(pinia)
const connectivityStore = useConnectivityStore(pinia)
const authStore = useAuthStore(pinia)
const offlineSyncStore = useOfflineSyncStore(pinia)

campusStore.initialize()
connectivityStore.initialize()
connectivityStore.setActiveCampus(campusStore.selectedCampusId)

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

watch(
  () => campusStore.selectedCampusId,
  (campusId) => connectivityStore.setActiveCampus(campusId),
)

watch(
  [() => authStore.status, () => authStore.currentCampusId, () => authStore.profile?.id],
  ([status, campusId, userId]) => {
    const campus = campusStore.profiles.find((candidate) => candidate.id === campusId)

    if (status === "authenticated" && campus && userId) {
      void offlineSyncStore.activateSession(campus, userId).then(() => {
        if (connectivityStore.deviceOnline && !authStore.isOfflineSession) {
          void offlineSyncStore.syncNow("session")
        }
      })
      return
    }

    offlineSyncStore.deactivateSession(campusId ?? undefined)
  },
  { immediate: true },
)

watch(
  () => connectivityStore.deviceOnline,
  (online, wasOnline) => {
    if (online && wasOnline === false && authStore.isAuthenticated) {
      void offlineSyncStore.syncNow("connectivity")
    }
  },
)

app.use(pinia).use(router).use(i18n).use(primeVue)
app.mount("#app")

void registerNativeAppListeners(router, () => {
  if (authStore.isAuthenticated && connectivityStore.deviceOnline) {
    return offlineSyncStore.syncNow("foreground").then(() => undefined)
  }

  return undefined
})
