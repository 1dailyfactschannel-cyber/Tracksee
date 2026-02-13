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

    const heatmapId = url.searchParams.get("heatmap_id")
    const pageUrl = url.searchParams.get("page_url")
    const limit = parseInt(url.searchParams.get("limit") || "1000")
    const offset = parseInt(url.searchParams.get("offset") || "0")

    if (heatmapId) {
      const clicksResult = await db.query(
        `SELECT x, y, element_selector, element_text, COUNT(*) as count,
         DATE_TRUNC('hour', created_at) as time_bucket
         FROM heatmap_clicks
         WHERE heatmap_id = $1
         GROUP BY x, y, element_selector, element_text, time_bucket
         ORDER BY count DESC
         LIMIT $2 OFFSET $3`,
        [heatmapId, limit, offset]
      )

      const scrollsResult = await db.query(
        `SELECT depth_percentage, viewport_height, COUNT(*) as views
         FROM heatmap_scrolls
         WHERE heatmap_id = $1
         GROUP BY depth_percentage, viewport_height
         ORDER BY depth_percentage ASC`,
        [heatmapId]
      )

      return NextResponse.json({
        clicks: clicksResult.rows,
        scrolls: scrollsResult.rows
      })
    } else if (pageUrl) {
      const heatmapsResult = await db.query(
        `SELECT h.*,
         (SELECT COUNT(*) FROM heatmap_clicks c WHERE c.heatmap_id = h.id) as total_clicks,
         (SELECT COUNT(*) FROM heatmap_scrolls s WHERE s.heatmap_id = h.id) as total_scrolls
         FROM heatmaps h
         WHERE h.project_id = $1 AND (h.page_url = $2 OR h.url_pattern = $2)
         ORDER BY h.created_at DESC`,
        [project.id, pageUrl]
      )

      return NextResponse.json({
        heatmaps: heatmapsResult.rows
      })
    } else {
      const heatmapsResult = await db.query(
        `SELECT h.*,
         (SELECT COUNT(*) FROM heatmap_clicks c WHERE c.heatmap_id = h.id) as total_clicks,
         (SELECT COUNT(*) FROM heatmap_scrolls s WHERE s.heatmap_id = h.id) as total_scrolls,
         (SELECT COUNT(DISTINCT session_id) FROM heatmap_sessions ss WHERE ss.project_id = h.project_id) as total_sessions
         FROM heatmaps h
         WHERE h.project_id = $1
         ORDER BY h.created_at DESC
         LIMIT $2 OFFSET $3`,
        [project.id, limit, offset]
      )

      return NextResponse.json({
        heatmaps: heatmapsResult.rows
      })
    }
  } catch (error) {
    console.error("Heatmap API error:", error)
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
    const { name, url_pattern, page_url, device_type } = body

    if (!name || !page_url) {
      return new NextResponse(
        JSON.stringify({ error: "Missing required fields: name, page_url" }),
        { status: 400 }
      )
    }

    const result = await db.query(
      `INSERT INTO heatmaps (project_id, name, url_pattern, page_url, device_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [project.id, name, url_pattern || page_url, page_url, device_type || 'desktop']
    )

    return NextResponse.json({
      success: true,
      heatmap: result.rows[0]
    })
  } catch (error) {
    console.error("Heatmap create error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}
