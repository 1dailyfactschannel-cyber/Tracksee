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

    const recordingId = url.searchParams.get("recording_id")
    const eventType = url.searchParams.get("event_type")
    const limit = parseInt(url.searchParams.get("limit") || "1000")
    const offset = parseInt(url.searchParams.get("offset") || "0")

    if (!recordingId) {
      return new NextResponse(
        JSON.stringify({ error: "Missing recording_id" }),
        { status: 400 }
      )
    }

    const recordingResult = await db.query(
      `SELECT id FROM session_recordings
       WHERE id = $1 AND project_id = $2`,
      [recordingId, project.id]
    )

    if (recordingResult.rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Recording not found" }),
        { status: 404 }
      )
    }

    let query = `SELECT * FROM session_events WHERE recording_id = $1`
    const params: unknown[] = [recordingId]
    let paramIndex = 2

    if (eventType) {
      query += ` AND event_type = $${paramIndex}`
      params.push(eventType)
      paramIndex++
    }

    query += ` ORDER BY timestamp ASC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await db.query(query, params)

    const countResult = await db.query(
      `SELECT COUNT(*) FROM session_events WHERE recording_id = $1`,
      [recordingId]
    )

    return NextResponse.json({
      events: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    })
  } catch (error) {
    console.error("Session events API error:", error)
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
    const { recording_id, session_id, events } = body

    if (!recording_id && !session_id) {
      return new NextResponse(
        JSON.stringify({ error: "Missing recording_id or session_id" }),
        { status: 400 }
      )
    }

    let actualRecordingId = recording_id

    if (!actualRecordingId && session_id) {
      const recResult = await db.query(
        `SELECT id FROM session_recordings
         WHERE project_id = $1 AND session_id = $2 AND status = 'recording'
         ORDER BY started_at DESC LIMIT 1`,
        [project.id, session_id]
      )

      if (recResult.rows.length === 0) {
        return new NextResponse(
          JSON.stringify({ error: "No active recording found for session" }),
          { status: 404 }
        )
      }

      actualRecordingId = recResult.rows[0].id
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Missing events array" }),
        { status: 400 }
      )
    }

    const insertedEvents: string[] = []

    for (const event of events) {
      const { event_type, timestamp, data } = event

      if (!event_type || timestamp === undefined) continue

      const result = await db.query(
        `INSERT INTO session_events (recording_id, event_type, timestamp, data)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [actualRecordingId, event_type, timestamp, JSON.stringify(data || {})]
      )

      insertedEvents.push(result.rows[0].id)
    }

    await db.query(
      `UPDATE session_recordings
       SET events_count = events_count + $1,
           metadata = metadata || $2
       WHERE id = $3`,
      [
        insertedEvents.length,
        JSON.stringify({ last_event_at: Date.now() }),
        actualRecordingId
      ]
    )

    return NextResponse.json({
      success: true,
      recording_id: actualRecordingId,
      events_inserted: insertedEvents.length,
      event_ids: insertedEvents
    })
  } catch (error) {
    console.error("Session events POST error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}
