// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import { filterTranslatedHtml, translatedPlainText } from "@/domain/content/translatedHtml"

describe("translated HTML", () => {
  it("keeps only the viewer language when a matching translate_html block exists", () => {
    const html = [
      '<span class="mce-translatehtml" lang="en_US">English answer</span>',
      '<span class="mce-translatehtml" lang="fr_FR">Réponse française</span>',
      '<span class="mce-translatehtml" lang="es">Respuesta española</span>',
    ].join("")

    expect(translatedPlainText(html, "en_US")).toBe("English answer")
  })

  it("matches a regional viewer locale against its ISO language block", () => {
    const html = [
      '<span class="mce-translatehtml" lang="en">English</span>',
      '<span class="mce-translatehtml" lang="fr">Français</span>',
    ].join("")

    expect(translatedPlainText(html, "fr_FR")).toBe("Français")
  })

  it("prefers an exact regional translation before its generic language", () => {
    const html = [
      '<span class="mce-translatehtml" lang="es">Español genérico</span>',
      '<span class="mce-translatehtml" lang="es_MX">Español de México</span>',
    ].join("")

    expect(translatedPlainText(html, "es_MX")).toBe("Español de México")
  })

  it("falls back to the course language when the viewer locale is unavailable", () => {
    const html = [
      '<span class="mce-translatehtml" lang="de">Deutsch</span>',
      '<span class="mce-translatehtml" lang="es">Español</span>',
    ].join("")

    expect(translatedPlainText(html, "fr_FR", ["es"])).toBe("Español")
  })

  it("falls back independently to the first language in each sibling group", () => {
    const html = [
      '<div><span class="mce-translatehtml" lang="de">Titel</span><span class="mce-translatehtml" lang="es">Título</span></div>',
      '<div><span class="mce-translatehtml" lang="fr">Texte</span><span class="mce-translatehtml" lang="it">Testo</span></div>',
    ].join("")

    expect(translatedPlainText(html, "en_US")).toBe("Titel Texte")
  })

  it("supports legacy lang spans without the editor class", () => {
    const html = '<span lang="en">Hello</span><span lang="es">Hola</span>'

    expect(filterTranslatedHtml(html, "es")).toContain("Hola")
    expect(translatedPlainText(html, "es")).toBe("Hola")
  })
})
