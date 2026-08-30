import { describe, expect, it, vi } from "vitest"

import { createScormRuntimeApi } from "@/services/learningPaths/scormRuntimeApi.js"

function createRuntime(
  version: "1.2" | "2004",
  options: {
    initialValues?: Record<string, string>
    onNavigate?: (request: string) => void
    navigationTargets?: Array<{ ref: string; available: boolean }>
  } = {},
) {
  const commits: unknown[] = []
  const runtime = createScormRuntimeApi({
    version,
    initialValues: options.initialValues ?? {},
    lpId: 7,
    itemId: 11,
    itemViewId: 21,
    lpViewId: 8,
    userId: 4,
    lpType: 2,
    itemType: "sco",
    hasNextItem: true,
    hasPreviousItem: false,
    navigationTargets: options.navigationTargets,
    commit: async (payload) => {
      commits.push(payload)
    },
    beacon: () => true,
    onNavigate: options.onNavigate,
  })

  return { runtime, commits }
}

describe("SCORM runtime API", () => {
  it("persists the core SCORM 1.2 lifecycle and dynamic collections", async () => {
    const { runtime, commits } = createRuntime("1.2", {
      initialValues: {
        "cmi.core.lesson_status": "not attempted",
        "cmi.core.score.raw": "0",
        "cmi.core.lesson_location": "",
        "cmi.suspend_data": "",
        "cmi.interactions._count": "0",
      },
    })

    expect(runtime.api12.LMSInitialize("")).toBe("true")
    expect(runtime.api12.LMSSetValue("cmi.core.lesson_status", "completed")).toBe("true")
    expect(runtime.api12.LMSSetValue("cmi.core.score.raw", "92")).toBe("true")
    expect(runtime.api12.LMSSetValue("cmi.core.lesson_location", "page-4")).toBe("true")
    expect(runtime.api12.LMSSetValue("cmi.suspend_data", "resume-token")).toBe("true")
    expect(runtime.api12.LMSSetValue("cmi.interactions.0.id", "question-1")).toBe("true")
    expect(
      runtime.api12.LMSSetValue("cmi.interactions.0.correct_responses.0.pattern", "A"),
    ).toBe("true")
    expect(runtime.api12.LMSGetValue("cmi.interactions._count")).toBe("1")
    expect(runtime.api12.LMSGetValue("cmi.interactions.0.correct_responses._count")).toBe("1")

    expect(runtime.api12.LMSCommit("")).toBe("true")
    await runtime.flush("test")

    expect(commits.length).toBeGreaterThan(0)
    expect(commits.at(-1)).toMatchObject({
      values: {
        "cmi.core.lesson_status": "completed",
        "cmi.core.score.raw": "92",
        "cmi.core.lesson_location": "page-4",
        "cmi.suspend_data": "resume-token",
      },
    })

    expect(runtime.api12.LMSFinish("")).toBe("true")
    await runtime.flush("after-finish")
    expect(runtime.api12.LMSGetValue("cmi.core.lesson_status")).toBe("")
    expect(runtime.api12.LMSGetLastError()).toBe("301")
  })

  it("supports SCORM 2004 state, interaction objectives, and linear navigation", async () => {
    const onNavigate = vi.fn()
    const { runtime } = createRuntime("2004", {
      initialValues: {
        "cmi.completion_status": "incomplete",
        "cmi.success_status": "unknown",
        "cmi.progress_measure": "0",
        "cmi.score.scaled": "0",
        "cmi.suspend_data": "",
        "cmi.interactions._count": "0",
      },
      onNavigate,
    })

    expect(runtime.api2004.Initialize("")).toBe("true")
    expect(runtime.api2004.GetValue("adl.nav.request_valid.continue")).toBe("true")
    expect(runtime.api2004.GetValue("adl.nav.request_valid.previous")).toBe("false")
    expect(runtime.api2004.SetValue("cmi.completion_status", "completed")).toBe("true")
    expect(runtime.api2004.SetValue("cmi.success_status", "passed")).toBe("true")
    expect(runtime.api2004.SetValue("cmi.progress_measure", "1")).toBe("true")
    expect(runtime.api2004.SetValue("cmi.score.scaled", "0.92")).toBe("true")
    expect(runtime.api2004.SetValue("cmi.suspend_data", "resume-token")).toBe("true")
    expect(runtime.api2004.SetValue("cmi.interactions.0.id", "question-1")).toBe("true")
    expect(runtime.api2004.SetValue("cmi.interactions.0.objectives.0.id", "objective-1")).toBe(
      "true",
    )
    expect(runtime.api2004.GetValue("cmi.interactions.0.objectives._count")).toBe("1")
    expect(runtime.api2004.SetValue("adl.nav.request", "continue")).toBe("true")
    expect(runtime.api2004.Terminate("")).toBe("true")

    await vi.waitFor(() => expect(onNavigate).toHaveBeenCalledWith("continue"))
  })

  it("supports SCORM 2004 targeted choice and jump requests from manifest item references", async () => {
    const onNavigate = vi.fn()
    const { runtime } = createRuntime("2004", {
      initialValues: { "cmi.completion_status": "incomplete" },
      navigationTargets: [
        { ref: "ACTIVITY-2", available: true },
        { ref: "LOCKED-ACTIVITY", available: false },
      ],
      onNavigate,
    })

    expect(runtime.api2004.Initialize("")).toBe("true")
    expect(
      runtime.api2004.GetValue("adl.nav.request_valid.choice.{target=ACTIVITY-2}"),
    ).toBe("true")
    expect(
      runtime.api2004.GetValue("adl.nav.request_valid.jump.{target=ACTIVITY-2}"),
    ).toBe("true")
    expect(
      runtime.api2004.GetValue("adl.nav.request_valid.choice.{target=LOCKED-ACTIVITY}"),
    ).toBe("false")
    expect(
      runtime.api2004.GetValue("adl.nav.request_valid.choice.{target=UNKNOWN-ACTIVITY}"),
    ).toBe("false")

    expect(runtime.api2004.SetValue("adl.nav.request", "{target=ACTIVITY-2}choice")).toBe("true")
    expect(runtime.api2004.Terminate("")).toBe("true")

    await vi.waitFor(() =>
      expect(onNavigate).toHaveBeenCalledWith("{target=ACTIVITY-2}choice"),
    )
  })

  it("does not execute a targeted SCORM 2004 request when the target is unavailable", async () => {
    const onNavigate = vi.fn()
    const { runtime } = createRuntime("2004", {
      navigationTargets: [{ ref: "LOCKED-ACTIVITY", available: false }],
      onNavigate,
    })

    expect(runtime.api2004.Initialize("")).toBe("true")
    expect(runtime.api2004.SetValue("adl.nav.request", "{target=LOCKED-ACTIVITY}jump")).toBe(
      "true",
    )
    expect(runtime.api2004.Terminate("")).toBe("true")
    await runtime.flush("test")

    expect(onNavigate).not.toHaveBeenCalled()
  })

  it("rejects out-of-range SCORM 2004 progress and scaled score values", () => {
    const { runtime } = createRuntime("2004")

    expect(runtime.api2004.Initialize("")).toBe("true")
    expect(runtime.api2004.SetValue("cmi.progress_measure", "1.1")).toBe("false")
    expect(runtime.api2004.GetLastError()).toBe("407")
    expect(runtime.api2004.SetValue("cmi.score.scaled", "-1.1")).toBe("false")
    expect(runtime.api2004.GetLastError()).toBe("407")
  })
})
