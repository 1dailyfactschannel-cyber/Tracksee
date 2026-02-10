import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const apiKey = request.headers.get("x-api-key") || url.searchParams.get("key") || url.searchParams.get("apiKey")

    if (!apiKey || apiKey === "undefined") {
      return NextResponse.json(
        { error: "Missing or invalid API Key. Provide it via 'x-api-key' header or '?key=' query parameter." },
        { status: 401 }
      )
    }

    // Basic UUID format check to avoid DB error 22P02
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(apiKey)) {
      return NextResponse.json(
        { error: "Invalid API Key format. Must be a valid UUID." },
        { status: 400 }
      )
    }

    let body: unknown = {}
    try {
        body = await request.json()
    } catch {
        body = {}
    }

    const payload = body as Record<string, unknown>
    
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
       return NextResponse.json(
        { error: "Invalid API Key" },
        { status: 401 }
      )
    }

    // 2. Insert Event
    await db.query(
      `INSERT INTO events (project_id, type, name, status_code, duration, path, message, metadata, session_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        project.id,
        type || "unknown",
        name || "unknown",
        status_code,
        duration,
        path,
        message,
        JSON.stringify(metadata),
        session_id
      ]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ingest error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  })
}
