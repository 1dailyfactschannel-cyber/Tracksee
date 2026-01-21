import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { url, externalApiKey } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const start = Date.now()
    const headers: HeadersInit = {}
    
    // If we have an external API key, use it. 
    // We assume it's a Bearer token or specific header. 
    // Since we don't know the format, we'll try standard ones or just Bearer.
    if (externalApiKey) {
        headers["Authorization"] = `Bearer ${externalApiKey}`
        headers["x-api-key"] = externalApiKey
    }

    const response = await fetch(url, { 
        method: "HEAD", 
        headers 
    }) 
    const duration = Date.now() - start

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      duration,
      statusText: response.statusText
    })
  } catch (error) {
    return NextResponse.json({ 
        ok: false, 
        status: 0, 
        statusText: "Connection Failed",
        error: String(error) 
    }, { status: 500 })
  }
}
