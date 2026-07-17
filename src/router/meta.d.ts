import "vue-router"

declare module "vue-router" {
  interface RouteMeta {
    titleKey: string
    showBottomNavigation: boolean
    requiresCampus: boolean
    requiresAuth: boolean
    guestOnly?: boolean
  }
}
