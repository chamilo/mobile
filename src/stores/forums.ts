import { reactive } from "vue"
import { defineStore } from "pinia"

import type { CourseNavigationContext } from "@/domain/courses/types"
import type {
  ForumCollection,
  ForumThreadDetail,
  ForumThreadsCollection,
} from "@/domain/forums/types"
import { createAuthenticatedHttpClient } from "@/services/auth/createAuthenticatedHttpClient"
import {
  ForumApiService,
  type ForumErrorCode,
  ForumServiceError,
} from "@/services/forums/ForumApiService"
import { useCampusStore } from "@/stores/campus"

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

export const useForumsStore = defineStore("forums", () => {
  const list = reactive<ForumListState>(listInitialState())
  const threads = reactive<ForumThreadsState>(threadsInitialState())
  const thread = reactive<ForumThreadState>(threadInitialState())

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

  async function loadThreads(context: CourseNavigationContext, forumId: number): Promise<boolean> {
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
      threads.data = await api.getThreads(context, forumId)
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
      thread.data = await api.getThread(context, forumId, threadId)
      thread.status = "ready"
      return true
    } catch (error) {
      thread.errorCode = error instanceof ForumServiceError ? error.code : "server"
      thread.status = "error"
      return false
    }
  }

  function reset(): void {
    Object.assign(list, listInitialState())
    Object.assign(threads, threadsInitialState())
    Object.assign(thread, threadInitialState())
  }

  return {
    list,
    threads,
    thread,
    loadForums,
    loadThreads,
    loadThread,
    reset,
  }
})
