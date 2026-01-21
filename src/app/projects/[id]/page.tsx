"use client"

import { use, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { DateRangePicker } from "@/components/date-range-picker"
import { addDays, subDays, format } from "date-fns"
import { DateRange } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogsTable } from "@/components/logs-table"
import { Activity, AlertTriangle, Clock, Globe, MousePointerClick, RefreshCw, Zap } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Line,
  LineChart,
} from "recharts"
import { toast } from "sonner"
import { ru } from "date-fns/locale"

interface ProjectDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Время
            </span>
            <span className="font-bold text-muted-foreground">
              {label}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Значение
            </span>
            <span className="font-bold">
              {payload[0].value}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { id } = use(params)
  
  const supabase = createClient()
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [checking, setChecking] = useState(false)

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single()
      
      if (error) throw error
      return data
    },
  })

  const checkStatus = async () => {
    if (!project?.url) return
    setChecking(true)
    try {
        const res = await fetch("/api/check-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                url: project.url,
                // @ts-ignore
                externalApiKey: project.external_api_key 
            })
        })
        const data = await res.json()
        if (data.ok) {
            toast.success(`Сайт доступен! Код: ${data.status}, Задержка: ${data.duration}ms`)
        } else {
            toast.error(`Ошибка доступности: ${data.status} ${data.statusText}`)
        }
    } catch (e) {
        toast.error("Не удалось проверить статус")
    } finally {
        setChecking(false)
    }
  }

  // Fetch metrics
  const { data: metrics } = useQuery({
    queryKey: ["metrics", id, date],
    queryFn: async () => {
      if (!date?.from || !date?.to) return null;

      const from = date.from.toISOString()
      const to = date.to.toISOString()

      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .eq("project_id", id)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false }) // Newest first for logs

      if (error) throw error

      // Process data for charts
      const requestsMap = new Map<string, number>()
      const errorsMap = new Map<string, number>()
      const latencyMap = new Map<string, number>()

      // Helper to format time based on range width
      // If range > 2 days, use Day, else use Hour
      const daysDiff = (date.to!.getTime() - date.from!.getTime()) / (1000 * 60 * 60 * 24)
      const dateFormat = daysDiff > 2 ? "dd MMM" : "HH:00"

      // Sort events for charts (oldest first)
      const sortedEvents = [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      sortedEvents.forEach(event => {
        const d = new Date(event.created_at)
        const timeKey = format(d, dateFormat, { locale: ru })

        // RPS / Activity
        requestsMap.set(timeKey, (requestsMap.get(timeKey) || 0) + 1)

        // Errors
        if (event.status_code && event.status_code >= 400) {
            const code = `${event.status_code}`
            errorsMap.set(code, (errorsMap.get(code) || 0) + 1)
        }

        // Latency (Avg per bucket)
        if (event.duration) {
             const current = latencyMap.get(timeKey)
             if (current) {
                 // Simple moving average or just replace? Let's keep max for visibility of spikes
                 latencyMap.set(timeKey, Math.max(current, event.duration))
             } else {
                 latencyMap.set(timeKey, event.duration)
             }
        }
      })

      const requests = Array.from(requestsMap.entries()).map(([time, value]) => ({ time, value }))
      const errors = Array.from(errorsMap.entries()).map(([name, value]) => ({ name, value }))
      const latency = Array.from(latencyMap.entries()).map(([time, value]) => ({ time, value }))

      return {
        requests: requests.length > 0 ? requests : [{time: "Нет данных", value: 0}],
        errors: errors.length > 0 ? errors : [{name: "Нет ошибок", value: 0}],
        latency: latency.length > 0 ? latency : [{time: "Нет данных", value: 0}],
        totalRequests: events.length,
        totalErrors: events.filter(e => e.status_code && e.status_code >= 400).length,
        avgLatency: events.reduce((acc, curr) => acc + (curr.duration || 0), 0) / (events.length || 1),
        rawEvents: events // Return all events for the table
      }
    }
  })

  if (!project) return <div className="flex h-screen items-center justify-center">Загрузка...</div>

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <aside className="hidden w-[200px] flex-col md:flex bg-card shadow-xl z-30">
          <Sidebar />
        </aside>
        <main className="flex-1 space-y-4 p-8 pt-6 overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
                <div className="flex items-center mt-2 space-x-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <a href={project.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {project.url}
                    </a>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={checkStatus} disabled={checking}>
                        <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const res = await fetch("/api/ingest", {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json",
                            "x-api-key": project.api_key
                        },
                        body: JSON.stringify({
                            type: "test",
                            name: "manual_test",
                            status_code: 200,
                            duration: Math.floor(Math.random() * 200) + 50,
                            path: "/test-path",
                            message: "Test event triggered manually"
                        })
                    })
                    if (res.ok) {
                        toast.success("Тестовое событие отправлено!")
                        // Force refetch
                        if (date?.from && date?.to) {
                           setDate({ from: date.from, to: date.to })
                        }
                    } else {
                        const err = await res.json()
                        toast.error(`Ошибка: ${err.error}`)
                    }
                  } catch (e) {
                      toast.error("Ошибка сети")
                  }
              }}>
                Отправить тест
              </Button>
              <DateRangePicker date={date} setDate={setDate} />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего запросов</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalRequests || 0}</div>
                <p className="text-xs text-muted-foreground">за выбранный период</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ошибки</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{metrics?.totalErrors || 0}</div>
                <p className="text-xs text-muted-foreground">за выбранный период</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ср. задержка</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(metrics?.avgLatency || 0)}ms</div>
                <p className="text-xs text-muted-foreground">за выбранный период</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Статус</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">Active</div>
                <p className="text-xs text-muted-foreground">Мониторинг активен</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Трафик (RPS)</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics?.requests}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorRequests)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Ошибки по кодам</CardTitle>
              </CardHeader>
              <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics?.errors}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Row 2 */}
          <div className="grid gap-4 md:grid-cols-1">
             <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Задержка (Latency)
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={metrics?.latency}>
                    <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}ms`} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Logs Table */}
          <div className="grid gap-4 md:grid-cols-1">
              <LogsTable logs={metrics?.rawEvents || []} />
          </div>
          
          {/* Integration Info */}
          <Card>
              <CardHeader>
                  <CardTitle>Интеграция</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Используйте этот API ключ для отправки метрик:
                        </p>
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                            {project.api_key}
                        </code>
                        <div className="mt-4">
                            <p className="text-sm font-bold">Webhook URL:</p>
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold break-all">
                                https://tracksee.vercel.app/api/ingest?key={project.api_key}
                            </code>
                        </div>
                      </div>
                      <div>
                          <p className="text-sm font-bold">Пример cURL:</p>
                          <pre className="mt-2 w-full overflow-x-auto rounded bg-slate-950 p-4 text-xs text-slate-50">
{`curl -X POST "https://tracksee.vercel.app/api/ingest" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${project.api_key}" \\
  -d '{
    "type": "performance",
    "name": "page_view",
    "duration": 125,
    "status_code": 200
  }'`}
                          </pre>
                      </div>
                  </div>
              </CardContent>
          </Card>

        </main>
      </div>
    </div>
  )
}
