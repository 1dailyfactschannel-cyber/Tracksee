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

    const funnelId = url.searchParams.get("id")
    const limit = parseInt(url.searchParams.get("limit") || "50")
    const offset = parseInt(url.searchParams.get("offset") || "0")

    if (funnelId) {
      const funnelResult = await db.query(
        `SELECT f.*, fs.step_number, fs.event_name, fs.event_type, fs.conditions
         FROM funnels f
         LEFT JOIN funnel_steps fs ON fs.funnel_id = f.id
         WHERE f.id = $1 AND f.project_id = $2
         ORDER BY fs.step_number ASC`,
        [funnelId, project.id]
      )

      if (funnelResult.rows.length === 0) {
        return new NextResponse(
          JSON.stringify({ error: "Funnel not found" }),
          { status: 404 }
        )
      }

      const funnel = {
        id: funnelResult.rows[0].id,
        project_id: funnelResult.rows[0].project_id,
        name: funnelResult.rows[0].name,
        description: funnelResult.rows[0].description,
        event_names: funnelResult.rows[0].event_names,
        filters: funnelResult.rows[0].filters,
        steps: funnelResult.rows
          .filter(r => r.step_number !== null)
          .map(r => ({
            step_number: r.step_number,
            event_name: r.event_name,
            event_type: r.event_type,
            conditions: r.conditions
          })),
        created_at: funnelResult.rows[0].created_at,
        updated_at: funnelResult.rows[0].updated_at
      }

      const resultsResult = await db.query(
        `SELECT *
         FROM funnel_results
         WHERE funnel_id = $1
         ORDER BY date_date DESC
         LIMIT 30`,
        [funnelId]
      )

      return NextResponse.json({
        funnel,
        results: resultsResult.rows
      })
    }

    const funnelsResult = await db.query(
      `SELECT f.*,
        (SELECT COUNT(*) FROM funnel_steps WHERE funnel_id = f.id) as steps_count,
        (SELECT COUNT(*) FROM funnel_results WHERE funnel_id = f.id) as results_count
       FROM funnels f
       WHERE f.project_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [project.id, limit, offset]
    )

    return NextResponse.json({
      funnels: funnelsResult.rows,
      limit,
      offset
    })
  } catch (error) {
    console.error("Funnels API error:", error)
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
    const { name, description, event_names, steps, filters, created_by } = body

    if (!name || !event_names || !Array.isArray(event_names) || event_names.length < 2) {
      return new NextResponse(
        JSON.stringify({ error: "Funnel must have at least 2 steps (event_names)" }),
        { status: 400 }
      )
    }

    const funnelResult = await db.query(
      `INSERT INTO funnels (project_id, name, description, event_names, filters, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        project.id,
        name,
        description,
        JSON.stringify(event_names),
        JSON.stringify(filters || {}),
        created_by
      ]
    )

    const funnelId = funnelResult.rows[0].id

    if (steps && Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        await db.query(
          `INSERT INTO funnel_steps (funnel_id, step_number, event_name, event_type, conditions)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            funnelId,
            i + 1,
            steps[i].event_name || event_names[i],
            steps[i].event_type,
            JSON.stringify(steps[i].conditions || {})
          ]
        )
      }
    } else {
      for (let i = 0; i < event_names.length; i++) {
        await db.query(
          `INSERT INTO funnel_steps (funnel_id, step_number, event_name)
           VALUES ($1, $2, $3)`,
          [funnelId, i + 1, event_names[i]]
        )
      }
    }

    const funnel = await db.query(
      `SELECT f.*,
        (SELECT json_agg(json_build_object('step_number', fs.step_number, 'event_name', fs.event_name, 'event_type', fs.event_type, 'conditions', fs.conditions))
         FROM funnel_steps fs WHERE fs.funnel_id = f.id ORDER BY fs.step_number) as steps
       FROM funnels f WHERE f.id = $1`,
      [funnelId]
    )

    return NextResponse.json({
      success: true,
      funnel: funnel.rows[0]
    })
  } catch (error) {
    console.error("Funnel create error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}
