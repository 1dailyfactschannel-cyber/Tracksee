"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

interface StatWidgetProps {
  projectId?: string
  metric?: string
}

export function StatWidget({ projectId, metric = "latency" }: StatWidgetProps) {
  const [value, setValue] = useState<number | string>("-")
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId, metric])

  const fetchData = async () => {
    try {
      const { data: events, error } = await supabase
        .from("events")
        .select("duration, status_code")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error) throw error

      if (metric === "latency") {
        setValue(`${events.duration} ms`)
      } else if (metric === "status") {
        setValue(events.status_code)
      }
    } catch (error) {
        // console.error(error)
        setValue("N/A")
    } finally {
      setLoading(false)
    }
  }

  if (!projectId) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Проект?</div>
  
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-3xl font-bold tracking-tight">
        {value}
      </div>
    </div>
  )
}
