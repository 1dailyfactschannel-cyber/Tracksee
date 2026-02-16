import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkAlertConditions } from "@/lib/alerts/checker"

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

    const alertId = url.searchParams.get("id")
    const status = url.searchParams.get("status")
    const limit = parseInt(url.searchParams.get("limit") || "50")
    const offset = parseInt(url.searchParams.get("offset") || "0")

    if (alertId) {
      const alertResult = await db.query(
        `SELECT a.*,
          (SELECT COUNT(*) FROM alert_events ae WHERE ae.alert_id = a.id) as trigger_count_total,
          (SELECT COUNT(*) FROM alert_events ae WHERE ae.alert_id = a.id AND ae.status = 'open') as open_events_count
         FROM alerts a
         WHERE a.id = $1 AND a.project_id = $2`,
        [alertId, project.id]
      )

      if (alertResult.rows.length === 0) {
        return new NextResponse(
          JSON.stringify({ error: "Alert not found" }),
          { status: 404 }
        )
      }

      const eventsResult = await db.query(
        `SELECT ae.*, u.email as acknowledged_by_email
         FROM alert_events ae
         LEFT JOIN users u ON u.id = ae.acknowledged_by
         WHERE ae.alert_id = $1
         ORDER BY ae.created_at DESC
         LIMIT 20`,
        [alertId]
      )

      return NextResponse.json({
        alert: alertResult.rows[0],
        recent_events: eventsResult.rows
      })
    }

    let query = `
      SELECT a.*,
        (SELECT COUNT(*) FROM alert_events ae WHERE ae.alert_id = a.id) as trigger_count_total,
        (SELECT COUNT(*) FROM alert_events ae WHERE ae.alert_id = a.id AND ae.status = 'open') as open_events_count
      FROM alerts a
      WHERE a.project_id = $1
    `
    const params: unknown[] = [project.id]
    let paramIndex = 2

    if (status === "active") {
      query += ` AND a.is_active = true`
    } else if (status === "inactive") {
      query += ` AND a.is_active = false`
    }

    query += ` ORDER BY a.created_at DESC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const alertsResult = await db.query(query, params)

    const countResult = await db.query(
      `SELECT COUNT(*) FROM alerts WHERE project_id = $1`,
      [project.id]
    )

    return NextResponse.json({
      alerts: alertsResult.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    })
  } catch (error) {
    console.error("Alerts API error:", error)
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
      name,
      description,
      alert_type,
      condition,
      threshold,
      comparison_operator,
      time_window,
      severity,
      channels,
      webhook_url,
      telegram_chat_id,
      slack_webhook_url,
      email_recipients
    } = body

    if (!name || !alert_type) {
      return new NextResponse(
        JSON.stringify({ error: "Missing required fields: name, alert_type" }),
        { status: 400 }
      )
    }

    const result = await db.query(
      `INSERT INTO alerts (
        project_id, name, description, alert_type, condition, threshold,
        comparison_operator, time_window, severity, channels, webhook_url,
        telegram_chat_id, slack_webhook_url, email_recipients
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        project.id,
        name,
        description,
        alert_type,
        JSON.stringify(condition || {}),
        threshold,
        comparison_operator || "greater_than",
        time_window || 5,
        severity || "warning",
        JSON.stringify(channels || []),
        webhook_url,
        telegram_chat_id,
        slack_webhook_url,
        email_recipients || []
      ]
    )

    return NextResponse.json({
      success: true,
      alert: result.rows[0]
    })
  } catch (error) {
    console.error("Alert create error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url)
    const apiKey = request.headers.get("x-api-key") || url.searchParams.get("key")
    const alertId = url.searchParams.get("id")

    if (!apiKey || !alertId) {
      return new NextResponse(
        JSON.stringify({ error: "Missing API Key or Alert ID" }),
        { status: 400 }
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
    const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"]
    const params: unknown[] = []
    let paramIndex = 1

    const fields = [
      "name", "description", "alert_type", "condition", "threshold",
      "comparison_operator", "time_window", "severity", "channels",
      "webhook_url", "telegram_chat_id", "slack_webhook_url", "email_recipients", "is_active"
    ]

    fields.forEach((field) => {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`)
        params.push(field === "condition" || field === "channels" ? JSON.stringify(body[field]) : body[field])
        paramIndex++
      }
    })

    params.push(alertId, project.id)

    const result = await db.query(
      `UPDATE alerts SET ${updates.join(", ")} WHERE id = $${paramIndex} AND project_id = $${paramIndex + 1} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Alert not found" }),
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      alert: result.rows[0]
    })
  } catch (error) {
    console.error("Alert update error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const apiKey = request.headers.get("x-api-key") || url.searchParams.get("key")
    const alertId = url.searchParams.get("id")

    if (!apiKey || !alertId) {
      return new NextResponse(
        JSON.stringify({ error: "Missing API Key or Alert ID" }),
        { status: 400 }
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

    await db.query(
      "DELETE FROM alerts WHERE id = $1 AND project_id = $2",
      [alertId, project.id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Alert delete error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}
