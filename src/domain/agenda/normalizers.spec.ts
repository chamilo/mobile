import { describe, expect, it } from "vitest"

import { AgendaContractError, normalizeAgendaResponse } from "@/domain/agenda/normalizers"

describe("normalizeAgendaResponse", () => {
  it("normalizes the verified Hydra contract", () => {
    const snapshot = normalizeAgendaResponse({
      "hydra:member": [
        {
          id: "calendar_event_5",
          title: "Class",
          content: "<p>Introduction</p>",
          startDate: "2026-07-20T15:00:00+00:00",
          endDate: "2026-07-20T16:00:00+00:00",
          allDay: false,
          color: "#458B00",
          type: "course",
          room: {
            id: 2,
            title: "Room A",
            branchTitle: "Main branch",
          },
          resourceNode: { id: 77 },
        },
      ],
      "hydra:totalItems": 1,
    })

    expect(snapshot.items[0]).toEqual({
      id: "calendar_event_5",
      title: "Class",
      content: "<p>Introduction</p>",
      startDate: "2026-07-20T15:00:00+00:00",
      endDate: "2026-07-20T16:00:00+00:00",
      allDay: false,
      color: "#458B00",
      type: "course",
      room: {
        id: 2,
        title: "Room A",
        branchTitle: "Main branch",
      },
      resourceNodeId: 77,
    })
  })

  it("rejects invalid dates", () => {
    expect(() =>
      normalizeAgendaResponse({
        "hydra:member": [
          {
            id: "calendar_event_1",
            title: "Invalid",
            startDate: "not-a-date",
            endDate: "2026-07-20T16:00:00+00:00",
          },
        ],
      }),
    ).toThrow(AgendaContractError)
  })
})
