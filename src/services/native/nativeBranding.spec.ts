import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function projectFile(path: string): Buffer {
  return readFileSync(resolve(process.cwd(), path))
}

function sha256(path: string): string {
  return createHash("sha256").update(projectFile(path)).digest("hex")
}

function pngDimensions(path: string): { width: number; height: number } {
  const bytes = projectFile(path)

  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}

describe("native Chamilo branding", () => {
  it("keeps the required Android launcher dimensions", () => {
    const sizes = {
      mdpi: [48, 108],
      hdpi: [72, 162],
      xhdpi: [96, 216],
      xxhdpi: [144, 324],
      xxxhdpi: [192, 432],
    } as const

    for (const [density, [legacy, foreground]] of Object.entries(sizes)) {
      expect(pngDimensions(`android/app/src/main/res/mipmap-${density}/ic_launcher.png`)).toEqual({
        width: legacy,
        height: legacy,
      })
      expect(
        pngDimensions(`android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`),
      ).toEqual({ width: legacy, height: legacy })
      expect(
        pngDimensions(`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`),
      ).toEqual({ width: foreground, height: foreground })
    }
  })

  it("keeps the existing Android splash resource dimensions", () => {
    const splashSizes = {
      "drawable/splash.png": [480, 320],
      "drawable-land-mdpi/splash.png": [480, 320],
      "drawable-land-hdpi/splash.png": [800, 480],
      "drawable-land-xhdpi/splash.png": [1280, 720],
      "drawable-land-xxhdpi/splash.png": [1600, 960],
      "drawable-land-xxxhdpi/splash.png": [1920, 1280],
      "drawable-port-mdpi/splash.png": [320, 480],
      "drawable-port-hdpi/splash.png": [480, 800],
      "drawable-port-xhdpi/splash.png": [720, 1280],
      "drawable-port-xxhdpi/splash.png": [960, 1600],
      "drawable-port-xxxhdpi/splash.png": [1280, 1920],
    } as const

    for (const [path, [width, height]] of Object.entries(splashSizes)) {
      expect(pngDimensions(`android/app/src/main/res/${path}`)).toEqual({ width, height })
    }
  })

  it("keeps the required iOS asset dimensions", () => {
    expect(
      pngDimensions("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"),
    ).toEqual({ width: 1024, height: 1024 })

    for (const filename of [
      "splash-2732x2732.png",
      "splash-2732x2732-1.png",
      "splash-2732x2732-2.png",
    ]) {
      expect(pngDimensions(`ios/App/App/Assets.xcassets/Splash.imageset/${filename}`)).toEqual({
        width: 2732,
        height: 2732,
      })
    }
  })

  it("does not regress to the known Capacitor 8.4.1 stock native assets", () => {
    const stockHashes = new Set([
      "87cb2f2ffe992652bb4fa768c73719a37b5852ab17fbf8e170e888f7a42b0761",
      "bd24fd383253bf8d43f0a81f11c071d76d1d555114376dd647cd9fb38fa0a9da",
      "ab93096331e7cd8ec379f73f1e9adcaaa9ee1115c9f4ff10411a811fb9700174",
      "3db071a03b2f8ffe0dfd4170fc59842d53cd15bba5e88af59401d58efabf7827",
      "29e4777e319de3ee5a52c3a8004ec19d0568414004257e36d7c94a077d71c93b",
      "1b5002b74a5500e697298ced06ca2811ac33f2771f236f3c720ff23243890530",
    ])

    const keyAssets = [
      "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
      "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png",
      "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png",
      "android/app/src/main/res/drawable-port-xxxhdpi/splash.png",
      "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
      "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png",
    ]

    for (const asset of keyAssets) {
      expect(stockHashes.has(sha256(asset))).toBe(false)
    }
  })
})
