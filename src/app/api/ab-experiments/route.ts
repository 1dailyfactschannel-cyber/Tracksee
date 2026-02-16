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

    const experimentId = url.searchParams.get("id")
    const status = url.searchParams.get("status")

    if (experimentId) {
      const expResult = await db.query(
        `SELECT e.*,
          (SELECT json_agg(json_build_object(
            'id', v.id, 'name', v.name, 'key', v.key, 'traffic_percentage', v.traffic_percentage,
            'is_control', v.is_control, 'config', v.config
          )) FROM ab_variants v WHERE v.experiment_id = e.id) as variants
         FROM ab_experiments e
         WHERE e.id = $1 AND e.project_id = $2`,
        [experimentId, project.id]
      )

      if (expResult.rows.length === 0) {
        return new NextResponse(
          JSON.stringify({ error: "Experiment not found" }),
          { status: 404 }
        )
      }

      const results = await db.query(
        `SELECT variant_id, SUM(visitors) as total_visitors, SUM(conversions) as total_conversions
         FROM ab_experiment_results
         WHERE experiment_id = $1
         GROUP BY variant_id`,
        [experimentId]
      )

      return NextResponse.json({
        experiment: expResult.rows[0],
        results: results.rows
      })
    }

    let query = `
      SELECT e.*,
        (SELECT COUNT(*) FROM ab_variants v WHERE v.experiment_id = e.id) as variants_count
      FROM ab_experiments e
      WHERE e.project_id = $1
    `
    const params: unknown[] = [project.id]

    if (status) {
      query += ` AND e.status = $2`
      params.push(status)
    }

    query += ` ORDER BY e.created_at DESC`

    const experiments = await db.query(query, params)
    return NextResponse.json({ experiments: experiments.rows })
  } catch (error) {
    console.error("A/B Experiments API error:", error)
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
      hypothesis,
      variants,
      primary_goal,
      traffic_allocation
    } = body

    const expResult = await db.query(
      `INSERT INTO ab_experiments (project_id, name, description, hypothesis, primary_goal, traffic_allocation)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [project.id, name, description, hypothesis, primary_goal, traffic_allocation || 100]
    )

    const experimentId = expResult.rows[0].id

    if (variants && Array.isArray(variants)) {
      for (const variant of variants) {
        await db.query(
          `INSERT INTO ab_variants (experiment_id, name, key, traffic_percentage, is_control, config)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            experimentId,
            variant.name,
            variant.key,
            variant.traffic_percentage || 50,
            variant.is_control || false,
            JSON.stringify(variant.config || {})
          ]
        )
      }
    }

    return NextResponse.json({
      success: true,
      experiment: expResult.rows[0]
    })
  } catch (error) {
    console.error("A/B Experiment create error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}
