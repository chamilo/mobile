import type { Pinia } from "pinia"
import type { Router } from "vue-router"

import { useAuthStore } from "@/stores/auth"
import { useCampusStore } from "@/stores/campus"

export function registerAuthGuards(router: Router, pinia: Pinia): () => void {
  return router.beforeEach(async (to) => {
    const campusStore = useCampusStore(pinia)
    const authStore = useAuthStore(pinia)

    if (!campusStore.initialized) {
      campusStore.initialize()
    }

    if (to.meta.requiresCampus && !campusStore.selectedCampus) {
      return { name: "campuses" }
    }

    if (to.meta.requiresAuth) {
      const authenticated = await authStore.ensureSession()

      if (!authenticated) {
        return {
          name: "login",
          query: to.fullPath === "/courses" ? undefined : { redirect: to.fullPath },
        }
      }
    }

    if (to.meta.guestOnly && campusStore.selectedCampus && authStore.status !== "error") {
      const authenticated = await authStore.ensureSession()

      if (authenticated) {
        return { name: "courses" }
      }
    }

    return true
  })
}
