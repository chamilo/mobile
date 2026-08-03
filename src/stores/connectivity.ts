import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { CampusReachability } from "@/domain/offline/types"
import { registerCampusRequestListener } from "@/services/offline/CampusRequestMonitor"

interface CampusReachabilityRecord {
  status: CampusReachability
  checkedAt: string | null
}

export const useConnectivityStore = defineStore("connectivity", () => {
  const deviceOnline = ref(typeof navigator === "undefined" ? true : navigator.onLine)
  const activeCampusId = ref<string | null>(null)
  const campusRecords = ref<Record<string, CampusReachabilityRecord>>({})
  const initialized = ref(false)

  const campusReachability = computed<CampusReachability>(() => {
    if (!activeCampusId.value) return "unknown"

    return campusRecords.value[activeCampusId.value]?.status ?? "unknown"
  })
  const campusCheckedAt = computed(() => {
    if (!activeCampusId.value) return null

    return campusRecords.value[activeCampusId.value]?.checkedAt ?? null
  })
  const isOnline = computed(() => deviceOnline.value)
  const campusAvailable = computed(
    () => deviceOnline.value && campusReachability.value !== "unreachable",
  )

  function updateDeviceStatus(): void {
    deviceOnline.value = typeof navigator === "undefined" ? true : navigator.onLine

    if (!deviceOnline.value && activeCampusId.value) {
      campusRecords.value = {
        ...campusRecords.value,
        [activeCampusId.value]: {
          status: "unreachable",
          checkedAt: new Date().toISOString(),
        },
      }
    }
  }

  function setActiveCampus(campusId: string | null): void {
    activeCampusId.value = campusId
  }

  function initialize(): void {
    if (initialized.value || typeof window === "undefined") return

    window.addEventListener("online", updateDeviceStatus)
    window.addEventListener("offline", updateDeviceStatus)
    registerCampusRequestListener((event) => {
      campusRecords.value = {
        ...campusRecords.value,
        [event.campusId]: {
          status: event.status,
          checkedAt: event.checkedAt,
        },
      }
    })
    updateDeviceStatus()
    initialized.value = true
  }

  return {
    deviceOnline,
    activeCampusId,
    campusReachability,
    campusCheckedAt,
    campusAvailable,
    isOnline,
    initialized,
    initialize,
    setActiveCampus,
  }
})
