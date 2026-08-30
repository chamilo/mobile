import { describe, expect, it } from "vitest"

import {
  parseScormTargetedNavigationRequest,
  resolveScormTargetedNavigationItem,
} from "@/domain/learningPaths/scormNavigation"
import type { LearningPathRuntimeItem } from "@/domain/learningPaths/types"

function item(overrides: Partial<LearningPathRuntimeItem> = {}): LearningPathRuntimeItem {
  return {
    id: 1,
    ref: "ACTIVITY-1",
    title: "Activity",
    itemType: "sco",
    parentId: 0,
    level: 0,
    displayOrder: 1,
    status: "not attempted",
    score: 0,
    available: true,
    isSection: false,
    hasChildren: false,
    hasPrerequisite: false,
    ...overrides,
  }
}

describe("SCORM 2004 targeted navigation", () => {
  it("parses choice and jump requests", () => {
    expect(parseScormTargetedNavigationRequest("{target=ACTIVITY-2}choice")).toEqual({
      action: "choice",
      targetRef: "ACTIVITY-2",
    })
    expect(parseScormTargetedNavigationRequest("{target=ACTIVITY-3}jump")).toEqual({
      action: "jump",
      targetRef: "ACTIVITY-3",
    })
  })

  it("resolves one available manifest target", () => {
    const target = resolveScormTargetedNavigationItem(
      [item(), item({ id: 2, ref: "ACTIVITY-2" })],
      "{target=ACTIVITY-2}choice",
    )

    expect(target?.id).toBe(2)
  })

  it("does not resolve unavailable, section, unknown, or ambiguous targets", () => {
    expect(
      resolveScormTargetedNavigationItem(
        [item({ ref: "LOCKED", available: false })],
        "{target=LOCKED}choice",
      ),
    ).toBeNull()
    expect(
      resolveScormTargetedNavigationItem(
        [item({ ref: "SECTION", isSection: true })],
        "{target=SECTION}jump",
      ),
    ).toBeNull()
    expect(resolveScormTargetedNavigationItem([item()], "{target=MISSING}choice")).toBeNull()
    expect(
      resolveScormTargetedNavigationItem(
        [item({ id: 1, ref: "DUP" }), item({ id: 2, ref: "DUP" })],
        "{target=DUP}choice",
      ),
    ).toBeNull()
  })
})
