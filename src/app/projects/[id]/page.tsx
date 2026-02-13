"use client"

import { use, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { DateRangePicker } from "@/components/date-range-picker"
import { subDays, format } from "date-fns"
import { DateRange } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogsTable } from "@/components/logs-table"
import { Activity, AlertTriangle, Clock, Globe, MousePointerClick, RefreshCw, Zap, Users, Timer, Database, Server, Wifi, FileCode, LogIn } from "lucide-react"
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

interface ProjectEvent {
  id: string
  created_at: string
  type: string
  name: string
  status_code: number
  duration: number
  path: string
  message: string
  metadata: Record<string, unknown> | null
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number | string }[]; label?: string }) => {
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
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [checking, setChecking] = useState(false)

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects?id=${id}`)
      if (!res.ok) throw new Error("Failed to fetch project")
      return res.json()
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
                externalApiKey: project.external_api_key 
            })
        })
        const data = await res.json()
        if (data.ok) {
            toast.success(`Сайт доступен! Код: ${data.status}, Задержка: ${data.duration}ms`)
        } else {
            toast.error(`Ошибка доступности: ${data.status} ${data.statusText}`)
        }
    } catch (error) {
        console.error(error)
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

      const res = await fetch(`/api/events?projectId=${id}&from=${from}&to=${to}&limit=5000`)
      if (!res.ok) throw new Error("Failed to fetch events")
      const events: ProjectEvent[] = await res.json()

      // Process data for charts
      const requestsMap = new Map<string, number>()
      const errorsMap = new Map<string, number>()
      const latencyMap = new Map<string, number>()
      const visitorsMap = new Map<string, Set<string>>()
      const sessionDurationMap = new Map<string, number[]>()
      const apiRequestsMap = new Map<string, number>()
      const registrationsMap = new Map<string, number>()
      const authorizationsMap = new Map<string, number>()
      const errorCategoriesMap = new Map<string, number>()

      // Helper to format time based on range width
      const daysDiff = (date.to!.getTime() - date.from!.getTime()) / (1000 * 60 * 60 * 24)
      const dateFormat = daysDiff > 2 ? "dd MMM" : "HH:00"

      // Track unique visitors
      const uniqueVisitors = new Set<string>()
      const newVisitors = new Set<string>()
      const returningVisitors = new Set<string>()
      
      // Track sessions
      const sessions = new Map<string, { start: Date; end: Date; duration: number }>()
      
      // Track API calls
      let totalApiCalls = 0
      let failedApiCalls = 0
      
      // Track registrations
      let totalRegistrations = 0
      
      // Track authorizations/logins
      let totalAuthorizations = 0
      
      // Track errors by category
      const dbErrors = { count: 0, events: [] as ProjectEvent[] }
      const serverErrors = { count: 0, events: [] as ProjectEvent[] }
      const networkErrors = { count: 0, events: [] as ProjectEvent[] }
      const jsErrors = { count: 0, events: [] as ProjectEvent[] }

      // Sort events for charts (oldest first)
      const sortedEvents = [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      sortedEvents.forEach((event) => {
        const d = new Date(event.created_at)
        const timeKey = format(d, dateFormat, { locale: ru })
        const visitorId = (event.metadata as any)?.visitor_id || (event as any).session_id || 'unknown'

        // Count by type
        switch (event.type) {
          case 'page_view':
            requestsMap.set(timeKey, (requestsMap.get(timeKey) || 0) + 1)
            uniqueVisitors.add(visitorId)
            if (event.metadata?.is_new_visitor) {
              newVisitors.add(visitorId)
            } else {
              returningVisitors.add(visitorId)
            }
            // Track visitors over time
            if (!visitorsMap.has(timeKey)) {
              visitorsMap.set(timeKey, new Set())
            }
            visitorsMap.get(timeKey)?.add(visitorId)
            break
            
          case 'session_duration':
            const duration = Number((event.metadata as any)?.duration_seconds || (event as any).duration || 0)
            if (!sessionDurationMap.has(timeKey)) {
              sessionDurationMap.set(timeKey, [])
            }
            sessionDurationMap.get(timeKey)?.push(duration)
            
            // Track session
            if ((event as any).session_id) {
              sessions.set((event as any).session_id, {
                start: new Date(event.created_at),
                end: new Date(new Date(event.created_at).getTime() + duration * 1000),
                duration: duration
              })
            }
            break
            
          case 'api_request':
            totalApiCalls++
            apiRequestsMap.set(timeKey, (apiRequestsMap.get(timeKey) || 0) + 1)
            if (event.status_code && event.status_code >= 400) {
              failedApiCalls++
            }
            break
            
          case 'registration':
            totalRegistrations++
            registrationsMap.set(timeKey, (registrationsMap.get(timeKey) || 0) + 1)
            break
            
          case 'authorization':
          case 'login':
            totalAuthorizations++
            authorizationsMap.set(timeKey, (authorizationsMap.get(timeKey) || 0) + 1)
            break
            
          case 'error':
            const category = String((event.metadata as any)?.error_category || 'javascript')
            errorCategoriesMap.set(category, (errorCategoriesMap.get(category) || 0) + 1)
            
            if (category === 'database') {
              dbErrors.count++
              dbErrors.events.push(event)
            } else if (category === 'server' || event.status_code >= 500) {
              serverErrors.count++
              serverErrors.events.push(event)
            } else if (category === 'network') {
              networkErrors.count++
              networkErrors.events.push(event)
            } else {
              jsErrors.count++
              jsErrors.events.push(event)
            }
            break
        }

        // Errors by status code
        if (event.status_code && event.status_code >= 400) {
            const code = `${event.status_code}`
            errorsMap.set(code, (errorsMap.get(code) || 0) + 1)
        }

        // Latency for API requests
        if (event.duration && event.type === 'api_request') {
             const current = latencyMap.get(timeKey)
             if (current) {
                 latencyMap.set(timeKey, Math.max(current, event.duration))
             } else {
                 latencyMap.set(timeKey, event.duration)
             }
        }
      })

      // Calculate averages
      const avgSessionDuration = sessions.size > 0 
        ? Array.from(sessions.values()).reduce((acc, s) => acc + s.duration, 0) / sessions.size 
        : 0

      const totalTimeOnSite = Array.from(sessions.values()).reduce((acc, s) => acc + s.duration, 0)

      // Convert maps to arrays for charts
      const requests = Array.from(requestsMap.entries()).map(([time, value]) => ({ time, value }))
      const errors = Array.from(errorsMap.entries()).map(([name, value]) => ({ name, value }))
      const latency = Array.from(latencyMap.entries()).map(([time, value]) => ({ time, value }))
      const visitors = Array.from(visitorsMap.entries()).map(([time, set]) => ({ time, value: set.size }))
      const apiCalls = Array.from(apiRequestsMap.entries()).map(([time, value]) => ({ time, value }))
      const registrations = Array.from(registrationsMap.entries()).map(([time, value]) => ({ time, value }))
      const authorizations = Array.from(authorizationsMap.entries()).map(([time, value]) => ({ time, value }))
      const errorCategories = Array.from(errorCategoriesMap.entries()).map(([name, value]) => ({ name, value }))

      return {
        requests: requests.length > 0 ? requests : [{time: "Нет данных", value: 0}],
        errors: errors.length > 0 ? errors : [{name: "Нет ошибок", value: 0}],
        latency: latency.length > 0 ? latency : [{time: "Нет данных", value: 0}],
        visitors: visitors.length > 0 ? visitors : [{time: "Нет данных", value: 0}],
        apiCalls: apiCalls.length > 0 ? apiCalls : [{time: "Нет данных", value: 0}],
        registrations: registrations.length > 0 ? registrations : [{time: "Нет данных", value: 0}],
        authorizations: authorizations.length > 0 ? authorizations : [{time: "Нет данных", value: 0}],
        errorCategories: errorCategories.length > 0 ? errorCategories : [{name: "Нет ошибок", value: 0}],
        
        // Summary stats
        totalRequests: events.filter(e => e.type === 'page_view').length,
        totalErrors: events.filter((e) => e.type === 'error').length,
        avgLatency: events.filter(e => e.type === 'api_request').reduce((acc, curr) => acc + (curr.duration || 0), 0) / (events.filter(e => e.type === 'api_request').length || 1),
        
        // New metrics
        uniqueVisitors: uniqueVisitors.size,
        newVisitors: newVisitors.size,
        returningVisitors: returningVisitors.size,
        avgSessionDuration: Math.round(avgSessionDuration),
        totalTimeOnSite: Math.round(totalTimeOnSite),
        totalApiCalls,
        failedApiCalls,
        totalRegistrations,
        totalAuthorizations,
        
        // Error breakdown
        dbErrors: dbErrors.count,
        serverErrors: serverErrors.count,
        networkErrors: networkErrors.count,
        jsErrors: jsErrors.count,
        
        // Recent events
        recentDbErrors: dbErrors.events.slice(0, 5),
        recentServerErrors: serverErrors.events.slice(0, 5),
        
        rawEvents: events
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
                  } catch (error) {
                      console.error(error)
                      toast.error("Ошибка сети")
                  }
              }}>
                Отправить тест
              </Button>
              <DateRangePicker date={date} setDate={setDate} />
            </div>
          </div>

          {/* KPI Cards - Row 1: Основные метрики */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Уникальные посетители</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.uniqueVisitors || 0}</div>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-emerald-600">{metrics?.newVisitors || 0} новых</span>
                  <span className="text-xs text-blue-600">{metrics?.returningVisitors || 0} вернулось</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Среднее время сессии</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor((metrics?.avgSessionDuration || 0) / 60)}м {(metrics?.avgSessionDuration || 0) % 60}с
                </div>
                <p className="text-xs text-muted-foreground">на посетителя</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего запросов</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalRequests || 0}</div>
                <p className="text-xs text-muted-foreground">просмотров страниц</p>
              </CardContent>
            </Card>
            
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Регистрации</CardTitle>
                 <Activity className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-emerald-600">{metrics?.totalRegistrations || 0}</div>
                 <p className="text-xs text-muted-foreground">новых пользователей</p>
               </CardContent>
             </Card>
           </div>

           {/* KPI Cards - Row 1.5: Авторизации и конверсия */}
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Авторизации</CardTitle>
                 <LogIn className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-blue-600">{metrics?.totalAuthorizations || 0}</div>
                 <p className="text-xs text-muted-foreground">входов в систему</p>
               </CardContent>
             </Card>
             
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Конверсия регистраций</CardTitle>
                 <Activity className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-purple-600">
                   {metrics?.uniqueVisitors ? Math.round((metrics?.totalRegistrations || 0) / metrics.uniqueVisitors * 100) : 0}%
                 </div>
                 <p className="text-xs text-muted-foreground">от посетителей</p>
               </CardContent>
             </Card>
             
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Конверсия авторизаций</CardTitle>
                 <LogIn className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold text-indigo-600">
                   {metrics?.uniqueVisitors ? Math.round((metrics?.totalAuthorizations || 0) / metrics.uniqueVisitors * 100) : 0}%
                 </div>
                 <p className="text-xs text-muted-foreground">от посетителей</p>
               </CardContent>
             </Card>
             
             <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Активность</CardTitle>
                 <Users className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">
                   {((metrics?.totalRegistrations || 0) + (metrics?.totalAuthorizations || 0))}
                 </div>
                 <p className="text-xs text-muted-foreground">всего действий</p>
               </CardContent>
             </Card>
           </div>
 
           {/* KPI Cards - Row 2: API и Ошибки */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Запросы</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalApiCalls || 0}</div>
                <p className="text-xs text-muted-foreground">всего вызовов</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ошибки API</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{metrics?.failedApiCalls || 0}</div>
                <p className="text-xs text-muted-foreground">неудачных запросов</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ср. задержка API</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(metrics?.avgLatency || 0)}ms</div>
                <p className="text-xs text-muted-foreground">среднее время ответа</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего ошибок</CardTitle>
                <FileCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{metrics?.totalErrors || 0}</div>
                <p className="text-xs text-muted-foreground">всех типов</p>
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

           {/* Charts Row 3 - Посетители и API */}
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Users className="h-4 w-4" />
                   Посетители
                 </CardTitle>
               </CardHeader>
               <CardContent className="pl-2">
                 <ResponsiveContainer width="100%" height={200}>
                   <AreaChart data={metrics?.visitors}>
                     <defs>
                       <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                         <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
                     <YAxis fontSize={10} tickLine={false} axisLine={false} />
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <Tooltip content={<CustomTooltip />} />
                     <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorVisitors)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>

             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Zap className="h-4 w-4" />
                   API Запросы
                 </CardTitle>
               </CardHeader>
               <CardContent className="pl-2">
                 <ResponsiveContainer width="100%" height={200}>
                   <BarChart data={metrics?.apiCalls}>
                     <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
                     <YAxis fontSize={10} tickLine={false} axisLine={false} />
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                     <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </CardContent>
             </Card>

             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Activity className="h-4 w-4" />
                   Регистрации
                 </CardTitle>
               </CardHeader>
               <CardContent className="pl-2">
                 <ResponsiveContainer width="100%" height={200}>
                   <BarChart data={metrics?.registrations}>
                     <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
                     <YAxis fontSize={10} tickLine={false} axisLine={false} />
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Авторизации
                  </CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={metrics?.authorizations}>
                      <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
 
            {/* Ошибки по категориям */}
           <div className="grid gap-4 md:grid-cols-2">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <AlertTriangle className="h-4 w-4 text-destructive" />
                   Ошибки по категориям
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-4">
                   <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                     <div className="flex items-center gap-3">
                       <Database className="h-5 w-5 text-red-500" />
                       <div>
                         <p className="font-medium text-sm">База данных</p>
                         <p className="text-xs text-muted-foreground">SQL, Connection, Query errors</p>
                       </div>
                     </div>
                     <span className="text-2xl font-bold text-red-500">{metrics?.dbErrors || 0}</span>
                   </div>

                   <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                     <div className="flex items-center gap-3">
                       <Server className="h-5 w-5 text-orange-500" />
                       <div>
                         <p className="font-medium text-sm">Сервер (500)</p>
                         <p className="text-xs text-muted-foreground">Internal Server Error</p>
                       </div>
                     </div>
                     <span className="text-2xl font-bold text-orange-500">{metrics?.serverErrors || 0}</span>
                   </div>

                   <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                     <div className="flex items-center gap-3">
                       <Wifi className="h-5 w-5 text-yellow-500" />
                       <div>
                         <p className="font-medium text-sm">Сеть</p>
                         <p className="text-xs text-muted-foreground">Network, Timeout errors</p>
                       </div>
                     </div>
                     <span className="text-2xl font-bold text-yellow-500">{metrics?.networkErrors || 0}</span>
                   </div>

                   <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                     <div className="flex items-center gap-3">
                       <FileCode className="h-5 w-5 text-blue-500" />
                       <div>
                         <p className="font-medium text-sm">JavaScript</p>
                         <p className="text-xs text-muted-foreground">Client-side errors</p>
                       </div>
                     </div>
                     <span className="text-2xl font-bold text-blue-500">{metrics?.jsErrors || 0}</span>
                   </div>
                 </div>
               </CardContent>
             </Card>

             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Database className="h-4 w-4 text-red-500" />
                   Последние ошибки БД
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2 max-h-[300px] overflow-y-auto">
                   {metrics?.recentDbErrors && metrics.recentDbErrors.length > 0 ? (
                     metrics.recentDbErrors.map((error, idx) => (
                       <div key={idx} className="p-3 bg-muted/50 rounded-lg text-sm">
                         <div className="flex items-center justify-between mb-1">
                           <span className="font-medium text-red-500">{error.name}</span>
                           <span className="text-xs text-muted-foreground">
                             {new Date(error.created_at).toLocaleTimeString()}
                           </span>
                         </div>
                         <p className="text-xs text-muted-foreground truncate">{error.message}</p>
                         <p className="text-xs text-muted-foreground">{error.path}</p>
                       </div>
                     ))
                   ) : (
                     <div className="p-4 text-center text-muted-foreground text-sm">
                       Нет ошибок базы данных
                     </div>
                   )}
                 </div>
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
                  <CardTitle>Интеграция с вашим сайтом</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                            <p className="mb-2 text-sm font-medium">Endpoint URL:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 relative rounded bg-muted px-3 py-2 font-mono text-sm font-semibold border">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/api/ingest` : 'https://your-domain.com/api/ingest'}
                                </code>
                                <Button variant="outline" size="sm" onClick={() => {
                                    const url = typeof window !== 'undefined' ? `${window.location.origin}/api/ingest` : '';
                                    navigator.clipboard.writeText(url);
                                    toast.success("URL скопирован!");
                                }}>Копировать</Button>
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-medium">Ваш API ключ:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 relative rounded bg-muted px-3 py-2 font-mono text-sm font-semibold border">
                                    {project.api_key}
                                </code>
                                <Button variant="outline" size="sm" onClick={() => {
                                    navigator.clipboard.writeText(project.api_key);
                                    toast.success("Ключ скопирован!");
                                }}>Копировать</Button>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Как интегрировать:</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Чтобы начать отслеживать события на вашем сайте, добавьте вызов API в код вашего приложения. 
                                Вы можете использовать любой HTTP клиент для отправки POST-запросов на наш сервер.
                            </p>
                        </div>

                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                💡 Совет: Отправляйте события при загрузке страницы, входах в систему или возникновении ошибок для детального мониторинга.
                            </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Код для интеграции:</p>
                            <span className="text-xs text-muted-foreground">Расширенная аналитика</span>
                          </div>
                          
                           {/* Инструкция */}
                           <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                             <p className="text-sm font-medium">📋 Инструкция по интеграции:</p>
                              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                <li>Скопируйте код ниже</li>
                                <li>Вставьте его перед закрывающим тегом <code>&lt;/body&gt;</code> на всех страницах</li>
                                <li>Код автоматически отслеживает: посещения, время, ошибки, API-запросы, регистрации, авторизации</li>
                                <li>Для отслеживания регистраций добавьте класс <code>tracksee-register</code> на форму</li>
                                <li>Для отслеживания авторизаций добавьте класс <code>tracksee-login</code> на форму входа</li>
                              </ol>
                           </div>

                           {/* Предупреждение о localhost (скрыто на проде) */}
                           {typeof window !== 'undefined' && 
                            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                             <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
                               <p className="text-sm font-medium text-amber-600 dark:text-amber-400">⚠️ Важно:</p>
                               <p className="text-xs text-muted-foreground">
                                 Сейчас Tracksee работает локально. 
                                 Для получения данных с внешних сайтов нужно задеплоить Tracksee на сервер с публичным доменом.
                               </p>
                             </div>
                           )}

                          <div className="relative group">
                              <pre className="w-full overflow-x-auto rounded-lg bg-slate-950 p-4 text-[10px] leading-relaxed text-slate-300 font-mono border border-slate-800 shadow-2xl max-h-[500px] overflow-y-auto">
{`<!-- Tracksee Analytics -->
<script>
(function() {
  const CONFIG = {
    API_KEY: '${project.api_key}',
    ENDPOINT: '${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/ingest',
    PROJECT_ID: '${id}'
  };

  // ===== УТИЛИТЫ =====
  function generateId() {
    return 'trk_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Получение/создание ID сессии (временной)
  function getSessionId() {
    let sid = sessionStorage.getItem('trk_session');
    if (!sid) {
      sid = generateId();
      sessionStorage.setItem('trk_session', sid);
    }
    return sid;
  }

  // Получение/создание ID посетителя (постоянный)
  function getVisitorId() {
    let vid = localStorage.getItem('trk_visitor');
    if (!vid) {
      vid = generateId();
      localStorage.setItem('trk_visitor', vid);
    }
    return vid;
  }

  // Проверка первый ли визит
  function isFirstVisit() {
    const visited = localStorage.getItem('trk_visited');
    if (!visited) {
      localStorage.setItem('trk_visited', 'true');
      localStorage.setItem('trk_first_visit_date', new Date().toISOString());
      return true;
    }
    return false;
  }

  // ===== ОТПРАВКА ДАННЫХ =====
  function sendEvent(data) {
    const payload = {
      ...data,
      project_id: CONFIG.PROJECT_ID,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      timestamp: new Date().toISOString()
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon(CONFIG.ENDPOINT, 
        new Blob([JSON.stringify(payload)], {type: 'application/json'}));
    } else {
      fetch(CONFIG.ENDPOINT, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-api-key': CONFIG.API_KEY},
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }
  }

  // ===== ВРЕМЯ НА САЙТЕ =====
  let sessionStartTime = Date.now();
  let pageStartTime = Date.now();
  let totalActiveTime = 0;
  let lastActiveTime = Date.now();

  function trackActivity() {
    lastActiveTime = Date.now();
  }

  // Отслеживание активности
  ['click', 'scroll', 'mousemove', 'keypress'].forEach(event => {
    document.addEventListener(event, trackActivity, true);
  });

  // Отправка времени сессии
  function sendSessionDuration() {
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveTime;
    
    // Считаем только если пользователь был активен в последние 30 секунд
    if (timeSinceLastActive < 30000) {
      totalActiveTime += Math.min(timeSinceLastActive, now - pageStartTime);
    }

    sendEvent({
      type: 'session_duration',
      path: window.location.pathname,
      duration_seconds: Math.round((now - sessionStartTime) / 1000),
      active_time_seconds: Math.round(totalActiveTime / 1000),
      is_new_visitor: isFirstVisit()
    });
  }

  // ===== ОТСЛЕЖИВАНИЕ API ЗАПРОСОВ =====
  // Перехват fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    const startTime = performance.now();

    return originalFetch.apply(this, args).then(response => {
      const duration = Math.round(performance.now() - startTime);
      
      sendEvent({
        type: 'api_request',
        name: 'Fetch API',
        path: window.location.pathname,
        request_url: url,
        method: options.method || 'GET',
        status_code: response.status,
        duration: duration,
        success: response.ok
      });

      return response;
    }).catch(error => {
      sendEvent({
        type: 'api_error',
        name: 'Fetch Error',
        path: window.location.pathname,
        request_url: url,
        error_message: error.message
      });
      throw error;
    });
  };

  // Перехват XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const open = xhr.open;
    const send = xhr.send;
    let requestUrl, requestMethod, startTime;

    xhr.open = function(method, url) {
      requestMethod = method;
      requestUrl = url;
      return open.apply(this, arguments);
    };

    xhr.send = function() {
      startTime = performance.now();
      
      xhr.addEventListener('loadend', function() {
        const duration = Math.round(performance.now() - startTime);
        sendEvent({
          type: 'api_request',
          name: 'XHR Request',
          path: window.location.pathname,
          request_url: requestUrl,
          method: requestMethod,
          status_code: xhr.status,
          duration: duration,
          success: xhr.status >= 200 && xhr.status < 300
        });
      });

      return send.apply(this, arguments);
    };

    return xhr;
  };

  // ===== РЕГИСТРАЦИИ =====
  function trackRegistration(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      if (key.toLowerCase().includes('email')) data.email = value;
      if (key.toLowerCase().includes('name')) data.name = value;
    });

    sendEvent({
      type: 'registration',
      name: 'User Registration',
      path: window.location.pathname,
      form_id: form.id || null,
      form_action: form.action || null,
      has_email: !!data.email
    });
  }

  // Отслеживание форм регистрации
  document.addEventListener('submit', function(e) {
    const form = e.target;
    // Ищем формы с классом tracksee-register или по ключевым словам
    const isRegisterForm = form.classList.contains('tracksee-register') ||
      form.action?.toLowerCase().includes('register') ||
      form.action?.toLowerCase().includes('signup') ||
      form.id?.toLowerCase().includes('register') ||
      /(signup|register|join)/i.test(form.innerHTML);

    if (isRegisterForm) {
      trackRegistration(form);
    }
  });

  // ===== АВТОРИЗАЦИИ =====
  function trackAuthorization(form, isSuccess = true) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      if (key.toLowerCase().includes('email') || key.toLowerCase().includes('login')) data.login = value;
    });

    sendEvent({
      type: 'authorization',
      name: isSuccess ? 'User Login Success' : 'User Login Failed',
      path: window.location.pathname,
      form_id: form.id || null,
      form_action: form.action || null,
      success: isSuccess,
      has_login: !!data.login
    });
  }

  // Отслеживание форм авторизации
  document.addEventListener('submit', function(e) {
    const form = e.target;
    // Ищем формы с классом tracksee-login или по ключевым словам
    const isLoginForm = form.classList.contains('tracksee-login') ||
      form.action?.toLowerCase().includes('login') ||
      form.action?.toLowerCase().includes('signin') ||
      form.action?.toLowerCase().includes('auth') ||
      form.id?.toLowerCase().includes('login') ||
      /(login|signin|auth|вход)/i.test(form.innerHTML);

    if (isLoginForm) {
      // Отслеживаем попытку авторизации
      trackAuthorization(form, true);
    }
  });

  // ===== ОШИБКИ =====
  function categorizeError(message, stack, filename) {
    const msg = (message || '').toLowerCase();
    const stk = (stack || '').toLowerCase();
    const file = (filename || '').toLowerCase();

    if (msg.includes('database') || msg.includes('sql') || msg.includes('query') || 
        stk.includes('database') || file.includes('db.')) {
      return { category: 'database', severity: 'critical' };
    }
    
    if (msg.includes('404') || msg.includes('not found')) {
      return { category: '404', severity: 'medium' };
    }
    
    if (msg.includes('500') || msg.includes('internal server error')) {
      return { category: 'server', severity: 'critical' };
    }
    
    if (msg.includes('network') || msg.includes('failed to fetch')) {
      return { category: 'network', severity: 'high' };
    }

    return { category: 'javascript', severity: 'medium' };
  }

  window.addEventListener('error', function(e) {
    const errorInfo = categorizeError(e.message, e.error?.stack, e.filename);
    
    sendEvent({
      type: 'error',
      name: 'JavaScript Error',
      path: window.location.pathname,
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      stack: e.error?.stack || null,
      error_category: errorInfo.category,
      severity: errorInfo.severity
    });
  });

  window.addEventListener('unhandledrejection', function(e) {
    const msg = e.reason?.message || String(e.reason);
    const errorInfo = categorizeError(msg, e.reason?.stack, null);
    
    sendEvent({
      type: 'error',
      name: 'Promise Rejection',
      path: window.location.pathname,
      message: msg,
      stack: e.reason?.stack || null,
      error_category: errorInfo.category,
      severity: errorInfo.severity
    });
  });

  // ===== ПРОСМОТРЫ СТРАНИЦ =====
  function trackPageView() {
    const isNew = isFirstVisit();
    
    sendEvent({
      type: 'page_view',
      name: document.title,
      path: window.location.pathname,
      url: window.location.href,
      referrer: document.referrer || null,
      screen_resolution: window.screen.width + 'x' + window.screen.height,
      viewport: window.innerWidth + 'x' + window.innerHeight,
      language: navigator.language,
      is_new_visitor: isNew,
      is_returning: !isNew
    });
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====
  if (document.readyState === 'complete') {
    trackPageView();
  } else {
    window.addEventListener('load', () => setTimeout(trackPageView, 100));
  }

  // Отправка времени при уходе
  window.addEventListener('beforeunload', sendSessionDuration);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      sendSessionDuration();
    }
  });

  // Heartbeat каждые 30 сек
  setInterval(function() {
    sendEvent({
      type: 'heartbeat',
      name: 'User Active',
      path: window.location.pathname
    });
  }, 30000);

})();
</script>`}
                               </pre>
                               <Button 
                                 variant="secondary" 
                                 size="sm" 
                                 className="absolute top-2 right-2 h-7 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                      const pre = document.querySelector('pre');
                                      if (pre) {
                                          navigator.clipboard.writeText(pre.innerText);
                                          toast.success("Код скопирован! Вставьте перед </body>");
                                      }
                                  }}
                               >
                                 Копировать код
                               </Button>
                           </div>

                          {/* Что отслеживается */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center gap-2">
                              <span>👤</span> Уникальные посетители
                            </div>
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center gap-2">
                              <span>⏱️</span> Время на сайте
                            </div>
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded flex items-center gap-2">
                              <span>📊</span> API запросы
                            </div>
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded flex items-center gap-2">
                               <span>📝</span> Регистрации
                             </div>
                             <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded flex items-center gap-2">
                               <span>🔑</span> Авторизации
                             </div>
                             <div className="p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2">
                               <span>💥</span> Ошибки БД
                             </div>
                            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2">
                              <span>⚠️</span> Ошибки сайта
                            </div>
                          </div>
                      </div>
                  </div>
              </CardContent>
          </Card>

        </main>
      </div>
    </div>
  )
}
