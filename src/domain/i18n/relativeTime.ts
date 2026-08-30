export function formatRelativeTime(
  value: string | null | undefined,
  locale: string,
  fallback = "",
  now = Date.now(),
): string {
  if (!value) return fallback

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return fallback

  const differenceSeconds = (timestamp - now) / 1000
  const absoluteSeconds = Math.abs(differenceSeconds)
  const formatter = new Intl.RelativeTimeFormat(locale || "en-US", { numeric: "auto" })

  if (absoluteSeconds < 60) {
    return formatter.format(Math.round(differenceSeconds), "second")
  }

  const differenceMinutes = differenceSeconds / 60
  if (Math.abs(differenceMinutes) < 60) {
    return formatter.format(Math.round(differenceMinutes), "minute")
  }

  const differenceHours = differenceMinutes / 60
  if (Math.abs(differenceHours) < 24) {
    return formatter.format(Math.round(differenceHours), "hour")
  }

  const differenceDays = differenceHours / 24
  if (Math.abs(differenceDays) < 7) {
    return formatter.format(Math.round(differenceDays), "day")
  }

  const differenceWeeks = differenceDays / 7
  if (Math.abs(differenceDays) < 30) {
    return formatter.format(Math.round(differenceWeeks), "week")
  }

  const differenceMonths = differenceDays / 30.4375
  if (Math.abs(differenceDays) < 365.25) {
    return formatter.format(Math.round(differenceMonths), "month")
  }

  const differenceYears = differenceDays / 365.25
  return formatter.format(Math.round(differenceYears), "year")
}
