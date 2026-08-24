import { describe, expect, it } from "vitest"

import { encodePcm16Wav } from "@/services/exercises/ExerciseWavRecorder"

describe("ExerciseWavRecorder", () => {
  it("encodes a valid mono PCM WAV header", async () => {
    const blob = encodePcm16Wav(new Float32Array([0, 0.5, -0.5]), 8000)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF")
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe("WAVE")
    expect(blob.type).toBe("audio/wav")
  })
})
