import type {
  CourseProgressAdvance,
  CourseProgressPlan,
  CourseProgressSnapshot,
  CourseProgressThematic,
} from "@/domain/courseProgress/types"
export class CourseProgressContractError extends Error {}
const obj = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new CourseProgressContractError("Expected object")
  return v as Record<string, unknown>
}
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d)
const str = (v: unknown) => (typeof v === "string" ? v : "")
const bool = (v: unknown) => v === true
export function normalizeCourseProgressResponse(value: unknown): CourseProgressSnapshot {
  const r = obj(value)
  const raw = Array.isArray(r.items) ? r.items : []
  const items: CourseProgressThematic[] = raw.map((entry) => {
    const t = obj(entry)
    const plans = (Array.isArray(t.plans) ? t.plans : []).map((p): CourseProgressPlan => {
      const x = obj(p)
      return {
        iid: num(x.iid),
        title: str(x.title),
        description: str(x.description),
        descriptionType: typeof x.descriptionType === "string" ? x.descriptionType : null,
      }
    })
    const advances = (Array.isArray(t.advances) ? t.advances : []).map(
      (a): CourseProgressAdvance => {
        const x = obj(a)
        return {
          iid: num(x.iid),
          content: str(x.content),
          startDate: typeof x.startDate === "string" ? x.startDate : null,
          formattedStartDate: str(x.formattedStartDate),
          duration: num(x.duration),
          doneAdvance: bool(x.doneAdvance),
        }
      },
    )
    return {
      iid: num(t.iid),
      title: str(t.title),
      content: str(t.content),
      isInheritedFromCourse: bool(t.isInheritedFromCourse),
      average: num(t.average),
      plans,
      advances,
    }
  })
  return {
    courseId: num(r.courseId),
    sessionId: typeof r.sessionId === "number" ? r.sessionId : null,
    studentView: bool(r.studentView),
    totalAverage: num(r.totalAverage),
    totalItems: num(r.totalItems, items.length),
    items,
  }
}
