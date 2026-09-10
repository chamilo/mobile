/// <reference types="@capacitor/push-notifications" />

import type { CapacitorConfig } from "@capacitor/cli"

const pushNotificationsEnabled = process.env.CHAMILO_ENABLE_PUSH === "1"
const pushClientEnabled = process.env.VITE_PUSH_NOTIFICATIONS_ENABLED === "true"

if (pushNotificationsEnabled !== pushClientEnabled) {
  throw new Error(
    "Native push notifications require CHAMILO_ENABLE_PUSH=1 and VITE_PUSH_NOTIFICATIONS_ENABLED=true together.",
  )
}

const androidPlugins = ["@capacitor/app"]
const iosPlugins = ["@capacitor/app"]

if (pushNotificationsEnabled) {
  androidPlugins.push("@capacitor/push-notifications")
  iosPlugins.push("@capacitor/push-notifications")
}

const config: CapacitorConfig = {
  appId: "org.chamilo.mobile",
  appName: "Chamilo Mobile",
  webDir: "dist",
  android: {
    includePlugins: androidPlugins,
  },
  ios: {
    includePlugins: iosPlugins,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["sound", "alert"],
    },
  },
}

export default config
