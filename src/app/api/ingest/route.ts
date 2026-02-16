import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    
    // Read body first to check for API key inside JSON
    let body: unknown = {}
    try {
        body = await request.json()
    } catch {
        body = {}
    }
    const payload = body as Record<string, unknown>

    let apiKey = request.headers.get("x-api-key") || 
                 request.headers.get("api-key") || 
                 url.searchParams.get("key") || 
                 url.searchParams.get("apiKey")

    // Check Authorization header
    const authHeader = request.headers.get("authorization");
    if (!apiKey && authHeader) {
        if (authHeader.startsWith("Bearer ")) {
            apiKey = authHeader.substring(7);
        } else {
            apiKey = authHeader;
        }
    }

    // Check body for API key if not found yet
    if (!apiKey && payload && (payload.api_key || payload.apiKey || payload.key || payload.token)) {
        apiKey = (payload.api_key || payload.apiKey || payload.key || payload.token) as string;
    }

    if (!apiKey || apiKey === "undefined") {
      return new NextResponse(
        JSON.stringify({ error: "Missing or invalid API Key. Provide it via 'x-api-key' header, '?key=' query param, or in JSON body." }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key, api-key, Authorization",
          },
        }
      )
    }

    // Basic UUID format check to avoid DB error 22P02
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(apiKey)) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid API Key format. Must be a valid UUID." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key, api-key, Authorization",
          },
        }
      )
    }
    
    // Automatic data collection from request headers
    const userAgent = request.headers.get("user-agent") || "unknown"
    const referrer = request.headers.get("referer") || "direct"
    const ip = request.headers.get("x-forwarded-for") || "unknown"

    // Default values if specific fields are missing
    const type = (payload.type as string) || "webhook"
    const name = (payload.name as string) || "event"
    const status_code = (payload.status_code as number) || 200
    const duration = (payload.duration as number) || 0
    const path = (payload.path as string) || "/"
    const message = (payload.message as string) || JSON.stringify(payload).slice(0, 500) 
    const session_id = (payload.session_id as string) || (payload.sessionId as string) || null
    
    // Enrich metadata with automatic fields
    const metadata = {
        ...((payload.metadata as Record<string, unknown>) || payload),
        _auto: {
            userAgent,
            referrer,
            ip,
            collectedAt: new Date().toISOString()
        }
    }

    // 1. Verify API Key and get Project ID
    const projectResult = await db.query(
      "SELECT id FROM projects WHERE api_key = $1",
      [apiKey]
    )

    const project = projectResult.rows[0]

    if (!project) {
       return new NextResponse(
        JSON.stringify({ error: "Invalid API Key" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key, api-key, Authorization",
          },
        }
      )
    }

    // 2. Handle Heatmap events
    const eventType = payload.event_type as string || type

    if (eventType === 'heatmap_click' || eventType === 'click') {
      const x = payload.x as number
      const y = payload.y as number
      const selector = payload.selector as string || null
      const text = payload.text as string || null
      const pageUrl = payload.page_url as string || path
      const heatmapId = payload.heatmap_id as string || null

      if (x !== undefined && y !== undefined) {
        if (heatmapId) {
          await db.query(
            `INSERT INTO heatmap_clicks (heatmap_id, x, y, element_selector, element_text)
             VALUES ($1, $2, $3, $4, $5)`,
            [heatmapId, x, y, selector, text]
          )
        } else {
          const existingHeatmap = await db.query(
            `SELECT id FROM heatmaps WHERE project_id = $1 AND page_url = $2 LIMIT 1`,
            [project.id, pageUrl]
          )
          let hId = heatmapId
          if (existingHeatmap.rows.length === 0) {
            const newHeatmap = await db.query(
              `INSERT INTO heatmaps (project_id, name, url_pattern, page_url)
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [project.id, `Heatmap ${pageUrl}`, pageUrl, pageUrl]
            )
            hId = newHeatmap.rows[0].id
          } else {
            hId = existingHeatmap.rows[0].id
          }
          await db.query(
            `INSERT INTO heatmap_clicks (heatmap_id, x, y, element_selector, element_text)
             VALUES ($1, $2, $3, $4, $5)`,
            [hId, x, y, selector, text]
          )
        }
      }
    } else if (eventType === 'heatmap_scroll' || eventType === 'scroll') {
      const depth = payload.depth as number
      const viewportHeight = payload.viewport_height as number
      const viewportWidth = payload.viewport_width as number
      const pageUrl = payload.page_url as string || path
      const heatmapId = payload.heatmap_id as string || null

      if (depth !== undefined) {
        let hId = heatmapId
        if (!hId) {
          const existingHeatmap = await db.query(
            `SELECT id FROM heatmaps WHERE project_id = $1 AND page_url = $2 LIMIT 1`,
            [project.id, pageUrl]
          )
          if (existingHeatmap.rows.length === 0) {
            const newHeatmap = await db.query(
              `INSERT INTO heatmaps (project_id, name, url_pattern, page_url)
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [project.id, `Heatmap ${pageUrl}`, pageUrl, pageUrl]
            )
            hId = newHeatmap.rows[0].id
          } else {
            hId = existingHeatmap.rows[0].id
          }
        }
        await db.query(
          `INSERT INTO heatmap_scrolls (heatmap_id, depth_percentage, viewport_height, viewport_width)
           VALUES ($1, $2, $3, $4)`,
          [hId, depth, viewportHeight, viewportWidth]
        )
      }
    } else if (eventType === 'rage_click') {
      const x = payload.x as number
      const y = payload.y as number
      const selector = payload.selector as string || null
      const text = payload.text as string || null
      const clickCount = payload.click_count as number || 3
      const pageUrl = payload.page_url as string || path
      const userId = payload.user_id as string || null

      if (x !== undefined && y !== undefined) {
        await db.query(
          `INSERT INTO rage_clicks (project_id, session_id, user_id, x, y, element_selector, element_text, click_count, page_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [project.id, session_id, userId, x, y, selector, text, clickCount, pageUrl]
        )
      }
    } else if (eventType === 'session_start' || eventType === 'session_end') {
      const sessionId = payload.session_id as string || session_id
      const deviceType = payload.device_type as string || 'desktop'
      const browser = payload.browser as string || userAgent.split(' ')[0]
      const os = payload.os as string || userAgent.split('(')[1]?.split(')')[0] || 'unknown'
      const screenWidth = payload.screen_width as number
      const screenHeight = payload.screen_height as number
      const url = payload.url as string || path
      const recordingData = payload.recording_data as object

      if (eventType === 'session_start') {
        await db.query(
          `INSERT INTO heatmap_sessions (project_id, session_id, url, device_type, browser, os, screen_width, screen_height, recording_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [project.id, sessionId, url, deviceType, browser, os, screenWidth, screenHeight, JSON.stringify(recordingData || {})]
        )
      } else {
        await db.query(
          `UPDATE heatmap_sessions SET ended_at = CURRENT_TIMESTAMP, recording_data = $1
           WHERE project_id = $2 AND session_id = $3`,
          [JSON.stringify(recordingData || {}), project.id, sessionId]
        )
      }
    } else {
      // Regular event
      await db.query(
        `INSERT INTO events (project_id, type, name, status_code, duration, path, message, metadata, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          project.id,
          eventType || "unknown",
          name || "unknown",
          status_code,
          duration,
          path,
          message,
          JSON.stringify(metadata),
          session_id
        ]
      )
    }

    // Return with CORS headers for cross-origin requests
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key, api-key, Authorization",
      },
    })
  } catch (error) {
    console.error("Ingest error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key, api-key, Authorization",
        },
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, api-key, Authorization",
    },
  })
}
