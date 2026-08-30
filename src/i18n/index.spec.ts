// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest"

import { applyInterfaceLocale, i18n } from "@/i18n"

describe("mobile interface locale", () => {
  afterEach(() => {
    applyInterfaceLocale("en-US", "en-US")
  })

  it("uses the Spanish bundle for a regional Spanish locale", () => {
    applyInterfaceLocale("es-MX", "es")

    expect(i18n.global.locale.value).toBe("es")
    expect(i18n.global.t("routes.courses")).toBe("Mis cursos")
    expect(i18n.global.t("routes.learningPaths")).toBe("Lecciones")
    expect(document.documentElement.lang).toBe("es-MX")
  })

  it("uses Chamilo French terminology for the French interface", () => {
    applyInterfaceLocale("fr-FR", "fr-FR")

    expect(i18n.global.t("routes.courses")).toBe("Mes cours")
    expect(i18n.global.t("routes.assignments")).toBe("Travaux")
    expect(i18n.global.t("routes.gradebook")).toBe("Cahier de notes")
    expect(i18n.global.t("courseProgress.description")).toContain("plan thématique")
    expect(i18n.global.t("learningPaths.progressSaved")).toBe(
      "La progression est enregistrée automatiquement.",
    )
    expect(i18n.global.t("forums.write.reply")).toBe("Répondre")
    expect(i18n.global.t("notebook.errors.access_denied")).toContain("lecture seule")
  })

  it("keeps recipient search feedback localized in Spanish", () => {
    applyInterfaceLocale("es-PE", "es")

    expect(i18n.global.t("messages.composeForm.recipientSearching")).toBe(
      "Buscando destinatarios...",
    )
    expect(i18n.global.t("messages.composeForm.recipientNoResults")).toContain(
      "No se encontraron destinatarios",
    )
  })
})
