import { registerPlugin } from "@capacitor/core"

export interface NativeDocumentOptions {
  base64: string
  filename: string
  mimeType: string
}

export interface NativeDocumentSaveResult {
  saved: boolean
}

export interface ChamiloDocumentPlugin {
  open(options: NativeDocumentOptions): Promise<void>
  save(options: NativeDocumentOptions): Promise<NativeDocumentSaveResult>
}

export const chamiloDocumentPlugin = registerPlugin<ChamiloDocumentPlugin>("ChamiloDocument")
