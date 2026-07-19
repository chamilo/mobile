import { describe, expect, it } from "vitest"

import { agendaEventPeriod, groupAgendaEvents } from "@/domain/agenda/presentation"
import type { AgendaEvent } from "@/domain/agenda/types"

const baseEvent: AgendaEvent = {
  id: "calendar_event_1",
  title: "Event",
  content: "",
  startDate: "2026-07-17T10:00:00+00:00",
  endDate: "2026-07-17T11:00:00+00:00",
  allDay: false,
  color: null,
  type: "course",
  room: null,
  resourceNodeId: null,
}

describe("agenda presentation", () => {
  it("classifies current, upcoming and past events", () => {
    const now = new Date("2026-07-17T10:30:00+00:00")

    expect(agendaEventPeriod(baseEvent, now)).toBe("current")
    expect(
      agendaEventPeriod(
        {
          ...baseEvent,
          startDate: "2026-07-18T10:00:00+00:00",
          endDate: "2026-07-18T11:00:00+00:00",
        },
        now,
      ),
    ).toBe("upcoming")
    expect(
      agendaEventPeriod(
        {
          ...baseEvent,
          startDate: "2026-07-16T10:00:00+00:00",
          endDate: "2026-07-16T11:00:00+00:00",
        },
        now,
      ),
    ).toBe("past")
  })

  it("groups events by period", () => {
    const groups = groupAgendaEvents(
      [
        baseEvent,
        {
          ...baseEvent,
          id: "calendar_event_2",
          startDate: "2026-07-18T10:00:00+00:00",
          endDate: "2026-07-18T11:00:00+00:00",
        },
      ],
      new Date("2026-07-17T10:30:00+00:00"),
    )

    expect(groups.current).toHaveLength(1)
    expect(groups.upcoming).toHaveLength(1)
    expect(groups.past).toHaveLength(0)
  })
})
