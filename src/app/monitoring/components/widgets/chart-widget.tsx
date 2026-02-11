"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { 
  ResponsiveContainer, 
  AreaChart, Area, 
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip 
} from "recharts"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [localPeriod, setLocalPeriod] = useState<string>(period)
  const [localVariant, setLocalVariant] = useState<ChartVariant>(variant)
  const [isVisible, setIsVisible] = useState(true)
  const currentPeriod = localPeriod ?? period
  const cacheRef = useRef<{ [key: string]: { ts: number; data: any[] } }>({})

  const fetchData = useCallback(async () => {
    if (!projectId) return
    try {
      const key = `${projectId}_${metric}_${currentPeriod}`
      const cached = cacheRef.current[key]
      if (cached && Date.now() - cached.ts < 60000) {
        setData(cached.data)
        return
      }
      const res = await fetch(`/api/events?projectId=${projectId}&metric=${metric}&period=${currentPeriod}`)
      if (!res.ok) throw new Error("Error fetching data")
      const events = await res.json()

      const formattedData = events.map((e: any) => ({
        time: format(new Date(e.time), currentPeriod === '1h' || currentPeriod === '24h' ? "HH:mm" : "dd.MM HH:mm"),
        value: Number(e.value)
      }))
      setData(formattedData)
      cacheRef.current[key] = { ts: Date.now(), data: formattedData }
    } catch (error) {
      console.error("Error fetching chart data", error)
    } finally {
      setLoading(false)
    }
  }, [projectId, metric, currentPeriod])

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

  // Refetch when user changes period/variant in UI
  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [localPeriod, localVariant])

  // Visibility observer for pausing auto-refresh when not visible
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      setIsVisible(entries[0]?.isIntersecting ?? true)
    }, { root: null, rootMargin: '0px', threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Compute percent change for quick insight
  let percentChangeLabel: string | null = null
  if (data.length >= 2) {
    const last = Number((data[data.length - 1] as any).value)
    const prev = Number((data[data.length - 2] as any).value)
    if (!Number.isNaN(last) && !Number.isNaN(prev) && prev !== 0) {
      const pct = ((last - prev) / Math.abs(prev)) * 100
      percentChangeLabel = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
    }
  }

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
    <div ref={containerRef} className="h-full w-full" role="region" aria-label="График метрик">
      {percentChangeLabel && (
        <div aria-label="Изменение метрики" className="text-xs text-muted-foreground px-2 pb-2">
          Изменение: {percentChangeLabel}
        </div>
      )}
      <div className="flex items-center gap-2 p-2 border-b border-border mb-2">
        <span className="text-xs text-muted-foreground">Период</span>
        <Select value={localPeriod} onValueChange={(val: any) => setLocalPeriod(val)}>
          <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[
              { id: '1h', label: '1 час' },
              { id: '24h', label: '24 часа' },
              { id: '7d', label: '7 дней' },
              { id: '30d', label: '30 дней' },
            ].map(p => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-2">Тип</span>
        <Select value={localVariant} onValueChange={(val: any) => setLocalVariant(val)}>
          <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[
              { id: 'area', label: 'Area' },
              { id: 'line', label: 'Line' },
              { id: 'bar', label: 'Bar' },
            ].map(v => (
              <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => {
          // Simple CSV export for the current data
          if (data && data.length > 0) {
            const header = 'time,value\n'
            const rows = data.map(d => `${d['time']},${d['value']}`)
            const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `chart_${projectId ?? 'dashboard'}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }
        }}>
          CSV
        </Button>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
