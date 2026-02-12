"use client"

import { useEffect, useState } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Globe,
  Clock,
  Activity,
  ArrowUpRight,
  Server,
  Layers
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ModernLayout } from "@/components/layout/modern-layout"
import { cn } from "@/lib/utils"

type Project = {
  id: string
  name: string
  url: string
}

type ProjectStatus = {
  id: string
  status: "online" | "offline" | "pending" | "error"
  statusCode?: number
  latency?: number
  lastChecked?: Date
  error?: string
}

export default function MonitoringPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [statuses, setStatuses] = useState<Record<string, ProjectStatus>>({})
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [envFilter, setEnvFilter] = useState<string>("All")
  const [search, setSearch] = useState<string>("")

  useEffect(() => {
    fetchProjects()
  }, [])

  const environmentFromUrl = (url: string) => {
    const lower = url?.toLowerCase() ?? ''
    if (lower.includes('prod') || lower.includes('production')) return 'Prod'
    if (lower.includes('dev') || lower.includes('staging') || lower.includes('local')) return 'Dev'
    return 'Other'
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Ошибка при загрузке проектов")
      const data = await res.json()
      setProjects(data || [])
      
      const initialStatuses: Record<string, ProjectStatus> = {}
      data?.forEach((p: Project) => {
        initialStatuses[p.id] = { id: p.id, status: "pending" }
      })
      setStatuses(initialStatuses)
    } catch {
      toast.error("Ошибка при загрузке проектов")
    } finally {
      setLoading(false)
    }
  }

  const checkProject = async (project: Project) => {
    setStatuses(prev => ({
      ...prev,
      [project.id]: { ...prev[project.id], status: "pending" }
    }))

    try {
      const res = await fetch("/api/check-status", {
        method: "POST",
        body: JSON.stringify({ url: project.url }),
      })
      
      const data = await res.json()
      
      setStatuses(prev => ({
        ...prev,
        [project.id]: {
          id: project.id,
          status: data.ok ? "online" : "offline",
          statusCode: data.status,
          latency: data.duration,
          lastChecked: new Date(),
          error: data.error
        }
      }))
    } catch {
      setStatuses(prev => ({
        ...prev,
        [project.id]: {
          id: project.id,
          status: "error",
          error: "Network Error",
          lastChecked: new Date()
        }
      }))
    }
  }

  const checkAll = async () => {
    setChecking(true)
    await Promise.all(projects.map(p => checkProject(p)))
    setChecking(false)
  }

  const filteredProjects = projects.filter(p => {
    const env = environmentFromUrl(p.url)
    const matchEnv = envFilter === 'All' || env === envFilter
    const matchSearch = p.name.toLowerCase().includes((search || '').toLowerCase()) ||
                       p.url.toLowerCase().includes((search || '').toLowerCase())
    return matchEnv && matchSearch
  })

  const onlineCount = Object.values(statuses).filter(s => s.status === "online").length
  const offlineCount = Object.values(statuses).filter(s => s.status === "offline" || s.status === "error").length
  const pendingCount = Object.values(statuses).filter(s => s.status === "pending").length

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Мониторинг</h1>
            <p className="text-muted-foreground mt-1">
              Отслеживайте доступность и производительность ваших проектов в реальном времени
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>{onlineCount} онлайн</span>
              <span className="mx-1">·</span>
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>{offlineCount} офлайн</span>
            </div>
            <Button onClick={checkAll} disabled={checking || loading} size="lg">
              <RefreshCw className={cn("mr-2 h-4 w-4", checking && "animate-spin")} />
              {checking ? "Проверка..." : "Проверить все"}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatusCard
            title="Онлайн"
            value={onlineCount}
            icon={CheckCircle}
            color="emerald"
          />
          <StatusCard
            title="Офлайн"
            value={offlineCount}
            icon={AlertTriangle}
            color="red"
          />
          <StatusCard
            title="В проверке"
            value={pendingCount}
            icon={Clock}
            color="amber"
          />
          <StatusCard
            title="Всего"
            value={projects.length}
            icon={Globe}
            color="blue"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск проектов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-card/50"
            />
          </div>
          
          <Select value={envFilter} onValueChange={setEnvFilter}>
            <SelectTrigger className="w-[180px] h-11">
              <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Окружение" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Все окружения</SelectItem>
              <SelectItem value="Prod">Production</SelectItem>
              <SelectItem value="Dev">Development</SelectItem>
              <SelectItem value="Other">Другое</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-0 shadow-lg animate-pulse">
                <CardHeader className="h-20 bg-muted" />
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map(project => {
              const status = statuses[project.id]
              return (
                <ProjectStatusCard
                  key={project.id}
                  project={project}
                  status={status}
                  onCheck={() => checkProject(project)}
                />
              )
            })}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </ModernLayout>
  )
}

function StatusCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string
  value: number
  icon: React.ElementType
  color: string
}) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-600",
    red: "from-red-500/20 to-red-500/5 text-red-600",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-600",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-600"
  }

  return (
    <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn(
            "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
            colors[color]
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectStatusCard({
  project,
  status,
  onCheck
}: {
  project: Project
  status?: ProjectStatus
  onCheck: () => void
}) {
  const statusConfig = {
    online: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-600",
      border: "border-emerald-500/30",
      icon: CheckCircle,
      label: "Онлайн"
    },
    offline: {
      bg: "bg-red-500/15",
      text: "text-red-600",
      border: "border-red-500/30",
      icon: AlertTriangle,
      label: "Офлайн"
    },
    error: {
      bg: "bg-red-500/15",
      text: "text-red-600",
      border: "border-red-500/30",
      icon: AlertTriangle,
      label: "Ошибка"
    },
    pending: {
      bg: "bg-amber-500/15",
      text: "text-amber-600",
      border: "border-amber-500/30",
      icon: Clock,
      label: "Проверка..."
    }
  }

  const config = statusConfig[status?.status || "pending"]
  const StatusIcon = config.icon

  return (
    <Card className={cn(
      "border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-xl",
      "border-l-4",
      config.border
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              config.bg
            )}>
              <StatusIcon className={cn("h-5 w-5", config.text)} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{project.name}</CardTitle>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {project.url}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={cn("font-medium", config.bg, config.text)}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Статус код
            </p>
            <p className="text-2xl font-bold">
              {status?.status === "pending" ? "..." : (status?.statusCode || "—")}
            </p>
          </div>
          
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground">
              Задержка: {status?.latency ? `${status.latency}ms` : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {status?.lastChecked ? 
                format(status.lastChecked, "HH:mm:ss", { locale: ru }) : 
                "Не проверялось"
              }
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 gap-2"
          onClick={onCheck}
          disabled={status?.status === "pending"}
        >
          <RefreshCw className={cn("h-4 w-4", status?.status === "pending" && "animate-spin")} />
          {status?.status === "pending" ? "Проверка..." : "Проверить"}
        </Button>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-xl" />
        <div className="relative w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20">
          <Activity className="h-10 w-10 text-primary/60" />
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">Нет проектов для мониторинга</h3>
      <p className="text-muted-foreground text-center max-w-sm">
        Добавьте проекты в разделе &quot;Проекты&quot;, чтобы начать мониторинг их доступности.
      </p>
    </div>
  )
}
