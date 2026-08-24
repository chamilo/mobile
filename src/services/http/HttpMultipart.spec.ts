import { describe, expect, it } from "vitest"

import { createHttpMultipartBody } from "@/services/http/HttpMultipart"

describe("HttpMultipart", () => {
  it("encodes file bytes and scalar fields without exposing browser-specific FormData", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "answer.wav", { type: "audio/wav" })

    const body = await createHttpMultipartBody(
      { questionId: 13, reviewLater: false },
      [{ fieldName: "file", file }],
    )

    expect(body).toEqual({
      type: "multipart",
      fields: { questionId: "13", reviewLater: "false" },
      files: [
        {
          fieldName: "file",
          fileName: "answer.wav",
          contentType: "audio/wav",
          base64: "AQID",
        },
      ],
    })
  })
})
