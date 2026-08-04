import { Capacitor } from "@capacitor/core"

import type { CurrentUserProfile } from "@/domain/auth/types"
import type { CampusProfile } from "@/domain/campus/types"
import type { CourseHomeEntry, CourseToolKey } from "@/domain/courseHome/types"
import type { CourseToolCard } from "@/domain/courseTools/types"
import {
  buildOfflineCoursePackKey,
  coursePackEntryTitle,
  type OfflineCoursePackFailure,
  type OfflineCoursePackManifest,
  type OfflineCoursePackProgress,
  type OfflineCoursePackToolKey,
  type OfflineCoursePackWarning,
} from "@/domain/offline/coursePackTypes"
import {
  isScormLearningPathItem,
  isSupportedLearningPathItem,
} from "@/domain/learningPaths/contracts"
import type { LearningPathRuntime } from "@/domain/learningPaths/types"
import { AgendaApiService } from "@/services/agenda/AgendaApiService"
import { AnnouncementsApiService } from "@/services/announcements/AnnouncementsApiService"
import { AssignmentApiService } from "@/services/assignments/AssignmentApiService"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import { CourseDescriptionApiService } from "@/services/courseDescription/CourseDescriptionApiService"
import { CourseToolAvailabilityApiService } from "@/services/courseHome/CourseToolAvailabilityApiService"
import { CourseProgressApiService } from "@/services/courseProgress/CourseProgressApiService"
import { CourseToolApiService } from "@/services/courseTools/CourseToolApiService"
import { DocumentsApiService } from "@/services/documents/DocumentsApiService"
import { ExerciseApiService } from "@/services/exercises/ExerciseApiService"
import { ForumApiService } from "@/services/forums/ForumApiService"
import { GradebookApiService } from "@/services/gradebook/GradebookApiService"
import type { HttpClient } from "@/services/http/HttpClient"
import { LearningPathApiService } from "@/services/learningPaths/LearningPathApiService"
import {
  buildScormPackageScope,
  MAX_SCORM_PACKAGE_SIZE_BYTES,
  scormPackageHost,
} from "@/services/learningPaths/ScormPackageHost"
import { CourseLinksApiService } from "@/services/links/CourseLinksApiService"
import { NotebookApiService } from "@/services/notebook/NotebookApiService"
import {
  offlineCoursePackRepository,
  type OfflineCoursePackRepository,
} from "@/services/offline/OfflineCoursePackRepository"
import {
  offlineCoreFlowRepository,
  type OfflineCoreFlowRepository,
} from "@/services/offline/OfflineCoreFlowRepository"
import {
  buildPreparedExerciseRuntime,
  isPreparedExerciseRuntime,
} from "@/services/offline/OfflineExercisePreparation"
import { withOfflinePrefetchCapture } from "@/services/offline/OfflinePrefetchContext"
import { offlineResponseCacheRepository } from "@/services/offline/OfflineResponseCacheRepository"
import { SurveyApiService } from "@/services/surveys/SurveyApiService"

export interface PrepareOfflineCoursePackInput {
  campus: CampusProfile
  profile: CurrentUserProfile
  entry: CourseHomeEntry
  selectedTools: OfflineCoursePackToolKey[]
  prepareExerciseAttempts: boolean
}

export type OfflineCoursePackProgressListener = (progress: OfflineCoursePackProgress) => void

interface PreparationContext extends PrepareOfflineCoursePackInput {
  client: HttpClient
  failures: OfflineCoursePackFailure[]
  warnings: OfflineCoursePackWarning[]
  completedTools: OfflineCoursePackToolKey[]
  scormScopes: string[]
  scormBytes: number
  completedResources: number
  notifyResource: (label: string, bytes?: number) => void
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === "string" && code.trim()) return code
  }

  if (error && typeof error === "object" && "kind" in error) {
    const kind = (error as { kind?: unknown }).kind
    if (typeof kind === "string" && kind.trim()) return kind
  }

  return "unexpected_error"
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The offline preparation step failed."
}

function cardId(card: CourseToolCard): number | null {
  const value = Number(card.id)

  return Number.isInteger(value) && value > 0 ? value : null
}

function unique<TValue>(values: TValue[]): TValue[] {
  return [...new Set(values)]
}

export class OfflineCoursePackManager {
  private cancelRequested = false

  constructor(
    private readonly repository: OfflineCoursePackRepository = offlineCoursePackRepository,
    private readonly coreFlows: OfflineCoreFlowRepository = offlineCoreFlowRepository,
  ) {}

  cancel(): void {
    this.cancelRequested = true
  }

  async prepare(
    input: PrepareOfflineCoursePackInput,
    listener: OfflineCoursePackProgressListener,
  ): Promise<OfflineCoursePackManifest> {
    this.cancelRequested = false
    const selectedTools = unique(input.selectedTools)
    const progress: OfflineCoursePackProgress = {
      status: "preparing",
      currentTool: null,
      currentResource: "",
      completedTools: 0,
      totalTools: selectedTools.length,
      completedResources: 0,
      downloadedBytes: 0,
      cancelRequested: false,
    }
    const notify = () => listener({ ...progress })
    const context: PreparationContext = {
      ...input,
      selectedTools,
      client: createAuthenticatedHttpClient(input.campus),
      failures: [],
      warnings: [],
      completedTools: [],
      scormScopes: [],
      scormBytes: 0,
      completedResources: 0,
      notifyResource: (label, bytes = 0) => {
        context.completedResources += 1
        progress.completedResources = context.completedResources
        progress.downloadedBytes += bytes
        progress.currentResource = label
        notify()
      },
    }

    notify()

    await withOfflinePrefetchCapture(
      { courseId: input.entry.context.courseId, strict: true },
      async () => {
        for (const tool of selectedTools) {
          if (this.cancelRequested) break

          progress.currentTool = tool
          progress.currentResource = ""
          progress.cancelRequested = false
          notify()

          try {
            await this.prepareTool(tool, context)
            context.completedTools.push(tool)
          } catch (error) {
            context.failures.push({
              tool,
              code: errorCode(error),
              message: errorMessage(error),
            })
          }

          progress.completedTools += 1
          notify()
        }
      },
    )

    if (this.cancelRequested) {
      progress.status = "cancelled"
      progress.cancelRequested = true
    }

    const [stats, preparedStats] = await Promise.all([
      offlineResponseCacheRepository.getStats(
        input.campus.id,
        input.profile.id,
        input.entry.context.courseId,
      ),
      this.coreFlows.getContextStats(input.campus.id, input.profile.id, input.entry.context),
    ])
    const now = new Date().toISOString()
    const previous = await this.repository.load(
      input.campus.id,
      input.profile.id,
      buildOfflineCoursePackKey(input.entry.context),
    )
    const manifest: OfflineCoursePackManifest = {
      version: 1,
      campusId: input.campus.id,
      userId: input.profile.id,
      courseKey: buildOfflineCoursePackKey(input.entry.context),
      courseTitle: coursePackEntryTitle(input.entry),
      context: { ...input.entry.context },
      selectedTools,
      completedTools: unique(context.completedTools),
      failures: context.failures,
      warnings: context.warnings,
      scormScopes: unique(context.scormScopes),
      status:
        context.completedTools.length === 0
          ? "error"
          : context.failures.length > 0 || this.cancelRequested
            ? "partial"
            : "ready",
      resourceCount: stats.records + preparedStats.records + context.scormScopes.length,
      downloadedBytes: stats.bytes + preparedStats.bytes + context.scormBytes,
      savedAt: previous?.savedAt ?? now,
      updatedAt: now,
    }

    await this.repository.save(manifest)

    progress.status = manifest.status
    progress.currentTool = null
    progress.currentResource = ""
    progress.downloadedBytes = manifest.downloadedBytes
    notify()

    return manifest
  }

  private async prepareTool(
    tool: OfflineCoursePackToolKey,
    context: PreparationContext,
  ): Promise<void> {
    const course = context.entry.context

    switch (tool) {
      case "course-home": {
        await context.client.request({
          method: "GET",
          path: `/api/courses/${course.courseId}`,
          headers: { Accept: "application/ld+json" },
        })
        await new CourseToolAvailabilityApiService(context.client).getAvailableTools(
          course,
          context.entry.role,
        )
        context.notifyResource(context.entry.course.title)
        return
      }
      case "agenda": {
        await new AgendaApiService(context.client).getList(course)
        context.notifyResource("Agenda")
        return
      }
      case "announcements": {
        const service = new AnnouncementsApiService(context.client)
        const list = await service.getList(course)
        context.notifyResource("Announcements")

        for (const item of list.items) {
          if (this.cancelRequested) return
          const detail = await service.getDetail(course, item.id)
          context.notifyResource(item.title)

          for (const attachment of detail.item.attachments) {
            await this.prefetchBlob(context, tool, attachment.filename, attachment.downloadUrl)
          }
        }
        return
      }
      case "course-description": {
        await new CourseDescriptionApiService(context.client).getList(course)
        context.notifyResource("Course description")
        return
      }
      case "documents": {
        const service = new DocumentsApiService(context.client)
        const list = await service.getList(course)
        context.notifyResource("Documents")

        for (const item of list.items) {
          if (this.cancelRequested) return
          if (item.filetype === "folder") continue

          try {
            const blob = item.contentUrl
              ? await service.getContent(course, item)
              : await service.getDownload(course, item)
            context.notifyResource(item.title, blob.size)
          } catch (error) {
            context.warnings.push({
              tool,
              code: errorCode(error),
              message: `${item.title}: ${errorMessage(error)}`,
            })
          }
        }
        return
      }
      case "links": {
        await new CourseLinksApiService(context.client).getList(course)
        context.notifyResource("Link metadata")
        context.warnings.push({
          tool,
          code: "external_targets_require_connection",
          message: "External link destinations still require a network connection.",
        })
        return
      }
      case "course-progress": {
        await new CourseProgressApiService(context.client).getList(course)
        context.notifyResource("Course progress")
        return
      }
      case "learning-paths": {
        await this.prepareLearningPaths(context)
        return
      }
      case "exercises": {
        await this.prepareExercises(context)
        return
      }
      case "forums": {
        await this.prepareForums(context)
        return
      }
      case "assignments": {
        await this.prepareAssignments(context)
        return
      }
      case "surveys": {
        await this.prepareSurveys(context)
        return
      }
      case "gradebook": {
        await new GradebookApiService(context.client).getOverview(course, context.profile)
        context.notifyResource("Gradebook")
        return
      }
      case "notebook": {
        const service = new NotebookApiService(context.client)
        const list = await service.getList(course)
        context.notifyResource("Notebook")
        await service.getForm(course)

        for (const note of list.items) {
          if (this.cancelRequested) return
          await service.getForm(course, note.iid)
          context.notifyResource(note.title)
        }
        return
      }
    }
  }

  private async prepareLearningPaths(context: PreparationContext): Promise<void> {
    const course = context.entry.context
    const collection = await new CourseToolApiService(context.client).getCollection(
      "learning-paths",
      course,
      context.profile,
    )
    const service = new LearningPathApiService(context.client)
    context.notifyResource("Learning paths")

    for (const card of collection.items) {
      if (this.cancelRequested) return
      const learningPathId = cardId(card)
      if (!learningPathId) continue

      const initial = await service.getRuntime(course, learningPathId)
      await this.coreFlows.saveLearningPathItem(
        context.campus.id,
        context.profile.id,
        course,
        learningPathId,
        0,
        initial,
      )
      context.notifyResource(card.title)

      for (const item of initial.items) {
        if (this.cancelRequested) return
        if (!item.available || item.isSection || !isSupportedLearningPathItem(item)) continue

        let runtime: LearningPathRuntime
        try {
          runtime =
            initial.currentItemId === item.id
              ? initial
              : await service.getRuntime(course, learningPathId, item.id)
        } catch (error) {
          context.warnings.push({
            tool: "learning-paths",
            code: errorCode(error),
            message: `${card.title} · ${item.title}: ${errorMessage(error)}`,
          })
          continue
        }

        if (isScormLearningPathItem(item)) {
          let activeRuntime = runtime

          if (
            Capacitor.getPlatform() === "android" &&
            (activeRuntime.currentItemId !== item.id ||
              !activeRuntime.scorm.enabled ||
              !activeRuntime.scorm.packageEntryPath ||
              !activeRuntime.scorm.packageFingerprint)
          ) {
            try {
              await service.openItem(
                course,
                learningPathId,
                item.id,
                activeRuntime.actionToken,
                true,
              )
              activeRuntime = await service.getRuntime(course, learningPathId, item.id)
            } catch (error) {
              context.warnings.push({
                tool: "learning-paths",
                code: errorCode(error),
                message: `${item.title}: ${errorMessage(error)}`,
              })
            }
          }

          await this.coreFlows.saveLearningPathItem(
            context.campus.id,
            context.profile.id,
            course,
            learningPathId,
            item.id,
            activeRuntime,
          )
          await this.prepareScormItem(context, learningPathId, activeRuntime, item.id, item.title)
          continue
        }

        let contentBlob: Blob | null = null
        let audioBlob: Blob | null = null

        if (runtime.contentUrl) {
          try {
            contentBlob = await service.getContent(runtime.contentUrl)
            context.notifyResource(`${card.title} · ${item.title}`, contentBlob.size)
          } catch (error) {
            context.warnings.push({
              tool: "learning-paths",
              code: errorCode(error),
              message: `${card.title} · ${item.title}: ${errorMessage(error)}`,
            })
          }
        }

        if (runtime.audioUrl) {
          try {
            audioBlob = await service.getContent(runtime.audioUrl)
            context.notifyResource(`${item.title} audio`, audioBlob.size)
          } catch (error) {
            context.warnings.push({
              tool: "learning-paths",
              code: errorCode(error),
              message: `${item.title} audio: ${errorMessage(error)}`,
            })
          }
        }

        await this.coreFlows.saveLearningPathItem(
          context.campus.id,
          context.profile.id,
          course,
          learningPathId,
          item.id,
          runtime,
          contentBlob,
          audioBlob,
        )
      }
    }
  }

  private async prepareScormItem(
    context: PreparationContext,
    learningPathId: number,
    runtime: LearningPathRuntime,
    itemId: number,
    itemTitle: string,
  ): Promise<void> {
    const scorm = runtime.scorm

    if (Capacitor.getPlatform() !== "android") {
      context.warnings.push({
        tool: "learning-paths",
        code: "scorm_android_only",
        message: `${itemTitle}: persistent SCORM packages are prepared on Android only.`,
      })
      return
    }

    if (
      runtime.currentItemId !== itemId ||
      !scorm.enabled ||
      !scorm.packageEntryPath ||
      !scorm.packageFingerprint
    ) {
      context.warnings.push({
        tool: "learning-paths",
        code: "scorm_requires_online_open",
        message: `${itemTitle}: open this SCORM item once online to initialize its attempt.`,
      })
      return
    }

    if (scorm.packageSize > MAX_SCORM_PACKAGE_SIZE_BYTES) {
      context.warnings.push({
        tool: "learning-paths",
        code: "scorm_package_too_large",
        message: `${itemTitle}: the SCORM package exceeds the mobile size limit.`,
      })
      return
    }

    const scope = buildScormPackageScope(
      context.campus.id,
      context.profile.id,
      context.entry.context,
      learningPathId,
    )
    const cached = await scormPackageHost.resolve(
      scope,
      scorm.packageFingerprint,
      scorm.packageEntryPath,
    )

    if (!cached) {
      const archive = await new LearningPathApiService(context.client).getScormPackage(
        context.entry.context,
        learningPathId,
        itemId,
      )
      await scormPackageHost.install(
        scope,
        scorm.packageFingerprint,
        scorm.packageEntryPath,
        archive,
      )
      context.scormBytes += archive.byteLength
      context.notifyResource(itemTitle, archive.byteLength)
    } else {
      context.notifyResource(itemTitle)
    }

    context.scormScopes.push(scope)
  }

  private async prepareExercises(context: PreparationContext): Promise<void> {
    const service = new ExerciseApiService(context.client)
    const list = await service.getList(context.entry.context)
    await this.coreFlows.saveExerciseList(
      context.campus.id,
      context.profile.id,
      context.entry.context,
      list,
    )
    context.notifyResource("Exercises")

    for (const exercise of list.items) {
      if (this.cancelRequested) return

      let runtime = await service.getRuntime(context.entry.context, exercise.id)
      context.notifyResource(exercise.title)

      if (runtime.attempt) {
        const prepared = buildPreparedExerciseRuntime(runtime, null)
        await this.coreFlows.saveExerciseRuntime(
          context.campus.id,
          context.profile.id,
          context.entry.context,
          exercise.id,
          prepared,
        )

        if (!isPreparedExerciseRuntime(prepared)) {
          context.warnings.push({
            tool: "exercises",
            code: "exercise_runtime_not_offline_compatible",
            message: `${exercise.title}: the active attempt cannot be completed in the mobile offline player.`,
          })
        }
        continue
      }

      if (!context.prepareExerciseAttempts) {
        await this.coreFlows.saveExerciseRuntime(
          context.campus.id,
          context.profile.id,
          context.entry.context,
          exercise.id,
          runtime,
        )
        context.warnings.push({
          tool: "exercises",
          code: "exercise_requires_prepared_attempt",
          message: `${exercise.title}: connect and prepare an attempt before using this exercise offline.`,
        })
        continue
      }

      if (exercise.isReadOnlyFromLearningPath || !exercise.canOpen || !runtime.canStartAttempt) {
        await this.coreFlows.saveExerciseRuntime(
          context.campus.id,
          context.profile.id,
          context.entry.context,
          exercise.id,
          runtime,
        )
        context.warnings.push({
          tool: "exercises",
          code: "exercise_cannot_prepare_attempt",
          message: `${exercise.title}: the campus did not allow an offline attempt to be prepared.`,
        })
        continue
      }

      const startedAttempt = await service.startAttempt(context.entry.context, exercise.id)
      if (!startedAttempt.success || startedAttempt.usesLegacyRuntime) {
        await this.coreFlows.saveExerciseRuntime(
          context.campus.id,
          context.profile.id,
          context.entry.context,
          exercise.id,
          runtime,
        )
        context.warnings.push({
          tool: "exercises",
          code: "exercise_legacy_or_unsupported_attempt",
          message: `${exercise.title}: the exercise requires an online or legacy runtime.`,
        })
        continue
      }

      try {
        runtime = await service.getRuntime(context.entry.context, exercise.id)
      } catch {
        // The runtime fetched before starting the attempt already contains the
        // authoritative question contract. Keep it if the immediate re-read
        // is temporarily unavailable after the server accepted the attempt.
      }

      const prepared = buildPreparedExerciseRuntime(runtime, startedAttempt)
      await this.coreFlows.saveExerciseRuntime(
        context.campus.id,
        context.profile.id,
        context.entry.context,
        exercise.id,
        prepared,
      )

      if (!isPreparedExerciseRuntime(prepared)) {
        context.warnings.push({
          tool: "exercises",
          code: "exercise_runtime_not_offline_compatible",
          message: `${exercise.title}: the prepared attempt did not include a compatible mobile question runtime.`,
        })
        continue
      }

      context.notifyResource(`${exercise.title} · attempt ${prepared.attempt!.attemptId}`)

      if (exercise.duration && exercise.duration > 0) {
        context.warnings.push({
          tool: "exercises",
          code: "exercise_timer_started",
          message: `${exercise.title}: its server timer started while the offline package was prepared.`,
        })
      }
    }
  }

  private async prepareAssignments(context: PreparationContext): Promise<void> {
    const service = new AssignmentApiService(context.client)
    const collection = await service.getAssignments(context.entry.context)
    await this.coreFlows.saveAssignmentList(
      context.campus.id,
      context.profile.id,
      context.entry.context,
      collection,
    )
    context.notifyResource("Assignments")

    for (const assignment of collection.items) {
      if (this.cancelRequested) return
      const detail = await service.getAssignment(context.entry.context, assignment.id)
      await this.coreFlows.saveAssignmentDetail(
        context.campus.id,
        context.profile.id,
        context.entry.context,
        assignment.id,
        detail,
      )
      context.notifyResource(assignment.title)

      for (const submission of detail.submissions) {
        await this.prefetchBlob(context, "assignments", submission.title, submission.downloadUrl)
        await this.prefetchBlob(
          context,
          "assignments",
          submission.correctionTitle ?? submission.title,
          submission.correctionDownloadUrl,
        )

        for (const comment of submission.comments) {
          await this.prefetchBlob(
            context,
            "assignments",
            comment.fileName ?? assignment.title,
            comment.downloadUrl,
          )
        }
      }
    }
  }

  private async prepareForums(context: PreparationContext): Promise<void> {
    const service = new ForumApiService(context.client)
    const collection = await service.getForums(context.entry.context)
    const forums = [
      ...collection.categories.flatMap((category) => category.forums),
      ...collection.uncategorized,
    ]
    context.notifyResource("Forums")

    for (const forum of forums) {
      if (this.cancelRequested) return
      const threads = await service.getThreads(context.entry.context, forum.id)
      context.notifyResource(forum.title)

      for (const thread of threads.items) {
        if (this.cancelRequested) return
        const detail = await service.getThread(context.entry.context, forum.id, thread.id)
        context.notifyResource(thread.title)

        for (const post of detail.posts) {
          for (const attachment of post.attachments) {
            await this.prefetchBlob(context, "forums", attachment.filename, attachment.downloadUrl)
          }
        }
      }
    }
  }

  private async prepareSurveys(context: PreparationContext): Promise<void> {
    const service = new SurveyApiService(context.client)
    const collection = await service.getSurveys(context.entry.context)
    await this.coreFlows.saveSurveyList(
      context.campus.id,
      context.profile.id,
      context.entry.context,
      collection,
    )
    context.notifyResource("Surveys")

    for (const survey of collection.items) {
      if (this.cancelRequested) return
      if (!survey.openMode) continue

      const detail = await service.getSurvey(
        context.entry.context,
        survey.id,
        survey.openMode,
        survey.invitationLpItemId,
        survey.invitationCode,
      )
      await this.coreFlows.saveSurveyDetail(
        context.campus.id,
        context.profile.id,
        context.entry.context,
        survey.id,
        survey.openMode,
        survey.invitationLpItemId,
        survey.invitationCode,
        detail,
      )
      context.notifyResource(survey.title)
    }
  }

  private async prefetchBlob(
    context: PreparationContext,
    tool: CourseToolKey,
    label: string,
    path: string | null,
  ): Promise<void> {
    if (!path || this.cancelRequested) return

    try {
      const response = await context.client.request<Blob>({
        method: "GET",
        path,
        headers: { Accept: "*/*" },
        responseType: "blob",
        timeoutMs: 60_000,
      })

      if (response.data instanceof Blob) {
        context.notifyResource(label, response.data.size)
      }
    } catch (error) {
      context.warnings.push({
        tool,
        code: errorCode(error),
        message: `${label}: ${errorMessage(error)}`,
      })
    }
  }
}
