import type { AgendaEvent } from "@/domain/agenda/types"

export type AgendaEventPeriod = "upcoming" | "current" | "past"

export function agendaEventPeriod(event: AgendaEvent, now = new Date()): AgendaEventPeriod {
  const start = new Date(event.startDate)
  const end = new Date(event.endDate)

  if (end.getTime() < now.getTime()) return "past"
  if (start.getTime() > now.getTime()) return "upcoming"

  return "current"
}

export function formatAgendaDate(
  value: string,
  locale: string,
  timeZone: string,
  allDay: boolean,
): string {
  const date = new Date(value)

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    ...(allDay ? {} : { timeStyle: "short" }),
    timeZone,
  }).format(date)
}

export function groupAgendaEvents(
  events: AgendaEvent[],
  now = new Date(),
): Record<AgendaEventPeriod, AgendaEvent[]> {
  return events.reduce<Record<AgendaEventPeriod, AgendaEvent[]>>(
    (groups, event) => {
      groups[agendaEventPeriod(event, now)].push(event)
      return groups
    },
    { upcoming: [], current: [], past: [] },
  )
}
