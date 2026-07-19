import { describe, expect, it } from "vitest"

import {
  buildAssignmentCommentsRequest,
  buildAssignmentRequest,
  buildAssignmentsRequest,
  buildAssignmentSubmissionsRequest,
  normalizeAssignmentCollection,
  normalizeAssignmentDetail,
  resolveAssignmentAvailability,
} from "@/domain/assignments/contracts"

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

describe("assignment contracts", () => {
  it("builds the verified assignment requests", () => {
    expect(buildAssignmentsRequest(directContext)).toEqual({
      path: "/assignments/student",
      query: {
        cid: 16,
      },
    })

    expect(buildAssignmentRequest(sessionContext, 8)).toEqual({
      path: "/api/c_student_publications/8",
      query: {
        cid: 16,
        sid: 4,
      },
    })

    expect(buildAssignmentSubmissionsRequest(sessionContext, 8)).toEqual({
      path: "/assignments/8/submissions",
      query: {
        cid: 16,
        sid: 4,
        page: 1,
        itemsPerPage: 100,
        "order[sentDate]": "desc",
      },
    })

    expect(buildAssignmentCommentsRequest(sessionContext, 12)).toEqual({
      path: "/api/c_student_publication_comments",
      query: {
        cid: 16,
        sid: 4,
        "publication.iid": 12,
        itemsPerPage: 5000,
      },
    })
  })

  it("normalizes the visible assignment list", () => {
    const result = normalizeAssignmentCollection({
      "hydra:member": [
        {
          iid: 8,
          title: "Final report",
          description: "<p>Upload the final report.</p>",
          sentDate: "2026-07-01T10:00:00+00:00",
          qualification: 20,
          weight: 30,
          allowTextAssignment: 1,
          extensions: "pdf, docx",
          uniqueStudentAttemptsTotal: 4,
          lastUpload: "2026-07-18T10:00:00+00:00",
          assignment: {
            expiresOn: "2026-07-20T23:59:00+00:00",
            endsOn: "2026-07-22T23:59:00+00:00",
          },
        },
      ],
      "hydra:totalItems": 1,
    })

    expect(result.totalItems).toBe(1)
    expect(result.items[0]).toMatchObject({
      id: 8,
      title: "Final report",
      description: "Upload the final report.",
      maximumScore: 20,
      gradebookWeight: 30,
      textSubmissionAllowed: true,
      allowedExtensions: ["pdf", "docx"],
      submittedStudentCount: 4,
    })
  })

  it("resolves open, late and closed deadlines", () => {
    const now = new Date("2026-07-21T12:00:00+00:00")

    expect(
      resolveAssignmentAvailability("2026-07-22T12:00:00+00:00", "2026-07-23T12:00:00+00:00", now),
    ).toBe("open")

    expect(
      resolveAssignmentAvailability("2026-07-20T12:00:00+00:00", "2026-07-22T12:00:00+00:00", now),
    ).toBe("late")

    expect(
      resolveAssignmentAvailability("2026-07-19T12:00:00+00:00", "2026-07-20T12:00:00+00:00", now),
    ).toBe("closed")

    expect(resolveAssignmentAvailability(null, null, now)).toBe("unscheduled")
  })

  it("normalizes own submissions, feedback and corrections", () => {
    const comments = new Map([
      [
        12,
        [
          {
            id: 3,
            text: "Good progress",
            sentAt: "2026-07-18T12:00:00.000Z",
            authorName: "Teacher One",
            fileName: null,
            downloadUrl: null,
          },
        ],
      ],
    ])

    const result = normalizeAssignmentDetail(
      {
        iid: 8,
        title: "Final report",
        description: "<p>Upload the final report.</p>",
        qualification: 20,
        weight: 30,
        allowTextAssignment: 1,
        assignment: {
          expiresOn: "2026-07-20T23:59:00+00:00",
          endsOn: "2026-07-22T23:59:00+00:00",
        },
      },
      {
        "hydra:member": [
          {
            iid: 12,
            title: "report.pdf",
            description: "<p>My final report</p>",
            sentDate: "2026-07-18T10:00:00+00:00",
            qualification: 17,
            containsFile: 1,
            downloadUrl: "/r/student_publication/12/download",
            correctionTitle: "corrected-report.pdf",
            correctionDownloadUrl: "/r/student_publication/correction/12/download",
          },
        ],
      },
      comments,
    )

    expect(result.assignment).toMatchObject({
      id: 8,
      maximumScore: 20,
    })
    expect(result.submissions[0]).toMatchObject({
      id: 12,
      title: "report.pdf",
      description: "My final report",
      score: 17,
      maximumScore: 20,
      hasFile: true,
      correctionTitle: "corrected-report.pdf",
    })
    expect(result.submissions[0]?.comments[0]).toMatchObject({
      id: 3,
      text: "Good progress",
      authorName: "Teacher One",
    })
  })
})
