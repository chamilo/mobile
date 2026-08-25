import { reactive } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import type { ForumLearningPathContext } from "@/domain/forums/learningPathContext"
import type {
  CreateForumReplyInput,
  CreateForumThreadInput,
  ForumCollection,
  ForumThreadDetail,
  ForumThreadsCollection,
  ForumWriteResult,
} from "@/domain/forums/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  ForumApiService,
  type ForumErrorCode,
  ForumServiceError,
} from "@/services/forums/ForumApiService"
import {
  isOfflineNow,
  isUncertainDeliveryError,
  temporaryOfflineId,
} from "@/services/offline/OfflineWriteSupport"
import { useCampusStore } from "@/stores/campus"
import { useOfflineSyncStore } from "@/stores/offlineSync"

export type ForumLoadStatus = "idle" | "loading" | "ready" | "error"
export type ForumStoreErrorCode = ForumErrorCode | "campus_required"

interface ForumListState {
  status: ForumLoadStatus
  data: ForumCollection | null
  errorCode: ForumStoreErrorCode | null
}

interface ForumThreadsState {
  status: ForumLoadStatus
  data: ForumThreadsCollection | null
  errorCode: ForumStoreErrorCode | null
}

interface ForumThreadState {
  status: ForumLoadStatus
  data: ForumThreadDetail | null
  errorCode: ForumStoreErrorCode | null
}

interface ForumWriteState {
  status: "idle" | "saving" | "success" | "error"
  result: ForumWriteResult | null
  errorCode: ForumStoreErrorCode | null
}

function listInitialState(): ForumListState {
  return {
    status: "idle",
    data: null,
    errorCode: null,
  }
}

function threadsInitialState(): ForumThreadsState {
  return {
    status: "idle",
    data: null,
    errorCode: null,
  }
}

function threadInitialState(): ForumThreadState {
  return {
    status: "idle",
    data: null,
    errorCode: null,
  }
}

function writeInitialState(): ForumWriteState {
  return {
    status: "idle",
    result: null,
    errorCode: null,
  }
}

export const useForumsStore = defineStore("forums", () => {
  const list = reactive<ForumListState>(listInitialState())
  const threads = reactive<ForumThreadsState>(threadsInitialState())
  const thread = reactive<ForumThreadState>(threadInitialState())
  const write = reactive<ForumWriteState>(writeInitialState())

  function service(): ForumApiService | null {
    const campus = useCampusStore().selectedCampus
    if (!campus) return null

    return new ForumApiService(createAuthenticatedHttpClient(campus))
  }

  async function loadForums(context: CourseNavigationContext): Promise<boolean> {
    const api = service()
    if (!api) {
      list.status = "error"
      list.data = null
      list.errorCode = "campus_required"
      return false
    }

    list.status = "loading"
    list.data = null
    list.errorCode = null

    try {
      list.data = await api.getForums(context)
      list.status = "ready"
      return true
    } catch (error) {
      list.errorCode = error instanceof ForumServiceError ? error.code : "server"
      list.status = "error"
      return false
    }
  }

  async function loadThreads(
    context: CourseNavigationContext,
    forumId: number,
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<boolean> {
    const api = service()
    if (!api) {
      threads.status = "error"
      threads.data = null
      threads.errorCode = "campus_required"
      return false
    }

    threads.status = "loading"
    threads.data = null
    threads.errorCode = null

    try {
      threads.data = await api.getThreads(context, forumId, learningPathContext)
      threads.status = "ready"
      return true
    } catch (error) {
      threads.errorCode = error instanceof ForumServiceError ? error.code : "server"
      threads.status = "error"
      return false
    }
  }

  async function loadThread(
    context: CourseNavigationContext,
    forumId: number,
    threadId: number,
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<boolean> {
    const api = service()
    if (!api) {
      thread.status = "error"
      thread.data = null
      thread.errorCode = "campus_required"
      return false
    }

    thread.status = "loading"
    thread.data = null
    thread.errorCode = null

    try {
      thread.data = await api.getThread(context, forumId, threadId, learningPathContext)
      thread.status = "ready"
      return true
    } catch (error) {
      thread.errorCode = error instanceof ForumServiceError ? error.code : "server"
      thread.status = "error"
      return false
    }
  }

  async function createThread(
    context: CourseNavigationContext,
    forumId: number,
    input: CreateForumThreadInput,
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<ForumWriteResult | null> {
    const api = service()
    if (!api) {
      write.status = "error"
      write.result = null
      write.errorCode = "campus_required"
      return null
    }

    write.status = "saving"
    write.result = null
    write.errorCode = null

    const queueThread = async (uncertainDelivery = false): Promise<ForumWriteResult | null> => {
      try {
        const request = await api.prepareCreateThreadRequest(
          context,
          forumId,
          input,
          learningPathContext,
        )
        const queued = await useOfflineSyncStore().enqueueHttpWrite({
          category: "forum_thread_create",
          request,
          description: input.title.trim() || "Forum thread",
          uncertainDelivery,
        })
        if (!queued || uncertainDelivery) return null

        write.result = {
          threadId: temporaryOfflineId(),
          postId: temporaryOfflineId(),
          requiresApproval: false,
          message: "Saved on this device and waiting to sync.",
        }
        write.status = "success"
        return write.result
      } catch (error) {
        write.errorCode = error instanceof ForumServiceError ? error.code : "server"
        write.status = "error"
        return null
      }
    }

    if (isOfflineNow()) return queueThread()

    try {
      write.result = await api.createThread(context, forumId, input, learningPathContext)
      write.status = "success"
      return write.result
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueThread(true)
      write.errorCode = error instanceof ForumServiceError ? error.code : "server"
      write.status = "error"
      return null
    }
  }

  async function createReply(
    context: CourseNavigationContext,
    forumId: number,
    threadId: number,
    input: CreateForumReplyInput,
    learningPathContext?: ForumLearningPathContext | null,
  ): Promise<ForumWriteResult | null> {
    const api = service()
    if (!api) {
      write.status = "error"
      write.result = null
      write.errorCode = "campus_required"
      return null
    }

    write.status = "saving"
    write.result = null
    write.errorCode = null

    const queueReply = async (uncertainDelivery = false): Promise<ForumWriteResult | null> => {
      try {
        const request = await api.prepareCreateReplyRequest(
          context,
          forumId,
          threadId,
          input,
          learningPathContext,
        )
        const queued = await useOfflineSyncStore().enqueueHttpWrite({
          category: "forum_reply_create",
          request,
          description: input.title.trim() || "Forum reply",
          uncertainDelivery,
        })
        if (!queued || uncertainDelivery) return null

        write.result = {
          threadId,
          postId: temporaryOfflineId(),
          requiresApproval: false,
          message: "Saved on this device and waiting to sync.",
        }
        write.status = "success"
        return write.result
      } catch (error) {
        write.errorCode = error instanceof ForumServiceError ? error.code : "server"
        write.status = "error"
        return null
      }
    }

    if (isOfflineNow()) return queueReply()

    try {
      write.result = await api.createReply(
        context,
        forumId,
        threadId,
        input,
        learningPathContext,
      )
      write.status = "success"
      return write.result
    } catch (error) {
      if (isUncertainDeliveryError(error)) await queueReply(true)
      write.errorCode = error instanceof ForumServiceError ? error.code : "server"
      write.status = "error"
      return null
    }
  }

  function resetWrite(): void {
    Object.assign(write, writeInitialState())
  }

  function reset(): void {
    Object.assign(list, listInitialState())
    Object.assign(threads, threadsInitialState())
    Object.assign(thread, threadInitialState())
    Object.assign(write, writeInitialState())
  }

  return {
    list,
    threads,
    thread,
    write,
    loadForums,
    loadThreads,
    loadThread,
    createThread,
    createReply,
    resetWrite,
    reset,
  }
})
