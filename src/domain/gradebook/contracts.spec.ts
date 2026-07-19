import { describe, expect, it } from "vitest"

import {
  buildGradebookCertificatesRequest,
  buildGradebookSummaryRequest,
  normalizeGradebookCertificates,
  normalizeGradebookOverview,
  normalizeGradebookSummary,
} from "@/domain/gradebook/contracts"

const directContext = {
  courseId: 16,
  sessionId: null,
  membershipId: 70,
  sessionCourseId: null,
  source: "direct" as const,
}

const sessionContext = {
  courseId: 16,
  sessionId: 4,
  membershipId: null,
  sessionCourseId: 9,
  source: "session" as const,
}

describe("gradebook contracts", () => {
  it("builds the verified tracking requests", () => {
    expect(buildGradebookSummaryRequest(directContext, 17)).toEqual({
      path: "/api/tracking/user_gradebook_result_in_course_and_session",
      query: {
        userId: 17,
        courseId: 16,
      },
    })

    expect(buildGradebookCertificatesRequest(sessionContext, 17)).toEqual({
      path: "/api/tracking/user_certificates_in_course_and_session",
      query: {
        userId: 17,
        courseId: 16,
        sessionId: 4,
      },
    })
  })

  it("normalizes the global result and certificate threshold", () => {
    expect(
      normalizeGradebookSummary({
        score: 17.5,
        max: 20,
        percentage: 87.5,
        min: 60,
      }),
    ).toEqual({
      score: 17.5,
      maximumScore: 20,
      percentage: 87.5,
      minimumPercentage: 60,
      hasResult: true,
      thresholdMet: true,
    })

    expect(
      normalizeGradebookSummary({
        score: "8",
        max: "20",
        percentage: "40",
        min: "60",
      }),
    ).toMatchObject({
      hasResult: true,
      thresholdMet: false,
    })
  })

  it("treats a zero maximum as no calculated result", () => {
    expect(
      normalizeGradebookSummary({
        score: 0,
        max: 0,
        percentage: 0,
        min: 60,
      }),
    ).toEqual({
      score: 0,
      maximumScore: 0,
      percentage: 0,
      minimumPercentage: 60,
      hasResult: false,
      thresholdMet: null,
    })
  })

  it("normalizes certificates without exposing download URLs", () => {
    const certificates = normalizeGradebookCertificates({
      "hydra:member": [
        {
          id: 9,
          title: "<p>Course certificate</p>",
          issuedAt: "2026-07-19T02:00:00+00:00",
          downloadUrl: "/certificates/private-hash.html",
        },
      ],
      "hydra:totalItems": 1,
    })

    expect(certificates).toEqual([
      {
        id: 9,
        title: "Course certificate",
        issuedAt: "2026-07-19T02:00:00.000Z",
        downloadAvailable: true,
      },
    ])
    expect(certificates[0]).not.toHaveProperty("downloadUrl")
  })

  it("normalizes the complete read-only overview", () => {
    expect(
      normalizeGradebookOverview(
        {
          score: 17,
          max: 20,
          percentage: 85,
          min: 60,
        },
        [],
      ),
    ).toMatchObject({
      summary: {
        hasResult: true,
        thresholdMet: true,
      },
      certificates: [],
    })
  })
})
