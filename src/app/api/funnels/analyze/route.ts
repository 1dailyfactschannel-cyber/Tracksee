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

    const funnelId = url.searchParams.get("funnel_id")
    const dateFrom = url.searchParams.get("date_from")
    const dateTo = url.searchParams.get("date_to")
    const userId = url.searchParams.get("user_id")

    if (!funnelId) {
      return new NextResponse(
        JSON.stringify({ error: "Missing funnel_id" }),
        { status: 400 }
      )
    }

    const funnelResult = await db.query(
      `SELECT f.*,
        (SELECT json_agg(json_build_object('step_number', fs.step_number, 'event_name', fs.event_name, 'event_type', fs.event_type, 'conditions', fs.conditions))
         FROM funnel_steps fs WHERE fs.funnel_id = f.id ORDER BY fs.step_number) as steps
       FROM funnels f WHERE f.id = $1 AND f.project_id = $2`,
      [funnelId, project.id]
    )

    if (funnelResult.rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Funnel not found" }),
        { status: 404 }
      )
    }

    const funnel = funnelResult.rows[0]
    const steps = funnel.steps || []
    const eventNames = steps.map((s: Record<string, unknown>) => s.event_name)

    const startDate = dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const endDate = dateTo || new Date().toISOString().split("T")[0]

    let eventsQuery = `
      SELECT e.*,
        DATE_TRUNC('day', e.created_at)::DATE as event_date
      FROM events e
      WHERE e.project_id = $1
        AND e.created_at >= $2::DATE
        AND e.created_at < ($3::DATE + INTERVAL '1 day')
        AND e.name = ANY($4::text[])
    `
    const eventsParams: unknown[] = [project.id, startDate, endDate, eventNames]

    if (userId) {
      eventsQuery += ` AND e.metadata->>'user_id' = $5`
      eventsParams.push(userId)
    }

    eventsQuery += ` ORDER BY e.created_at ASC`

    const eventsResult = await db.query(eventsQuery, eventsParams)
    const events = eventsResult.rows

    const stepResults = steps.map((step: Record<string, unknown>, index: number) => {
      const stepEvents = events.filter((e: Record<string, unknown>) => e.name === step.event_name)
      const uniqueUsers = new Set(stepEvents.map((e: Record<string, unknown>) => (e.metadata as Record<string, unknown>)?.user_id || e.session_id))
      const uniqueSessions = new Set(stepEvents.map((e: Record<string, unknown>) => e.session_id))

      return {
        step_number: index + 1,
        event_name: step.event_name,
        users_count: uniqueUsers.size,
        sessions_count: uniqueSessions.size,
        events_count: stepEvents.length,
        drop_off_rate: null
      }
    })

    stepResults.forEach((step: any, index: number) => {
      if (index > 0 && stepResults[index - 1]?.users_count > 0) {
        const prevUsers = stepResults[index - 1]?.users_count || 0
        const currUsers = step.users_count || 0
        step.drop_off_rate = prevUsers > 0
          ? ((prevUsers - currUsers) / prevUsers * 100).toFixed(2)
          : "0"
        step.conversion_rate = prevUsers > 0
          ? (currUsers / prevUsers * 100).toFixed(2)
          : "0"
      } else {
        step.conversion_rate = "100"
      }
    })

    const totalUsers = stepResults[0]?.users_count || 0
    const completedUsers = calculateCompletedFunnels(events, steps, userId)

    const timelineQuery = `
      SELECT
        DATE_TRUNC('day', created_at)::DATE as date_date,
        name,
        COUNT(DISTINCT (metadata->>'user_id') OR session_id) as users_count
      FROM events
      WHERE project_id = $1
        AND created_at >= $2::DATE
        AND created_at < ($3::DATE + INTERVAL '1 day')
        AND name = ANY($4::text[])
      GROUP BY DATE_TRUNC('day', created_at)::DATE, name
      ORDER BY date_date ASC
    `
    const timelineResult = await db.query(timelineQuery, [project.id, startDate, endDate, eventNames])

    const timelineByDate = new Map()
    timelineResult.rows.forEach((row: Record<string, unknown>) => {
      const date = row.date_date as string
      if (!timelineByDate.has(date)) {
        timelineByDate.set(date, {})
      }
      const dateData = timelineByDate.get(date)
      dateData[row.name as string] = row.users_count
    })

    const timeline = Array.from(timelineByDate.entries()).map(([date, data]) => ({
      date,
      ...data as Record<string, unknown>
    }))

    await db.query(
      `INSERT INTO funnel_results (funnel_id, date_date, step_results, total_users, completed_users, conversion_rate)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
       ON CONFLICT (funnel_id, date_date)
       DO UPDATE SET step_results = $2, total_users = $3, completed_users = $4, conversion_rate = $5`,
      [
        funnelId,
        JSON.stringify(stepResults),
        totalUsers,
        completedUsers,
        totalUsers > 0 ? (completedUsers / totalUsers * 100).toFixed(2) : "0"
      ]
    )

    return NextResponse.json({
      funnel: {
        id: funnel.id,
        name: funnel.name,
        steps: steps
      },
      analysis: {
        date_range: {
          from: startDate,
          to: endDate
        },
        total_users: totalUsers,
        completed_users: completedUsers,
        overall_conversion: totalUsers > 0 ? (completedUsers / totalUsers * 100).toFixed(2) : "0",
        step_results: stepResults,
        timeline
      }
    })
  } catch (error) {
    console.error("Funnel analysis error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}

function calculateCompletedFunnels(events: Record<string, unknown>[], steps: Record<string, unknown>[], userId?: string | null): number {
  if (!events.length || !steps.length) return 0

  const userSteps = new Map<string, number[]>()

  events.forEach((event: Record<string, unknown>) => {
    const userKey = ((event.metadata as Record<string, unknown>)?.user_id as string) || (event.session_id as string)
    if (!userKey) return

    if (!userSteps.has(userKey)) {
      userSteps.set(userKey, [])
    }

    const userEvents = userSteps.get(userKey) || []
    steps.forEach((step: Record<string, unknown>, index: number) => {
      if (event.name === step.event_name && !userEvents.includes(index)) {
        userEvents.push(index)
      }
    })
    userSteps.set(userKey, userEvents)
  })

  let completed = 0
  userSteps.forEach((stepIndices: number[]) => {
    if (stepIndices.length === steps.length && stepIndices.includes(0)) {
      completed++
    }
  })

  return completed
}
