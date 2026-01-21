import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Note: In a real production app, we should use the Service Role Key 
// to verify the API key securely and bypass RLS for insertion.
// Since we don't have the Service Role Key in the environment variables yet,
// we will rely on a slightly less secure method or assume the user adds the key later.
// For now, I will use the ANON key but this might fail if RLS is strict.

// Ideally: const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const apiKey = request.headers.get("x-api-key") || url.searchParams.get("key") || url.searchParams.get("apiKey")

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API Key. Provide it via 'x-api-key' header or '?key=' query parameter." },
        { status: 401 }
      )
    }

    let body: any = {}
    try {
        body = await request.json()
    } catch (e) {
        // Body might be empty or not JSON
        body = {}
    }

    // Default values if specific fields are missing
    const type = body.type || "webhook"
    const name = body.name || "event"
    const status_code = body.status_code || 200
    const duration = body.duration || 0
    const path = body.path || "/"
    const message = body.message || JSON.stringify(body).slice(0, 500) // Preview of body as message
    
    // If metadata is not provided, use the whole body as metadata
    const metadata = body.metadata || body

    // 1. Verify API Key and get Project ID
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
        return NextResponse.json(
            { error: "Server misconfiguration: Missing Service Key" },
            { status: 500 }
        )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("api_key", apiKey)
      .single()

    if (projectError || !project) {
       return NextResponse.json(
        { error: "Invalid API Key" },
        { status: 401 }
      )
    }

    // 2. Insert Event
    const { error: insertError } = await supabase.from("events").insert({
      project_id: project.id,
      type: type || "unknown",
      name: name || "unknown",
      status_code,
      duration,
      path,
      message,
      metadata
    })

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  })
}
