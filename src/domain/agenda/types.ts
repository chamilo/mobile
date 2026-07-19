export interface AgendaRoom {
  id: number
  title: string
  branchTitle: string | null
}

export interface AgendaEvent {
  id: string
  title: string
  content: string
  startDate: string
  endDate: string
  allDay: boolean
  color: string | null
  type: string | null
  room: AgendaRoom | null
  resourceNodeId: number | null
}

export interface AgendaSnapshot {
  items: AgendaEvent[]
  totalItems: number
}
