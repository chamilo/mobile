type MessageTree = Record<string, unknown>

function isMessageTree(value: unknown): value is MessageTree {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function mergeMessages<TBase extends MessageTree>(
  base: TBase,
  ...overrides: MessageTree[]
): TBase {
  const result = structuredClone(base) as MessageTree

  for (const override of overrides) {
    mergeInto(result, override)
  }

  return result as TBase
}

function mergeInto(target: MessageTree, source: MessageTree): void {
  for (const [key, value] of Object.entries(source)) {
    if (isMessageTree(value)) {
      const current = isMessageTree(target[key]) ? (target[key] as MessageTree) : {}
      target[key] = current
      mergeInto(current, value)
      continue
    }

    target[key] = value
  }
}
