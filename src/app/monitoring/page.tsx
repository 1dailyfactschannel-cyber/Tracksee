"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

type Project = {
  id: string
  name: string
  url: string
  external_api_key: string | null
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
  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase.from("projects").select("*")
      if (error) throw error
      setProjects(data || [])
      
      // Initialize statuses
      const initialStatuses: Record<string, ProjectStatus> = {}
      data?.forEach(p => {
        initialStatuses[p.id] = { id: p.id, status: "pending" }
      })
      setStatuses(initialStatuses)
    } catch (error) {
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
        body: JSON.stringify({ 
          url: project.url,
          externalApiKey: project.external_api_key 
        }),
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
    } catch (error) {
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
    const promises = projects.map(p => checkProject(p))
    await Promise.allSettled(promises)
    setChecking(false)
    toast.success("Проверка завершена")
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Мониторинг</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={checkAll} disabled={checking || loading}>
            <Play className={`mr-2 h-4 w-4 ${checking ? "animate-pulse" : ""}`} />
            Проверить все
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const status = statuses[project.id] || { id: project.id, status: "pending" }
          
          return (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {project.name}
                </CardTitle>
                {status.status === "online" && <CheckCircle className="h-4 w-4 text-green-500" />}
                {status.status === "offline" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                {status.status === "pending" && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                {status.status === "error" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {status.statusCode ? status.statusCode : "---"}
                  <span className="text-xs font-normal text-muted-foreground">
                     Код ответа
                  </span>
                </div>
                
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">URL:</span>
                        <a href={project.url} target="_blank" className="text-blue-500 hover:underline truncate max-w-[150px]">
                            {project.url}
                        </a>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Задержка:</span>
                        <span className={status.latency && status.latency > 1000 ? "text-yellow-500" : ""}>
                            {status.latency ? `${status.latency}ms` : "---"}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Последняя проверка:</span>
                        <span>
                            {status.lastChecked 
                                ? format(status.lastChecked, "HH:mm:ss", { locale: ru }) 
                                : "Не проверялось"}
                        </span>
                    </div>
                </div>

                <div className="mt-4">
                     <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full" 
                        onClick={() => checkProject(project)}
                        disabled={status.status === "pending"}
                    >
                        <RefreshCw className={`mr-2 h-3 w-3 ${status.status === "pending" ? "animate-spin" : ""}`} />
                        Проверить
                     </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        
        {projects.length === 0 && !loading && (
            <div className="col-span-full text-center text-muted-foreground py-10">
                Нет активных проектов. Добавьте проекты в разделе "Приложения".
            </div>
        )}
      </div>
    </div>
  )
}
