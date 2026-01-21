"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface ChartWidgetProps {
  projectId?: string
  metric?: string
  title?: string
}

export function ChartWidget({ projectId, metric = "latency", title }: ChartWidgetProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (projectId) {
      fetchData()
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

  if (!projectId) return <div className="flex h-full items-center justify-center text-muted-foreground">Выберите проект</div>
  if (loading) return <div className="flex h-full items-center justify-center text-muted-foreground">Загрузка...</div>

  return (
    <div className="h-full w-full p-2 flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
            itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
          />
          <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
