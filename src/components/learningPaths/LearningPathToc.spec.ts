import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import LearningPathToc from "@/components/learningPaths/LearningPathToc.vue"
import type { LearningPathRuntimeItem } from "@/domain/learningPaths/types"
import { i18n } from "@/i18n"

const items: LearningPathRuntimeItem[] = [
  {
    id: 10,
    title: "Module 1",
    itemType: "document",
    parentId: 0,
    level: 0,
    displayOrder: 1,
    status: "incomplete",
    score: 0,
    available: true,
    isSection: false,
    hasChildren: false,
    hasPrerequisite: false,
  },
  {
    id: 11,
    title: "Module 2",
    itemType: "document",
    parentId: 0,
    level: 0,
    displayOrder: 2,
    status: "not_attempted",
    score: 0,
    available: true,
    isSection: false,
    hasChildren: false,
    hasPrerequisite: false,
  },
]

describe("LearningPathToc", () => {
  it("shows immediate loading feedback for the pending item", () => {
    const wrapper = mount(LearningPathToc, {
      props: {
        items,
        currentItemId: 10,
        busy: true,
        accordion: false,
        pendingItemId: 11,
      },
      global: { plugins: [i18n] },
    })

    const buttons = wrapper.findAll("button")
    expect(buttons[1]?.attributes("aria-busy")).toBe("true")
    expect(buttons[1]?.find(".pi-spinner").exists()).toBe(true)
  })
})
