import { ref } from "vue"
import { defineStore } from "pinia"

export const useConnectivityStore = defineStore("connectivity", () => {
  const isOnline = ref(typeof navigator === "undefined" ? true : navigator.onLine)
  const initialized = ref(false)

  function updateOnlineStatus(): void {
    isOnline.value = navigator.onLine
  }

  function initialize(): void {
    if (initialized.value || typeof window === "undefined") {
      return
    }

    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)
    updateOnlineStatus()
    initialized.value = true
  }

  return {
    isOnline,
    initialized,
    initialize,
  }
})
