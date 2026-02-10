"use client"

import { useEffect, useState, useCallback } from "react"
import { 
  ResponsiveContainer, 
  AreaChart, Area, 
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip 
} from "recharts"
import { format } from "date-fns"
import { MetricType, ChartVariant } from "../../types"

interface ChartWidgetProps {
  projectId?: string
  metric?: MetricType
  variant?: ChartVariant
  period?: string
  refreshInterval?: number
}

export function ChartWidget({ 
  projectId, 
  metric = "visitors", 
  variant = "area",
  period = "1h",
  refreshInterval = 30
}: ChartWidgetProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await fetch(`/api/events?projectId=${projectId}&metric=${metric}&period=${period}`)
      if (!res.ok) throw new Error("Error fetching data")
      const events = await res.json()

      const formattedData = events.map((e: any) => ({
        time: format(new Date(e.time), period === '1h' || period === '24h' ? "HH:mm" : "dd.MM HH:mm"),
        value: Number(e.value)
      }))

      setData(formattedData)
    } catch (error) {
      console.error("Error fetching chart data", error)
    } finally {
      setLoading(false)
    }
  }, [projectId, metric, period])

  useEffect(() => {
    if (projectId) {
      fetchData()
      const interval = setInterval(fetchData, refreshInterval * 1000)
      return () => clearInterval(interval)
    } else {
      const mockData = Array.from({ length: 20 }, (_, i) => ({
        time: `${10 + i}:00`,
        value: Math.floor(Math.random() * 500) + 100
      }))
      setData(mockData)
      setLoading(false)
    }
  }, [projectId, fetchData, refreshInterval])

  if (loading && data.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Загрузка...</div>
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 }
    }
    const color = "hsl(var(--primary))"

    switch (variant) {
      case 'line':
        return (
          <LineChart {...commonProps}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
             <XAxis dataKey="time" hide />
             <YAxis hide domain={['auto', 'auto']} />
             <Tooltip 
               contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
               itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
             />
             <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )
      case 'bar':
        return (
          <BarChart {...commonProps}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
             <XAxis dataKey="time" hide />
             <YAxis hide domain={['auto', 'auto']} />
             <Tooltip 
               contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
               itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
             />
             <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="time" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
               contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
               itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
            />
            <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        )
    }
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
