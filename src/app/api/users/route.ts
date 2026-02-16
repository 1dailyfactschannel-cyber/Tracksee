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

    const profileId = url.searchParams.get("id")
    const userId = url.searchParams.get("user_id")
    const anonymousId = url.searchParams.get("anonymous_id")
    const search = url.searchParams.get("search")
    const limit = parseInt(url.searchParams.get("limit") || "50")
    const offset = parseInt(url.searchParams.get("offset") || "0")
    const sortBy = url.searchParams.get("sort_by") || "last_seen"
    const sortOrder = url.searchParams.get("sort_order") || "DESC"

    if (profileId) {
      const profileResult = await db.query(
        `SELECT up.*,
          (SELECT json_agg(json_build_object(
            'id', s.id,
            'session_id', s.session_id,
            'started_at', s.started_at,
            'ended_at', s.ended_at,
            'duration', s.duration,
            'page_views', s.page_views,
            'events_count', s.events_count,
            'landing_page', s.landing_page,
            'exit_page', s.exit_page
          )) FROM user_sessions s WHERE s.profile_id = up.id ORDER BY s.started_at DESC LIMIT 10) as recent_sessions,
          (SELECT COUNT(*) FROM user_sessions s WHERE s.profile_id = up.id) as total_sessions,
          (SELECT COUNT(*) FROM user_events e WHERE e.profile_id = up.id) as total_events
         FROM user_profiles up
         WHERE up.id = $1 AND up.project_id = $2`,
        [profileId, project.id]
      )

      if (profileResult.rows.length === 0) {
        return new NextResponse(
          JSON.stringify({ error: "Profile not found" }),
          { status: 404 }
        )
      }

      const profile = profileResult.rows[0]

      const eventsResult = await db.query(
        `SELECT event_name, event_type, COUNT(*) as count
         FROM user_events
         WHERE profile_id = $1
         GROUP BY event_name, event_type
         ORDER BY count DESC
         LIMIT 20`,
        [profileId]
      )

      return NextResponse.json({
        profile: {
          ...profile,
          recent_sessions: profile.recent_sessions || [],
          event_breakdown: eventsResult.rows
        }
      })
    }

    if (userId) {
      const profileResult = await db.query(
        `SELECT up.*,
          (SELECT COUNT(*) FROM user_sessions s WHERE s.profile_id = up.id) as total_sessions,
          (SELECT COUNT(*) FROM user_events e WHERE e.profile_id = up.id) as total_events
         FROM user_profiles up
         WHERE up.project_id = $1 AND up.user_id = $2`,
        [project.id, userId]
      )

      return NextResponse.json({
        profiles: profileResult.rows
      })
    }

    if (anonymousId) {
      const profileResult = await db.query(
        `SELECT up.*,
          (SELECT COUNT(*) FROM user_sessions s WHERE s.profile_id = up.id) as total_sessions,
          (SELECT COUNT(*) FROM user_events e WHERE e.profile_id = up.id) as total_events
         FROM user_profiles up
         WHERE up.project_id = $1 AND up.anonymous_id = $2`,
        [project.id, anonymousId]
      )

      return NextResponse.json({
        profiles: profileResult.rows
      })
    }

    let query = `
      SELECT up.*,
        (SELECT COUNT(*) FROM user_sessions s WHERE s.profile_id = up.id) as total_sessions,
        (SELECT COUNT(*) FROM user_events e WHERE e.profile_id = up.id) as total_events
      FROM user_profiles up
      WHERE up.project_id = $1
    `
    const params: unknown[] = [project.id]
    let paramIndex = 2

    if (search) {
      query += ` AND (
        up.name ILIKE $${paramIndex} OR
        up.email ILIKE $${paramIndex} OR
        up.user_id ILIKE $${paramIndex} OR
        up.anonymous_id ILIKE $${paramIndex}
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    const validSortFields = ["last_seen", "first_seen", "session_count", "event_count", "total_duration", "created_at"]
    const sortField = validSortFields.includes(sortBy) ? sortBy : "last_seen"
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"

    query += ` ORDER BY up.${sortField} ${order}`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const profilesResult = await db.query(query, params)

    const countQuery = `SELECT COUNT(*) FROM user_profiles WHERE project_id = $1`
    const countResult = await db.query(countQuery, [project.id])

    return NextResponse.json({
      profiles: profilesResult.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    })
  } catch (error) {
    console.error("Users API error:", error)
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
      anonymous_id,
      user_id,
      email,
      name,
      avatar_url,
      custom_data,
      country,
      region,
      city,
      device_type,
      browser,
      os,
      session_id,
      event_name,
      event_type,
      path,
      referrer,
      duration,
      metadata
    } = body

    if (anonymous_id || user_id) {
      let profileResult = await db.query(
        `SELECT id FROM user_profiles
         WHERE project_id = $1 AND (anonymous_id = $2 OR user_id = $2)`,
        [project.id, anonymous_id || user_id]
      )

      let profileId: string

      if (profileResult.rows.length === 0) {
        const insertResult = await db.query(
          `INSERT INTO user_profiles
           (project_id, anonymous_id, user_id, email, name, custom_data, country, region, city, device_type, browser, os)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id`,
          [
            project.id,
            anonymous_id,
            user_id,
            email,
            name,
            JSON.stringify(custom_data || {}),
            country,
            region,
            city,
            device_type,
            browser,
            os
          ]
        )
        profileId = insertResult.rows[0].id
      } else {
        profileId = profileResult.rows[0].id

        const updates: string[] = ["last_seen = CURRENT_TIMESTAMP"]
        const updateParams: unknown[] = []
        let paramIndex = 1

        if (email) {
          updates.push(`email = $${paramIndex}`)
          updateParams.push(email)
          paramIndex++
        }
        if (name) {
          updates.push(`name = $${paramIndex}`)
          updateParams.push(name)
          paramIndex++
        }
        if (country) {
          updates.push(`country = $${paramIndex}`)
          updateParams.push(country)
          paramIndex++
        }
        if (region) {
          updates.push(`region = $${paramIndex}`)
          updateParams.push(region)
          paramIndex++
        }
        if (city) {
          updates.push(`city = $${paramIndex}`)
          updateParams.push(city)
          paramIndex++
        }
        if (device_type) {
          updates.push(`device_type = $${paramIndex}`)
          updateParams.push(device_type)
          paramIndex++
        }
        if (browser) {
          updates.push(`browser = $${paramIndex}`)
          updateParams.push(browser)
          paramIndex++
        }
        if (os) {
          updates.push(`os = $${paramIndex}`)
          updateParams.push(os)
          paramIndex++
        }

        updateParams.push(profileId)

        await db.query(
          `UPDATE user_profiles SET ${updates.join(", ")} WHERE id = $${paramIndex + 1}`,
          updateParams
        )

        await db.query(
          `UPDATE user_profiles SET
           session_count = session_count + 1,
           event_count = event_count + 1,
           total_duration = total_duration + COALESCE($2, 0)
           WHERE id = $1`,
          [profileId, duration]
        )
      }

      if (session_id) {
        let sessionResult = await db.query(
          `SELECT id FROM user_sessions WHERE profile_id = $1 AND session_id = $2`,
          [profileId, session_id]
        )

        if (sessionResult.rows.length === 0) {
          await db.query(
            `INSERT INTO user_sessions
             (profile_id, session_id, country, region, city, device_type, browser, os, landing_page, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [profileId, session_id, country, region, city, device_type, browser, os, path, JSON.stringify(metadata || {})]
          )
        }
      }

      if (event_name) {
        await db.query(
          `INSERT INTO user_events
           (profile_id, session_id, event_name, event_type, path, referrer, duration, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [profileId, session_id, event_name, event_type, path, referrer, duration, JSON.stringify(metadata || {})]
        )
      }

      return NextResponse.json({
        success: true,
        profile_id: profileId
      })
    }

    return new NextResponse(
      JSON.stringify({ error: "Missing anonymous_id or user_id" }),
      { status: 400 }
    )
  } catch (error) {
    console.error("User profile error:", error)
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    )
  }
}
