import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "org.chamilo.mobile",
  appName: "Chamilo Mobile",
  webDir: "dist",
  android: {
    includePlugins: ["@capacitor/app"],
  },
}

export default config
