"use client"

import { useEffect, useRef, useCallback } from "react"

interface UseTrackseeRecorderOptions {
  apiKey: string
  apiUrl?: string
  eventsApiUrl?: string
  userId?: string
  enabled?: boolean
  batchSize?: number
  batchTimeout?: number
}

export function useTrackseeRecorder(options: UseTrackseeRecorderOptions) {
  const recorderRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const initRecorder = async () => {
      try {
        const { trackseeSessionRecorder } = await import("@/lib/recorder/sdk")
        recorderRef.current = trackseeSessionRecorder({
          apiKey: options.apiKey,
          apiUrl: options.apiUrl || "/api/sessions",
          eventsApiUrl: options.eventsApiUrl || "/api/sessions/events",
          userId: options.userId,
          enabled: options.enabled !== false,
          batchSize: options.batchSize || 50,
          batchTimeout: options.batchTimeout || 2000
        })
      } catch (e) {
        console.warn("Tracksee Recorder SDK not found, loading from CDN")
      }
    }

    initRecorder()

    return () => {
      if (recorderRef.current && recorderRef.current.destroy) {
        recorderRef.current.destroy()
        recorderRef.current = null
      }
    }
  }, [options.apiKey, options.apiUrl, options.eventsApiUrl, options.userId, options.enabled])

  const updateUserId = useCallback((userId: string) => {
    if (recorderRef.current && recorderRef.current.updateUserId) {
      recorderRef.current.updateUserId(userId)
    }
  }, [])

  const pauseRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.pauseRecording) {
      recorderRef.current.pauseRecording()
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.resumeRecording) {
      recorderRef.current.resumeRecording()
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.stopRecording) {
      recorderRef.current.stopRecording()
    }
  }, [])

  return {
    updateUserId,
    pauseRecording,
    resumeRecording,
    stopRecording
  }
}

export default useTrackseeRecorder
