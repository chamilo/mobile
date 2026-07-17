import { describe, expect, it } from "vitest"

import { NativeHttpClient } from "@/services/http/NativeHttpClient"

describe("NativeHttpClient", () => {
  it("fails explicitly until the Android transport batch", async () => {
    const client = new NativeHttpClient()

    await expect(client.request({ method: "GET", path: "/api/ping" })).rejects.toMatchObject({
      kind: "unsupported",
    })
  })
})
