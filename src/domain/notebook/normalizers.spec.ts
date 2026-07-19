import { describe, expect, it } from "vitest"
import {
  normalizeNotebookFormResponse,
  normalizeNotebookListResponse,
} from "@/domain/notebook/normalizers"

describe("notebook normalizers", () => {
  it("normalizes a writable list", () => {
    const result = normalizeNotebookListResponse({
      courseId: 1,
      sessionId: null,
      canWrite: true,
      studentView: false,
      csrfToken: "token",
      sort: "creation_date",
      direction: "ASC",
      totalItems: 1,
      items: [
        {
          iid: 2,
          title: "Note",
          content: "Body",
          creationDate: "2026-07-17T00:00:00+00:00",
          updateDate: null,
          sessionId: null,
          language: "en",
          canEdit: true,
          canDelete: true,
        },
      ],
    })
    expect(result.items[0]?.iid).toBe(2)
    expect(result.csrfToken).toBe("token")
  })
  it("drops csrf for read-only forms", () => {
    const result = normalizeNotebookFormResponse({
      iid: null,
      title: "",
      content: "",
      language: "en",
      canWrite: false,
      isNew: true,
      fullEditor: true,
      csrfToken: "unexpected",
      languages: [],
    })
    expect(result.csrfToken).toBeNull()
  })
})
