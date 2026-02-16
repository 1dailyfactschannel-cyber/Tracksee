export function trackseeHeatmap(config: {
  apiKey: string
  apiUrl?: string
  userId?: string
  enabled?: boolean
  rageClickThreshold?: number
  rageClickTimeWindow?: number
  scrollThrottle?: number
}) {
  if (typeof window === "undefined") {
    return {
      updateUserId: () => {},
      enable: () => {},
      disable: () => {},
      destroy: () => {}
    }
  }

  const apiKey = config.apiKey
  const apiUrl = config.apiUrl || "/api/ingest"
  let userId: string | null = config.userId || null
  let enabled = config.enabled !== false
  const rageClickThreshold = config.rageClickThreshold || 3
  const rageClickTimeWindow = config.rageClickTimeWindow || 1000
  const scrollThrottle = config.scrollThrottle || 500

  let sessionId = "s_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  let clickBuffer: Array<Record<string, unknown>> = []
  let scrollBuffer: Array<Record<string, unknown>> = []
  let rageClickMap = new Map<string, number[]>()
  let lastScrollY = 0
  let maxScrollDepth = 0
  let lastScrollTime = 0
  let initialized = false

  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === "x" ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  function getElementSelector(element: Element): string {
    if (!element || element === document.body) return "body"

    if (element.id) {
      return "#" + element.id
    }

    let selector = ""
    if (element.className && typeof element.className === "string" && element.className.trim()) {
      selector = "." + element.className.trim().split(/\s+/).join(".")
    }

    if (selector) {
      const parent = element.parentElement
      if (parent) {
        const index = getElementIndex(element)
        selector = parent.tagName.toLowerCase() + ":nth-child(" + index + ") > " + selector
      }
    } else {
      selector = element.tagName.toLowerCase()
      const parent = element.parentElement
      if (parent) {
        const index = getElementIndex(element)
        selector = parent.tagName.toLowerCase() + ":nth-child(" + index + ") > " + selector
      }
    }

    return selector
  }

  function getElementIndex(element: Element): number {
    let index = 1
    let sibling = element.previousElementSibling

    while (sibling) {
      if (sibling.tagName === element.tagName) {
        index++
      }
      sibling = sibling.previousElementSibling
    }

    return index
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

  function send(data: Record<string, unknown>) {
    if (!enabled) return

    const payload = {
      ...data,
      apiKey
    }

    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {})
  }

  function init() {
    if (initialized || typeof document === "undefined") return
    initialized = true

    document.addEventListener("click", (e) => {
      const target = e.target as Element
      const selector = getElementSelector(target)
      const text = target.textContent?.slice(0, 200) || ""

      clickBuffer.push({
        event_type: "heatmap_click",
        x: e.clientX,
        y: e.clientY,
        selector,
        text,
        page_url: window.location.pathname + window.location.search,
        session_id: sessionId,
        user_id: userId
      })

      const key = `${Math.round(e.clientX)},${Math.round(e.clientY)}`
      const now = Date.now()

      let clicks = rageClickMap.get(key) || []
      clicks = clicks.filter(time => now - time < rageClickTimeWindow)
      clicks.push(now)
      rageClickMap.set(key, clicks)

      if (clicks.length >= rageClickThreshold) {
        send({
          event_type: "rage_click",
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
          selector,
          text,
          click_count: clicks.length,
          page_url: window.location.pathname + window.location.search,
          session_id: sessionId,
          user_id: userId
        })
        rageClickMap.delete(key)
      }
    }, true)

    const handleScroll = () => {
      const now = Date.now()
      if (now - lastScrollTime < scrollThrottle) return
      lastScrollTime = now

      const scrollY = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const depth = docHeight > 0 ? Math.round((scrollY / docHeight) * 100) : 0

      if (depth > maxScrollDepth) {
        maxScrollDepth = depth
      }

      scrollBuffer.push({
        event_type: "heatmap_scroll",
        depth,
        viewport_height: window.innerHeight,
        viewport_width: window.innerWidth,
        page_url: window.location.pathname + window.location.search,
        session_id: sessionId
      })
    }

    window.addEventListener("scroll", handleScroll, true)
    handleScroll()

    send({
      event_type: "session_start",
      session_id: sessionId,
      user_id: userId,
      url: window.location.href,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      screen_width: window.screen.width,
      screen_height: window.screen.height
    })

    window.addEventListener("beforeunload", () => {
      flushAll()
    })

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushAll()
      }
    })

    setInterval(() => {
      flushClickBuffer()
      flushScrollBuffer()
    }, 1000)
  }

  function flushClickBuffer() {
    if (clickBuffer.length === 0) return

    const batch = clickBuffer.splice(0, 10)
    batch.forEach(item => send(item))
  }

  function flushScrollBuffer() {
    if (scrollBuffer.length === 0) return

    const uniqueDepths = new Map()
    scrollBuffer.forEach(item => {
      const key = `${item.depth}-${(item as Record<string, unknown>).viewport_height}-${(item as Record<string, unknown>).viewport_width}`
      if (!uniqueDepths.has(key)) {
        uniqueDepths.set(key, item)
      }
    })
    scrollBuffer = []

    uniqueDepths.forEach(item => send(item))
  }

  function flushAll() {
    flushClickBuffer()
    flushScrollBuffer()
  }

  function updateUserId(newUserId: string) {
    userId = newUserId
  }

  function enable() {
    enabled = true
  }

  function disable() {
    enabled = false
  }

  function destroy() {
    enabled = false
    initialized = false
    flushAll()
  }

  init()

  return {
    updateUserId,
    enable,
    disable,
    destroy
  }
}
