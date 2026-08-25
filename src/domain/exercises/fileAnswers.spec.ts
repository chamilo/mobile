import { describe, expect, it } from "vitest"

import { encodeMonoPcm16Wav } from "@/domain/exercises/audioRecording"
import { encodeExerciseAnswerFile, exerciseFileAccept } from "@/domain/exercises/fileAnswers"

describe("exercise file answers", () => {
  it("encodes a selected answer file for the verified JSON upload contract", async () => {
    const file = new File(["hello"], "answer.txt", { type: "text/plain" })

    await expect(encodeExerciseAnswerFile(file)).resolves.toEqual({
      fileName: "answer.txt",
      mimeType: "text/plain",
      base64Content: "aGVsbG8=",
    })
  })

  it("limits oral-expression selection to the server-supported formats", () => {
    expect(exerciseFileAccept(13)).toBe(".wav,.ogg,audio/wav,audio/ogg")
    expect(exerciseFileAccept(23)).toBeUndefined()
  })

  it("encodes microphone samples as a mono PCM WAV file", async () => {
    const blob = encodeMonoPcm16Wav([new Float32Array([0, 0.5, -0.5])], 48_000)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const ascii = (start: number, length: number) =>
      String.fromCharCode(...bytes.slice(start, start + length))

    expect(blob.type).toBe("audio/wav")
    expect(blob.size).toBe(50)
    expect(ascii(0, 4)).toBe("RIFF")
    expect(ascii(8, 4)).toBe("WAVE")
  })
})
