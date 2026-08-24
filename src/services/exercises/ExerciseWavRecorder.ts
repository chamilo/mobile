function mergeChunks(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const merged = new Float32Array(length)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

export function encodePcm16Wav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }
  writeString(0, "RIFF")
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: "audio/wav" })
}

export class ExerciseWavRecorder {
  private stream: MediaStream | null = null
  private context: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private silentGain: GainNode | null = null
  private chunks: Float32Array[] = []

  get supported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof AudioContext !== "undefined"
    )
  }

  async start(): Promise<void> {
    if (!this.supported) throw new Error("Audio recording is not supported on this device.")
    await this.cancel()

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      this.context = new AudioContext()
      await this.context.resume()
      this.source = this.context.createMediaStreamSource(this.stream)
      this.processor = this.context.createScriptProcessor(4096, 1, 1)
      this.silentGain = this.context.createGain()
      this.silentGain.gain.value = 0
      this.chunks = []
      this.processor.onaudioprocess = (event) => {
        this.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)))
      }
      this.source.connect(this.processor)
      this.processor.connect(this.silentGain)
      this.silentGain.connect(this.context.destination)
    } catch (error) {
      await this.cancel()
      throw error
    }
  }

  async stop(): Promise<File> {
    if (!this.context) throw new Error("Audio recording has not started.")
    const sampleRate = this.context.sampleRate
    const samples = mergeChunks(this.chunks)
    await this.cleanup()
    if (samples.length === 0) throw new Error("No audio was recorded.")
    return new File([encodePcm16Wav(samples, sampleRate)], `oral-answer-${Date.now()}.wav`, {
      type: "audio/wav",
    })
  }

  async cancel(): Promise<void> {
    this.chunks = []
    await this.cleanup()
  }

  private async cleanup(): Promise<void> {
    this.processor?.disconnect()
    this.source?.disconnect()
    this.silentGain?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    if (this.context && this.context.state !== "closed") await this.context.close()
    this.stream = null
    this.context = null
    this.source = null
    this.processor = null
    this.silentGain = null
  }
}
