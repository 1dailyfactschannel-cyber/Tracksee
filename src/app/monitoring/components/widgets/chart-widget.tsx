"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { 
  ResponsiveContainer, 
  AreaChart, Area, 
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip 
} from "recharts"
import { format } from "date-fns"
import { WidgetType } from "../../types"

interface ChartWidgetProps {
  projectId?: string
  metric?: string
  title?: string
  type: WidgetType
}

export function ChartWidget({ projectId, metric = "latency", type }: ChartWidgetProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (projectId) {
      fetchData()
    } else {
      // Mock data for preview if no project selected
      const mockData = Array.from({ length: 20 }, (_, i) => ({
        time: `${10 + i}:00`,
        value: Math.floor(Math.random() * 500) + 100
      }))
      setData(mockData)
      setLoading(false)
    }
  }, [projectId, metric])

  const fetchData = async () => {
    try {
      // Fetch last 50 events
      const { data: events, error } = await supabase
        .from("events")
        .select("created_at, duration, status_code")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      const formattedData = events
        .reverse()
        .map(e => ({
          time: format(new Date(e.created_at), "HH:mm"),
          value: metric === "latency" ? e.duration : e.status_code
        }))

      setData(formattedData)
    } catch (error) {
      console.error("Error fetching chart data", error)
    } finally {
      setLoading(false)
    }
  }

  // if (loading) return <div className="flex h-full items-center justify-center text-muted-foreground">Загрузка...</div>

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 }
    }
    const color = "hsl(var(--primary))"

    switch (type) {
      case 'chart-line':
        return (
          <LineChart {...commonProps}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
             <XAxis dataKey="time" hide />
             <YAxis hide domain={['auto', 'auto']} />
             <Tooltip 
               contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
             />
             <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )
      case 'chart-bar':
        return (
          <BarChart {...commonProps}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
             <XAxis dataKey="time" hide />
             <YAxis hide domain={['auto', 'auto']} />
             <Tooltip 
               contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
             />
             <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )
      case 'chart-area':
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
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
            />
            <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        )
    }
  }

  return (
    <div className="h-full w-full p-2 flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
