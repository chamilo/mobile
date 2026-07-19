import { describe, expect, it } from "vitest"

import { CourseLinksContractError, normalizeCourseLinksResponse } from "@/domain/links/normalizers"

describe("normalizeCourseLinksResponse", () => {
  it("normalizes the verified uncategorized response", () => {
    expect(
      normalizeCourseLinksResponse({
        linksWithoutCategory: [
          {
            iid: 3,
            title: "Chamilo official website",
            description: "",
            url: "https://chamilo.org",
            target: "_blank",
            position: 1,
            sessionId: null,
          },
        ],
      }),
    ).toEqual({
      uncategorized: [
        {
          iid: 3,
          title: "Chamilo official website",
          description: "",
          url: "https://chamilo.org/",
          target: "_blank",
          position: 1,
          sessionId: null,
        },
      ],
      categories: [],
      totalItems: 1,
    })
  })

  it("normalizes the controller category object keyed by category id", () => {
    const snapshot = normalizeCourseLinksResponse({
      categories: {
        12: {
          info: {
            id: 12,
            title: "References",
            description: "Useful resources",
          },
          links: [
            {
              id: 20,
              iid: 20,
              title: "Reference",
              description: "",
              url: "https://example.org/reference",
              target: "_blank",
              position: 2,
              sessionId: 7,
            },
          ],
        },
      },
    })

    expect(snapshot.categories[0]).toEqual({
      iid: 12,
      title: "References",
      description: "Useful resources",
      links: [
        {
          iid: 20,
          title: "Reference",
          description: "",
          url: "https://example.org/reference",
          target: "_blank",
          position: 2,
          sessionId: 7,
        },
      ],
    })
  })

  it("rejects unsafe URLs returned by the campus", () => {
    expect(() =>
      normalizeCourseLinksResponse({
        linksWithoutCategory: [
          {
            iid: 3,
            title: "Unsafe",
            url: "javascript:alert(1)",
          },
        ],
      }),
    ).toThrow(CourseLinksContractError)
  })
})
