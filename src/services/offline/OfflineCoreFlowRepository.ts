import type { AssignmentCollection, AssignmentDetail } from "@/domain/assignments/types"
import type { CourseNavigationContext } from "@/domain/courses/types"
import type { ExerciseList, ExerciseRuntime } from "@/domain/exercises/types"
import type { LearningPathRuntime } from "@/domain/learningPaths/types"
import type { SurveyCollection, SurveyDetail, SurveyOpenMode } from "@/domain/surveys/types"
import {
  offlineSnapshotRepository,
  type OfflineSnapshotRepository,
} from "@/services/offline/OfflineSnapshotRepository"

interface PreparedRecordBase {
  version: 1
  preparedAt: string
}

interface PreparedCoreFlowIndex extends PreparedRecordBase {
  kind: "core-flow-index"
  keys: string[]
}

export interface PreparedCoreFlowStats {
  records: number
  bytes: number
}

function estimatePreparedSize(value: unknown, seen = new WeakSet<object>()): number {
  if (value === null || value === undefined) return 0
  if (value instanceof Blob) return value.size
  if (value instanceof ArrayBuffer) return value.byteLength
  if (ArrayBuffer.isView(value)) return value.byteLength
  if (typeof value === "string") return new TextEncoder().encode(value).byteLength
  if (typeof value === "number" || typeof value === "boolean") return 8
  if (typeof value !== "object") return 0
  if (seen.has(value)) return 0

  seen.add(value)

  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + estimatePreparedSize(item, seen), 0)
  }

  return Object.entries(value).reduce(
    (total, [key, item]) =>
      total + new TextEncoder().encode(key).byteLength + estimatePreparedSize(item, seen),
    0,
  )
}

export interface PreparedExerciseList extends PreparedRecordBase {
  kind: "exercise-list"
  data: ExerciseList
}

export interface PreparedExerciseRuntime extends PreparedRecordBase {
  kind: "exercise-runtime"
  exerciseId: number
  data: ExerciseRuntime
}

export interface PreparedLearningPathItem extends PreparedRecordBase {
  kind: "learning-path-item"
  learningPathId: number
  itemId: number
  runtime: LearningPathRuntime
  contentBlob: Blob | null
  audioBlob: Blob | null
}

export interface PreparedAssignmentList extends PreparedRecordBase {
  kind: "assignment-list"
  data: AssignmentCollection
}

export interface PreparedAssignmentDetail extends PreparedRecordBase {
  kind: "assignment-detail"
  assignmentId: number
  data: AssignmentDetail
}

export interface PreparedSurveyList extends PreparedRecordBase {
  kind: "survey-list"
  data: SurveyCollection
}

export interface PreparedSurveyDetail extends PreparedRecordBase {
  kind: "survey-detail"
  surveyId: number
  mode: SurveyOpenMode
  invitationLpItemId: number
  invitationCode: string
  data: SurveyDetail
}

function contextScope(context: CourseNavigationContext): string {
  return [
    context.courseId,
    context.sessionId ?? 0,
    context.membershipId ?? 0,
    context.sessionCourseId ?? 0,
    context.source,
  ].join(":")
}

export function preparedCoreFlowIndexKey(context: CourseNavigationContext): string {
  return `prepared:index:${contextScope(context)}`
}

export function preparedExerciseListKey(context: CourseNavigationContext): string {
  return `prepared:exercises:list:${contextScope(context)}`
}

export function preparedExerciseRuntimeKey(
  context: CourseNavigationContext,
  exerciseId: number,
): string {
  return `prepared:exercises:runtime:${contextScope(context)}:${exerciseId}`
}

export function preparedLearningPathItemKey(
  context: CourseNavigationContext,
  learningPathId: number,
  itemId: number,
): string {
  return `prepared:learning-path:${contextScope(context)}:${learningPathId}:${itemId}`
}

export function preparedAssignmentListKey(context: CourseNavigationContext): string {
  return `prepared:assignments:list:${contextScope(context)}`
}

export function preparedAssignmentDetailKey(
  context: CourseNavigationContext,
  assignmentId: number,
): string {
  return `prepared:assignments:detail:${contextScope(context)}:${assignmentId}`
}

export function preparedSurveyListKey(context: CourseNavigationContext): string {
  return `prepared:surveys:list:${contextScope(context)}`
}

export function preparedSurveyDetailKey(
  context: CourseNavigationContext,
  surveyId: number,
  mode: SurveyOpenMode,
  invitationLpItemId: number,
  invitationCode: string,
): string {
  return [
    "prepared:surveys:detail",
    contextScope(context),
    surveyId,
    mode,
    invitationLpItemId,
    invitationCode,
  ].join(":")
}

function preparedAt(): string {
  return new Date().toISOString()
}

export class OfflineCoreFlowRepository {
  constructor(private readonly snapshots: OfflineSnapshotRepository = offlineSnapshotRepository) {}

  private async savePrepared<TData>(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    snapshotKey: string,
    data: TData,
  ): Promise<void> {
    await this.snapshots.save(campusId, userId, snapshotKey, data)

    const indexKey = preparedCoreFlowIndexKey(context)
    const current = await this.snapshots
      .load<PreparedCoreFlowIndex>(campusId, userId, indexKey)
      .catch(() => null)
    const keys =
      current?.data.version === 1 && current.data.kind === "core-flow-index"
        ? current.data.keys
        : []

    if (keys.includes(snapshotKey)) return

    await this.snapshots.save<PreparedCoreFlowIndex>(campusId, userId, indexKey, {
      version: 1,
      kind: "core-flow-index",
      preparedAt: preparedAt(),
      keys: [...keys, snapshotKey],
    })
  }

  async getContextStats(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
  ): Promise<PreparedCoreFlowStats> {
    const current = await this.snapshots
      .load<PreparedCoreFlowIndex>(campusId, userId, preparedCoreFlowIndexKey(context))
      .catch(() => null)

    if (current?.data.version !== 1 || current.data.kind !== "core-flow-index") {
      return { records: 0, bytes: 0 }
    }

    let records = 0
    let bytes = 0

    for (const key of current.data.keys) {
      const record = await this.snapshots.load<unknown>(campusId, userId, key).catch(() => null)
      if (!record) continue

      records += 1
      bytes += estimatePreparedSize(record.data)
    }

    return { records, bytes }
  }

  async clearContext(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
  ): Promise<void> {
    const indexKey = preparedCoreFlowIndexKey(context)
    const current = await this.snapshots
      .load<PreparedCoreFlowIndex>(campusId, userId, indexKey)
      .catch(() => null)

    if (current?.data.version === 1 && current.data.kind === "core-flow-index") {
      for (const key of current.data.keys) {
        await this.snapshots.delete(campusId, userId, key)
      }
    }

    await this.snapshots.delete(campusId, userId, indexKey)
  }

  async saveExerciseList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    data: ExerciseList,
  ): Promise<void> {
    await this.savePrepared<PreparedExerciseList>(
      campusId,
      userId,
      context,
      preparedExerciseListKey(context),
      { version: 1, kind: "exercise-list", preparedAt: preparedAt(), data },
    )
  }

  async loadExerciseList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
  ): Promise<ExerciseList | null> {
    const record = await this.snapshots.load<PreparedExerciseList>(
      campusId,
      userId,
      preparedExerciseListKey(context),
    )

    return record?.data.version === 1 && record.data.kind === "exercise-list"
      ? record.data.data
      : null
  }

  async saveExerciseRuntime(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    exerciseId: number,
    data: ExerciseRuntime,
  ): Promise<void> {
    await this.savePrepared<PreparedExerciseRuntime>(
      campusId,
      userId,
      context,
      preparedExerciseRuntimeKey(context, exerciseId),
      { version: 1, kind: "exercise-runtime", preparedAt: preparedAt(), exerciseId, data },
    )
  }

  async loadExerciseRuntime(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    exerciseId: number,
  ): Promise<ExerciseRuntime | null> {
    const record = await this.snapshots.load<PreparedExerciseRuntime>(
      campusId,
      userId,
      preparedExerciseRuntimeKey(context, exerciseId),
    )

    return record?.data.version === 1 &&
      record.data.kind === "exercise-runtime" &&
      record.data.exerciseId === exerciseId
      ? record.data.data
      : null
  }

  async saveLearningPathItem(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
    runtime: LearningPathRuntime,
    contentBlob: Blob | null = null,
    audioBlob: Blob | null = null,
  ): Promise<void> {
    await this.savePrepared<PreparedLearningPathItem>(
      campusId,
      userId,
      context,
      preparedLearningPathItemKey(context, learningPathId, itemId),
      {
        version: 1,
        kind: "learning-path-item",
        preparedAt: preparedAt(),
        learningPathId,
        itemId,
        runtime,
        contentBlob,
        audioBlob,
      },
    )
  }

  async loadLearningPathItem(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    learningPathId: number,
    itemId: number,
  ): Promise<PreparedLearningPathItem | null> {
    const record = await this.snapshots.load<PreparedLearningPathItem>(
      campusId,
      userId,
      preparedLearningPathItemKey(context, learningPathId, itemId),
    )

    return record?.data.version === 1 &&
      record.data.kind === "learning-path-item" &&
      record.data.learningPathId === learningPathId &&
      record.data.itemId === itemId
      ? record.data
      : null
  }

  async saveAssignmentList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    data: AssignmentCollection,
  ): Promise<void> {
    await this.savePrepared<PreparedAssignmentList>(
      campusId,
      userId,
      context,
      preparedAssignmentListKey(context),
      { version: 1, kind: "assignment-list", preparedAt: preparedAt(), data },
    )
  }

  async loadAssignmentList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
  ): Promise<AssignmentCollection | null> {
    const record = await this.snapshots.load<PreparedAssignmentList>(
      campusId,
      userId,
      preparedAssignmentListKey(context),
    )

    return record?.data.version === 1 && record.data.kind === "assignment-list"
      ? record.data.data
      : null
  }

  async saveAssignmentDetail(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    assignmentId: number,
    data: AssignmentDetail,
  ): Promise<void> {
    await this.savePrepared<PreparedAssignmentDetail>(
      campusId,
      userId,
      context,
      preparedAssignmentDetailKey(context, assignmentId),
      { version: 1, kind: "assignment-detail", preparedAt: preparedAt(), assignmentId, data },
    )
  }

  async loadAssignmentDetail(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    assignmentId: number,
  ): Promise<AssignmentDetail | null> {
    const record = await this.snapshots.load<PreparedAssignmentDetail>(
      campusId,
      userId,
      preparedAssignmentDetailKey(context, assignmentId),
    )

    return record?.data.version === 1 &&
      record.data.kind === "assignment-detail" &&
      record.data.assignmentId === assignmentId
      ? record.data.data
      : null
  }

  async saveSurveyList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    data: SurveyCollection,
  ): Promise<void> {
    await this.savePrepared<PreparedSurveyList>(
      campusId,
      userId,
      context,
      preparedSurveyListKey(context),
      { version: 1, kind: "survey-list", preparedAt: preparedAt(), data },
    )
  }

  async loadSurveyList(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
  ): Promise<SurveyCollection | null> {
    const record = await this.snapshots.load<PreparedSurveyList>(
      campusId,
      userId,
      preparedSurveyListKey(context),
    )

    return record?.data.version === 1 && record.data.kind === "survey-list"
      ? record.data.data
      : null
  }

  async saveSurveyDetail(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    surveyId: number,
    mode: SurveyOpenMode,
    invitationLpItemId: number,
    invitationCode: string,
    data: SurveyDetail,
  ): Promise<void> {
    await this.savePrepared<PreparedSurveyDetail>(
      campusId,
      userId,
      context,
      preparedSurveyDetailKey(context, surveyId, mode, invitationLpItemId, invitationCode),
      {
        version: 1,
        kind: "survey-detail",
        preparedAt: preparedAt(),
        surveyId,
        mode,
        invitationLpItemId,
        invitationCode,
        data,
      },
    )
  }

  async loadSurveyDetail(
    campusId: string,
    userId: number,
    context: CourseNavigationContext,
    surveyId: number,
    mode: SurveyOpenMode,
    invitationLpItemId: number,
    invitationCode: string,
  ): Promise<SurveyDetail | null> {
    const record = await this.snapshots.load<PreparedSurveyDetail>(
      campusId,
      userId,
      preparedSurveyDetailKey(context, surveyId, mode, invitationLpItemId, invitationCode),
    )

    return record?.data.version === 1 &&
      record.data.kind === "survey-detail" &&
      record.data.surveyId === surveyId &&
      record.data.mode === mode &&
      record.data.invitationLpItemId === invitationLpItemId &&
      record.data.invitationCode === invitationCode
      ? record.data.data
      : null
  }
}

export const offlineCoreFlowRepository = new OfflineCoreFlowRepository()
