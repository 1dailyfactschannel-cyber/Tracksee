"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

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

  useEffect(() => {
    fetchProjects()
  }, [])

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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Мониторинг</h2>
          <p className="text-muted-foreground">
            Статус доступности ваших проектов в реальном времени
          </p>
        </div>
        <Button onClick={checkAll} disabled={checking || loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          Проверить всё
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted" />
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => {
            const status = statuses[project.id]
            return (
              <Card key={project.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {project.name}
                  </CardTitle>
                  {status?.status === "online" && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {status?.status === "offline" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  {status?.status === "error" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground truncate mb-4">
                    {project.url}
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">
                        {status?.status === "pending" ? "..." : (status?.statusCode || "—")}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Задержка: {status?.latency ? `${status.latency}ms` : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">
                        {status?.lastChecked ? format(status.lastChecked, "HH:mm:ss", { locale: ru }) : "Не проверялось"}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2" 
                        onClick={() => checkProject(project)}
                        disabled={status?.status === "pending"}
                      >
                        <RefreshCw className={`h-3 w-3 ${status?.status === "pending" ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            Нет активных проектов. Добавьте проекты в разделе &quot;Приложения&quot;.
          </p>
        </div>
      )}
    </div>
  )
}
