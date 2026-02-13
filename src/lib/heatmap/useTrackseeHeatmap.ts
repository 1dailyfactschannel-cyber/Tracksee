"use client"

import { useEffect, useRef, useCallback } from "react"

interface UseTrackseeHeatmapOptions {
  apiKey: string
  apiUrl?: string
  userId?: string
  enabled?: boolean
  rageClickThreshold?: number
  rageClickTimeWindow?: number
  scrollThrottle?: number
}

export function useTrackseeHeatmap(options: UseTrackseeHeatmapOptions) {
  const trackerRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const initTracker = async () => {
      try {
        const { trackseeHeatmap } = await import("@/lib/heatmap/sdk")
        trackerRef.current = trackseeHeatmap({
          apiKey: options.apiKey,
          apiUrl: options.apiUrl || "/api/ingest",
          userId: options.userId,
          enabled: options.enabled !== false,
          rageClickThreshold: options.rageClickThreshold || 3,
          rageClickTimeWindow: options.rageClickTimeWindow || 1000,
          scrollThrottle: options.scrollThrottle || 500
        })
      } catch (e) {
        console.warn("Tracksee SDK not found, loading from CDN")
      }
    }

    initTracker()

    return () => {
      if (trackerRef.current && trackerRef.current.destroy) {
        trackerRef.current.destroy()
        trackerRef.current = null
      }
    }
  }, [options.apiKey, options.apiUrl, options.userId, options.enabled])

  const updateUserId = useCallback((userId: string) => {
    if (trackerRef.current && trackerRef.current.updateUserId) {
      trackerRef.current.updateUserId(userId)
    }
  }, [])

  const enable = useCallback(() => {
    if (trackerRef.current && trackerRef.current.enable) {
      trackerRef.current.enable()
    }
  }, [])

  const disable = useCallback(() => {
    if (trackerRef.current && trackerRef.current.disable) {
      trackerRef.current.disable()
    }
  }, [])

  return {
    updateUserId,
    enable,
    disable
  }
}

export default useTrackseeHeatmap
