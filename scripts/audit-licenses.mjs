import console from "node:console"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const projectRoot = process.cwd()
const projectPackagePath = path.join(projectRoot, "package.json")
const lockfilePath = path.join(projectRoot, "yarn.lock")
const nodeModulesRoot = path.join(projectRoot, "node_modules")
const reportDirectory = path.join(projectRoot, "reports")
const reportPath = path.join(reportDirectory, "LICENSE_AUDIT.md")

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
}

const projectPackage = JSON.parse(fs.readFileSync(projectPackagePath, "utf8"))
const directNames = new Set([
  ...Object.keys(projectPackage.dependencies ?? {}),
  ...Object.keys(projectPackage.devDependencies ?? {}),
])

const requiredDirectPackages = new Map([
  ["@capacitor/android", { version: "8.4.1", license: "MIT" }],
  ["@capacitor/app", { version: "8.1.0", license: "MIT" }],
])

const blockedLicensePatterns = [
  /\bUNLICENSED\b/i,
  /\bUNKNOWN\b/i,
  /SEE LICEN[CS]E IN/i,
  /\bBUSL(?:-|\b)/i,
  /Business Source License/i,
  /\bSSPL(?:-|\b)/i,
  /Server Side Public License/i,
  /Commons Clause/i,
  /PolyForm/i,
  /Prosperity Public License/i,
  /Non[- ]Commercial/i,
  /CC-BY-NC/i,
  /Elastic License/i,
  /\bProprietary\b/i,
]

function normalizeLicense(metadata) {
  if (typeof metadata.license === "string" && metadata.license.trim()) {
    return metadata.license.trim()
  }

  if (
    metadata.license &&
    typeof metadata.license === "object" &&
    typeof metadata.license.type === "string"
  ) {
    return metadata.license.type.trim()
  }

  if (Array.isArray(metadata.licenses)) {
    const licenses = metadata.licenses
      .map((license) => (typeof license === "string" ? license : license?.type))
      .filter((license) => typeof license === "string" && license.trim().length > 0)

    if (licenses.length > 0) {
      return licenses.join(" OR ")
    }
  }

  return "UNKNOWN"
}

function markdownCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ")
}

function readPackageMetadata(packageDirectory) {
  const packagePath = path.join(packageDirectory, "package.json")
  if (!fs.existsSync(packagePath)) return null

  try {
    return JSON.parse(fs.readFileSync(packagePath, "utf8"))
  } catch {
    return null
  }
}

const visitedLocations = new Set()
const packages = new Map()

function visitPackage(packageDirectory) {
  let realDirectory
  try {
    realDirectory = fs.realpathSync(packageDirectory)
  } catch {
    return
  }

  if (visitedLocations.has(realDirectory) || realDirectory === fs.realpathSync(projectRoot)) return
  visitedLocations.add(realDirectory)

  const metadata = readPackageMetadata(realDirectory)
  if (!metadata?.name || !metadata?.version) return

  packages.set(`${metadata.name}@${metadata.version}`, {
    name: metadata.name,
    version: metadata.version,
    license: normalizeLicense(metadata),
    direct: directNames.has(metadata.name),
  })

  visitNodeModules(path.join(realDirectory, "node_modules"))
}

function visitNodeModules(nodeModulesDirectory) {
  if (!fs.existsSync(nodeModulesDirectory)) return

  let entries
  try {
    entries = fs.readdirSync(nodeModulesDirectory, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.name === ".bin" || entry.name.startsWith(".")) continue
    const entryPath = path.join(nodeModulesDirectory, entry.name)

    if (entry.name.startsWith("@")) {
      let scopedEntries
      try {
        scopedEntries = fs.readdirSync(entryPath, { withFileTypes: true })
      } catch {
        continue
      }
      for (const scopedEntry of scopedEntries) visitPackage(path.join(entryPath, scopedEntry.name))
      continue
    }

    visitPackage(entryPath)
  }
}

if (!fs.existsSync(nodeModulesRoot)) {
  console.error("ERROR: node_modules was not found. Run yarn install first.")
  process.exit(1)
}
if (!fs.existsSync(lockfilePath)) {
  console.error("ERROR: yarn.lock was not found.")
  process.exit(1)
}

visitNodeModules(nodeModulesRoot)

const packageRows = [...packages.values()].sort((left, right) =>
  `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`),
)
const blockedPackages = packageRows.filter(({ license }) =>
  blockedLicensePatterns.some((pattern) => pattern.test(license)),
)

const requiredChecks = []
for (const [name, expected] of requiredDirectPackages) {
  const installed = packageRows.find(
    (entry) => entry.name === name && entry.version === expected.version,
  )

  if (!installed) {
    requiredChecks.push({
      name,
      status: "FAIL",
      details: `Expected ${name}@${expected.version} was not found.`,
    })
  } else if (!directNames.has(name)) {
    requiredChecks.push({
      name,
      status: "FAIL",
      details: `${name}@${expected.version} is not a direct dependency.`,
    })
  } else if (installed.license !== expected.license) {
    requiredChecks.push({
      name,
      status: "FAIL",
      details: `Expected ${expected.license}, found ${installed.license}.`,
    })
  } else {
    requiredChecks.push({
      name,
      status: "PASS",
      details: `${name}@${expected.version} — ${expected.license}`,
    })
  }
}

const licenseCounts = new Map()
for (const entry of packageRows) {
  licenseCounts.set(entry.license, (licenseCounts.get(entry.license) ?? 0) + 1)
}

const reportLines = [
  "# LICENSE_AUDIT",
  "",
  "> Engineering dependency-license inventory. It is not legal advice.",
  "",
  "## Inputs",
  "",
  `- package.json SHA-256: \`${sha256(projectPackagePath)}\``,
  `- yarn.lock SHA-256: \`${sha256(lockfilePath)}\``,
  "- Install layout: Yarn node-modules linker",
  "",
  "## Summary",
  "",
  `- Installed JavaScript packages inspected: ${packageRows.length}`,
  `- Direct JavaScript packages: ${packageRows.filter(({ direct }) => direct).length}`,
  `- Blocked or unknown license metadata: ${blockedPackages.length}`,
  "",
  "## Chat 07 direct dependency gate",
  "",
  "| Package | Result | Details |",
  "|---|---|---|",
  ...requiredChecks.map(
    ({ name, status, details }) =>
      `| ${markdownCell(name)} | ${status} | ${markdownCell(details)} |`,
  ),
  "",
  "## License distribution",
  "",
  "| License metadata | Packages |",
  "|---|---:|",
  ...[...licenseCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([license, count]) => `| ${markdownCell(license)} | ${count} |`),
  "",
  "## Installed JavaScript package inventory",
  "",
  "| Package | Version | Direct | License metadata |",
  "|---|---:|:---:|---|",
  ...packageRows.map(
    ({ name, version, direct, license }) =>
      `| ${markdownCell(name)} | ${markdownCell(version)} | ${direct ? "yes" : "no"} | ${markdownCell(license)} |`,
  ),
  "",
  "## Limitations",
  "",
  "- The script inventories JavaScript package metadata under node_modules.",
  "- Android/Gradle dependencies retain their upstream licenses and require a dedicated release review before store distribution.",
  "- License metadata is an engineering gate, not a legal compatibility opinion.",
  "",
]

if (blockedPackages.length > 0) {
  reportLines.push(
    "## Blocked or unknown licenses",
    "",
    ...blockedPackages.map(({ name, version, license }) => `- ${name}@${version}: ${license}`),
    "",
  )
}

fs.mkdirSync(reportDirectory, { recursive: true })
fs.writeFileSync(reportPath, `${reportLines.join("\n")}\n`, "utf8")

const failedRequiredChecks = requiredChecks.filter(({ status }) => status !== "PASS")
console.log(`License report: ${path.relative(projectRoot, reportPath)}`)
console.log(`Packages inspected: ${packageRows.length}`)
console.log(`Blocked or unknown licenses: ${blockedPackages.length}`)
for (const check of requiredChecks) console.log(`${check.status}: ${check.details}`)

if (failedRequiredChecks.length > 0 || blockedPackages.length > 0) {
  process.exitCode = 1
} else {
  console.log("License audit: PASS")
}
