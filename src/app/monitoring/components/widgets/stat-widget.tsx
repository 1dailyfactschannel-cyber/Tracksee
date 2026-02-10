"use client"

import { useEffect, useState, useCallback } from "react"
import { MetricType } from "../../types"

interface StatWidgetProps {
  projectId?: string
  metric?: MetricType
  period?: string
  refreshInterval?: number
}

export function StatWidget({ 
  projectId, 
  metric = "visitors",
  period = "1h",
  refreshInterval = 30
}: StatWidgetProps) {
  const [value, setValue] = useState<number | string>("-")
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/events?projectId=${projectId}&metric=${metric}&period=${period}`)
      if (!res.ok) throw new Error("Error fetching stat")
      const data = await res.json()
      
      if (!data || data.length === 0) {
        setValue(0)
        return
      }

      // For stats, we usually want the sum or average over the period, 
      // but for simplicity and real-time feel, let's show the total for the period 
      // or the last value depending on metric
      if (metric === 'avg_duration') {
        const avg = data.reduce((acc: number, curr: any) => acc + Number(curr.value), 0) / data.length
        setValue(`${avg.toFixed(0)} ms`)
      } else {
        const total = data.reduce((acc: number, curr: any) => acc + Number(curr.value), 0)
        setValue(total.toLocaleString())
      }

    } catch (error) {
        console.error("Error fetching stat data", error)
        setValue("N/A")
    } finally {
      setLoading(false)
    }
  }, [projectId, metric, period])

  useEffect(() => {
    if (projectId) {
      fetchData()
      const interval = setInterval(fetchData, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [projectId, fetchData, refreshInterval])

  if (loading && value === "-") {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Загрузка...</div>
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
