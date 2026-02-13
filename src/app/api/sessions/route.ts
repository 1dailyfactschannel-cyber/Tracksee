import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const apiKey = request.headers.get("x-api-key") || url.searchParams.get("key")

    if (!apiKey) {
      return new NextResponse(
        JSON.stringify({ error: "Missing API Key" }),
        { status: 401 }
      )
    }

    const projectResult = await db.query(
      "SELECT id FROM projects WHERE api_key = $1",
      [apiKey]
    )

    const project = projectResult.rows[0]

    if (!project) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid API Key" }),
        { status: 401 }
      )
    }

    const sessionId = url.searchParams.get("session_id")
    const userId = url.searchParams.get("user_id")
    const status = url.searchParams.get("status")
    const limit = parseInt(url.searchParams.get("limit") || "50")
    const offset = parseInt(url.searchParams.get("offset") || "0")
    const sortBy = url.searchParams.get("sort_by") || "started_at"
    const sortOrder = url.searchParams.get("sort_order") || "DESC"

    let query = `
      SELECT sr.*,
        (SELECT COUNT(*) FROM session_events se WHERE se.recording_id = sr.id) as total_events
      FROM session_recordings sr
      WHERE sr.project_id = $1
    `
    const params: unknown[] = [project.id]
    let paramIndex = 2

    if (sessionId) {
      query += ` AND sr.session_id = $${paramIndex}`
      params.push(sessionId)
      paramIndex++
    }

    if (userId) {
      query += ` AND sr.user_id = $${paramIndex}`
      params.push(userId)
      paramIndex++
    }

    if (status) {
      query += ` AND sr.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    const validSortFields = ["started_at", "duration", "events_count", "screen_width"]
    const sortField = validSortFields.includes(sortBy) ? sortBy : "started_at"
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"

    query += ` ORDER BY sr.${sortField} ${order}`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await db.query(query, params)

    const countQuery = `SELECT COUNT(*) FROM session_recordings WHERE project_id = $1`
    const countResult = await db.query(countQuery, [project.id])
    const total = parseInt(countResult.rows[0].count)

    return NextResponse.json({
      sessions: result.rows,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error("Sessions API error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const apiKey = request.headers.get("x-api-key") || url.searchParams.get("key")

    if (!apiKey) {
      return new NextResponse(
        JSON.stringify({ error: "Missing API Key" }),
        { status: 401 }
      )
    }

    const projectResult = await db.query(
      "SELECT id FROM projects WHERE api_key = $1",
      [apiKey]
    )

    const project = projectResult.rows[0]

    if (!project) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid API Key" }),
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      session_id,
      user_id,
      browser,
      os,
      device_type,
      screen_width,
      screen_height,
      url: pageUrl,
      referrer,
      metadata
    } = body

    if (!session_id || !pageUrl) {
      return new NextResponse(
        JSON.stringify({ error: "Missing required fields: session_id, url" }),
        { status: 400 }
      )
    }

    const existingSession = await db.query(
      `SELECT id, status FROM session_recordings
       WHERE project_id = $1 AND session_id = $2`,
      [project.id, session_id]
    )

    if (existingSession.rows.length > 0) {
      if (existingSession.rows[0].status === "completed") {
        return NextResponse.json({
          success: false,
          error: "Session already completed",
          session_id
        })
      }

      await db.query(
        `UPDATE session_recordings
         SET ended_at = CURRENT_TIMESTAMP,
             status = 'completed',
             duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER,
             metadata = $1
         WHERE id = $2`,
        [JSON.stringify(metadata || {}), existingSession.rows[0].id]
      )

      return NextResponse.json({
        success: true,
        session_id,
        action: "completed",
        recording_id: existingSession.rows[0].id
      })
    }

    const result = await db.query(
      `INSERT INTO session_recordings
       (project_id, session_id, user_id, browser, os, device_type, screen_width, screen_height, url, referrer, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        project.id,
        session_id,
        user_id,
        browser,
        os,
        device_type || "desktop",
        screen_width,
        screen_height,
        pageUrl,
        referrer,
        JSON.stringify(metadata || {})
      ]
    )

    return NextResponse.json({
      success: true,
      session_id,
      recording_id: result.rows[0].id,
      action: "started"
    })
  } catch (error) {
    console.error("Session create error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}
