export function trackseeSessionRecorder(config: {
  apiKey: string
  apiUrl?: string
  eventsApiUrl?: string
  userId?: string
  enabled?: boolean
  batchSize?: number
  batchTimeout?: number
}) {
  if (typeof window === "undefined") {
    return {
      updateUserId: () => {},
      pauseRecording: () => {},
      resumeRecording: () => {},
      stopRecording: () => {},
      destroy: () => {}
    }
  }

  const apiKey = config.apiKey
  const apiUrl = config.apiUrl || "/api/sessions"
  const eventsApiUrl = config.eventsApiUrl || "/api/sessions/events"
  let userId: string | null = config.userId || null
  let enabled = config.enabled !== false
  const batchSize = config.batchSize || 50
  const batchTimeout = config.batchTimeout || 2000

  let sessionId = "sr_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  let sessionStartTime = Date.now()
  let initialized = false
  let recordingId: string | null = null
  let eventsCount = 0
  let isRecording = true
  let eventsBuffer: Array<Record<string, unknown>> = []

  const eventTypes = [
    "click", "dblclick", "mousedown", "mouseup", "mousemove", "mouseenter", "mouseleave", "mouseover", "mouseout",
    "keydown", "keyup", "keypress",
    "focus", "blur", "change", "input", "submit", "reset", "select",
    "scroll", "resize", "wheel",
    "touchstart", "touchend", "touchmove", "touchcancel",
    "load", "DOMContentLoaded", "beforeunload", "unload", "error", "hashchange", "popstate"
  ]

  function generateSessionId() {
    return "sr_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  }

  function getSelector(element: Element): string {
    if (!element || element === document.documentElement || element === document.body) {
      return element?.tagName?.toLowerCase() || "unknown"
    }

    if (element.id) {
      return "#" + element.id
    }

    let path = element.tagName.toLowerCase()
    if (element.className && typeof element.className === "string") {
      const classes = element.className.trim().split(/\s+/).slice(0, 3).join(".")
      if (classes) path += "." + classes
    }

    let parent = element.parentElement
    let depth = 0
    while (parent && depth < 3) {
      const index = Array.from(parent.children).indexOf(element) + 1
      path = parent.tagName.toLowerCase() + ":nth-child(" + index + ") > " + path
      element = parent
      parent = element.parentElement
      depth++
    }

    return path
  }

  function getDeviceType(): string {
    const width = window.innerWidth
    if (width < 768) return "mobile"
    if (width < 1024) return "tablet"
    return "desktop"
  }

  function getBrowser(): string {
    const ua = navigator.userAgent
    if (ua.includes("Chrome")) return "Chrome"
    if (ua.includes("Firefox")) return "Firefox"
    if (ua.includes("Safari")) return "Safari"
    if (ua.includes("Edge")) return "Edge"
    return "unknown"
  }

  function getOS(): string {
    const ua = navigator.userAgent
    if (ua.includes("Windows")) return "Windows"
    if (ua.includes("Mac")) return "macOS"
    if (ua.includes("Linux")) return "Linux"
    if (ua.includes("Android")) return "Android"
    if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) return "iOS"
    return "unknown"
  }

  function extractEventData(e: Event): Record<string, unknown> {
    const data: Record<string, unknown> = {
      timestamp: Date.now() - sessionStartTime
    }

    const event = e as unknown as Record<string, unknown>

    if (e.type === "scroll") {
      data.scrollX = window.scrollX
      data.scrollY = window.scrollY
    }

    if (e.type.startsWith("mouse") && "clientX" in event) {
      data.x = event.clientX
      data.y = event.clientY
      data.target = getSelector(e.target as Element)
    }

    if (e.type === "keydown" || e.type === "keyup") {
      data.key = event.key
      data.code = event.code
    }

    if (e.type === "input") {
      data.value = (e.target as HTMLInputElement)?.value?.slice(0, 100) || ""
      data.target = getSelector(e.target as Element)
    }

    return data
  }

  async function startSession() {
    if (!enabled) return

    const payload = {
      session_id: sessionId,
      user_id: userId,
      browser: getBrowser(),
      os: getOS(),
      device_type: getDeviceType(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      url: window.location.href,
      referrer: document.referrer,
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language
      }
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (data.recording_id) {
        recordingId = data.recording_id
      }
    } catch (err) {
      console.warn("SessionRecorder: Failed to start session")
    }
  }

  function recordEvent(eventType: string, data: Record<string, unknown>) {
    if (!enabled || !isRecording) return

    eventsBuffer.push({
      event_type: eventType,
      timestamp: data.timestamp || Math.round(performance.now()),
      data
    })

    eventsCount++

    if (eventsBuffer.length >= batchSize) {
      flushEvents()
    }
  }

  async function flushEvents() {
    if (eventsBuffer.length === 0) return

    const events = eventsBuffer.splice(0, batchSize)

    if (!recordingId) {
      await startSession()
      if (!recordingId) return
    }

    try {
      await fetch(eventsApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          recording_id: recordingId,
          session_id: sessionId,
          events
        }),
        keepalive: true
      })
    } catch (err) {
      eventsBuffer.unshift(...events)
    }
  }

  function setupEventListeners() {
    eventTypes.forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        if (!isRecording) return
        recordEvent(eventType, extractEventData(e))
      }, { passive: true, capture: true })
    })

    setInterval(() => {
      flushEvents()
    }, batchTimeout)

    window.addEventListener("beforeunload", () => {
      flushEvents()
    })

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushEvents()
      }
    })
  }

  function init() {
    if (initialized || typeof document === "undefined") return
    initialized = true

    startSession()
    setupEventListeners()
  }

  function updateUserId(newUserId: string) {
    userId = newUserId
  }

  function pauseRecording() {
    isRecording = false
    recordEvent("recorder", { action: "pause" })
  }

  function resumeRecording() {
    isRecording = true
    recordEvent("recorder", { action: "resume" })
  }

  function stopRecording() {
    isRecording = false
    recordEvent("recorder", { action: "stop" })
    flushEvents()
  }

  function destroy() {
    enabled = false
    initialized = false
    stopRecording()
  }

  init()

  return {
    updateUserId,
    pauseRecording,
    resumeRecording,
    stopRecording,
    destroy
  }
}
