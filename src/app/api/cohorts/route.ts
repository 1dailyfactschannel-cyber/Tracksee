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

    const cohortId = url.searchParams.get("id")
    const limit = parseInt(url.searchParams.get("limit") || "50")
    const offset = parseInt(url.searchParams.get("offset") || "0")

    if (cohortId) {
      const cohortResult = await db.query(
        `SELECT c.*,
          (SELECT COUNT(*) FROM cohort_members cm WHERE cm.cohort_id = c.id) as member_count,
          (SELECT COUNT(*) FROM cohort_retention_data crd WHERE crd.cohort_id = c.id) as periods_count
         FROM cohorts c
         WHERE c.id = $1 AND c.project_id = $2`,
        [cohortId, project.id]
      )

      if (cohortResult.rows.length === 0) {
        return new NextResponse(
          JSON.stringify({ error: "Cohort not found" }),
          { status: 404 }
        )
      }

      const cohort = cohortResult.rows[0]

      const retentionResult = await db.query(
        `SELECT *
         FROM cohort_retention_data
         WHERE cohort_id = $1
         ORDER BY period_start ASC`,
        [cohortId]
      )

      const memberResult = await db.query(
        `SELECT cm.*,
          (SELECT COUNT(DISTINCT DATE_TRUNC('day', e.created_at))
           FROM user_events e
           JOIN user_profiles up ON up.id = e.profile_id
           WHERE (up.user_id = cm.user_id OR up.anonymous_id = cm.anonymous_id)
           AND e.created_at >= cm.joined_at
           AND e.created_at < cm.joined_at + INTERVAL '30 days') as active_days_30
         FROM cohort_members cm
         WHERE cm.cohort_id = $1
         LIMIT 100`,
        [cohortId]
      )

      return NextResponse.json({
        cohort: {
          ...cohort,
          member_count: cohort.member_count,
          periods_count: cohort.periods_count
        },
        retention_data: retentionResult.rows,
        sample_members: memberResult.rows
      })
    }

    const cohortsResult = await db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM cohort_members cm WHERE cm.cohort_id = c.id) as member_count,
        (SELECT MAX(period_number) FROM cohort_retention_data crd WHERE crd.cohort_id = c.id) as max_period
       FROM cohorts c
       WHERE c.project_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [project.id, limit, offset]
    )

    return NextResponse.json({
      cohorts: cohortsResult.rows,
      limit,
      offset
    })
  } catch (error) {
    console.error("Cohorts API error:", error)
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
    const { name, description, cohort_type, time_interval, criteria, event_name } = body

    if (!name) {
      return new NextResponse(
        JSON.stringify({ error: "Missing name" }),
        { status: 400 }
      )
    }

    const cohortResult = await db.query(
      `INSERT INTO cohorts (project_id, name, description, cohort_type, time_interval, criteria)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        project.id,
        name,
        description,
        cohort_type || "signup",
        time_interval || "week",
        JSON.stringify(criteria || {})
      ]
    )

    const cohort = cohortResult.rows[0]

    if (event_name) {
      const usersResult = await db.query(
        `SELECT DISTINCT
           (metadata->>'user_id') as user_id,
           up.anonymous_id,
           MIN(created_at) as first_seen
         FROM events e
         LEFT JOIN user_profiles up ON up.project_id = e.project_id AND (up.user_id = (metadata->>'user_id') OR up.anonymous_id = (metadata->>'user_id'))
         WHERE e.project_id = $1 AND e.name = $2
         GROUP BY (metadata->>'user_id'), up.anonymous_id`,
        [project.id, event_name]
      )

      for (const row of usersResult.rows) {
        if (row.user_id || row.anonymous_id) {
          await db.query(
            `INSERT INTO cohort_members (cohort_id, user_id, anonymous_id, joined_at)
             VALUES ($1, $2, $3, $4)`,
            [cohort.id, row.user_id, row.anonymous_id, row.first_seen]
          )
        }
      }

      await calculateRetention(project.id, cohort.id, event_name)
    }

    return NextResponse.json({
      success: true,
      cohort
    })
  } catch (error) {
    console.error("Cohort create error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}

async function calculateRetention(projectId: string, cohortId: string, eventName: string) {
  const intervals = ["day", "week", "month"]
  const maxPeriods = 12

  for (const interval of intervals) {
    const periodSql = interval === "day" ? "1 day" : interval === "week" ? "7 days" : "30 days"

    const cohortMembersResult = await db.query(
      `SELECT user_id, anonymous_id, joined_at
       FROM cohort_members
       WHERE cohort_id = $1`,
      [cohortId]
    )

    const members = cohortMembersResult.rows

    for (let period = 0; period < maxPeriods; period++) {
      const periodStart = new Date()
      periodStart.setDate(periodStart.getDate() - (period + 1) * (interval === "day" ? 1 : interval === "week" ? 7 : 30))
      const periodEnd = new Date(periodStart)
      periodEnd.setDate(periodEnd.getDate() + (interval === "day" ? 1 : interval === "week" ? 7 : 30))

      const periodMembers = members.filter((m: Record<string, unknown>) => {
        const joinedAt = new Date(m.joined_at as string)
        return joinedAt <= periodEnd
      })

      let retainedCount = 0

      for (const member of periodMembers) {
        const eventResult = await db.query(
          `SELECT COUNT(*) as count
           FROM events e
           LEFT JOIN user_profiles up ON up.project_id = e.project_id
           WHERE e.project_id = $1
             AND e.name = $2
             AND (up.user_id = $3 OR up.anonymous_id = $4)
             AND e.created_at >= $5
             AND e.created_at < $6`,
          [
            projectId,
            eventName,
            member.user_id,
            member.anonymous_id,
            periodStart.toISOString(),
            periodEnd.toISOString()
          ]
        )

        if (parseInt(eventResult.rows[0].count) > 0) {
          retainedCount++
        }
      }

      const totalUsers = periodMembers.length
      const retentionRate = totalUsers > 0 ? (retainedCount / totalUsers * 100).toFixed(2) : "0"

      await db.query(
        `INSERT INTO cohort_retention_data
         (cohort_id, period_start, period_number, total_users, retained_users, retention_rate)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (cohort_id, period_start)
         DO UPDATE SET retained_users = $5, retention_rate = $6`,
        [cohortId, periodStart.toISOString().split("T")[0], period, totalUsers, retainedCount, retentionRate]
      )
    }
  }
}
