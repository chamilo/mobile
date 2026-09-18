import { describe, expect, it } from "vitest"

import { sanitizeAnnouncementHtml } from "@/domain/announcements/sanitizeAnnouncementHtml"

describe("sanitizeAnnouncementHtml", () => {
  it("removes scripts, inline handlers and unsafe protocols", () => {
    const sanitized = sanitizeAnnouncementHtml(
      '<p onclick="alert(1)">Hello<script>alert(1)</script><a href="javascript:alert(1)">bad</a></p>',
      "https://campus.example.org",
    )

    expect(sanitized).toContain("Hello")
    expect(sanitized).not.toContain("script")
    expect(sanitized).not.toContain("onclick")
    expect(sanitized).not.toContain("javascript:")
  })

  it("resolves safe links and adds external-link protections", () => {
    const sanitized = sanitizeAnnouncementHtml(
      '<a href="/main/document/file.pdf">Document</a>',
      "https://campus.example.org",
    )

    expect(sanitized).toContain('href="https://campus.example.org/main/document/file.pdf"')
    expect(sanitized).toContain('target="_blank"')
    expect(sanitized).toContain('rel="noopener noreferrer nofollow"')
  })

  it("allows only same-campus images", () => {
    const sanitized = sanitizeAnnouncementHtml(
      '<img src="/courses/image.png" alt="Course"><img src="https://tracker.example.org/pixel.png">',
      "https://campus.example.org",
    )

    expect(sanitized).toContain('src="https://campus.example.org/courses/image.png"')
    expect(sanitized).not.toContain("tracker.example.org")
  })


  it("filters translated HTML before sanitizing the selected language", () => {
    const sanitized = sanitizeAnnouncementHtml(
      [
        '<div class="mce-translatehtml" lang="en"><p>English content</p></div>',
        '<div class="mce-translatehtml" lang="es"><p>Contenido español</p></div>',
      ].join(""),
      "https://campus.example.org",
      "es",
      ["en_US"],
    )

    expect(sanitized).toContain("Contenido español")
    expect(sanitized).not.toContain("English content")
    expect(sanitized).not.toContain("mce-translatehtml")
  })

})
