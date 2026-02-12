"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Plus, 
  Copy, 
  Globe, 
  ExternalLink, 
  MoreHorizontal,
  TrendingUp,
  Clock,
  Activity,
  Search,
  Filter,
  Grid3X3,
  List,
  ArrowUpRight,
  Sparkles,
  FolderKanban
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ModernLayout } from "@/components/layout/modern-layout"

interface Project {
  id: string
  name: string
  url: string
  api_key: string
  created_at: string
  status?: "online" | "offline" | "warning"
  events_count?: number
}

export default function ProjectsPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectUrl, setNewProjectUrl] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const queryClient = useQueryClient()

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Ошибка при загрузке проектов")
      return res.json() as Promise<Project[]>
    },
  })

  const createProject = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newProjectName,
          url: newProjectUrl,
        }),
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Ошибка при создании проекта")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Проект успешно создан")
      setIsOpen(false)
      setNewProjectName("")
      setNewProjectUrl("")
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
    onError: (error) => {
      toast.error(`Ошибка при создании: ${error.message}`)
    },
  })

  const filteredProjects = projects?.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("API Key скопирован в буфер обмена")
  }

  return (
    <ModernLayout>
      {/* Header Section */}
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              Проекты
              <Badge variant="secondary" className="text-sm font-normal">
                {projects?.length || 0}
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Управляйте вашими проектами и отслеживайте метрики в реальном времени
            </p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
                <Plus className="h-4 w-4" />
                Новый проект
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Создать новый проект
                </DialogTitle>
                <DialogDescription>
                  Добавьте проект для мониторинга событий, ошибок и метрик производительности.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Название проекта
                  </Label>
                  <Input
                    id="name"
                    placeholder="Например: E-commerce App"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="url" className="text-sm font-medium">
                    URL проекта
                  </Label>
                  <Input
                    id="url"
                    placeholder="https://example.com"
                    value={newProjectUrl}
                    onChange={(e) => setNewProjectUrl(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => createProject.mutate()} 
                  disabled={createProject.isPending || !newProjectName}
                  size="lg"
                  className="gap-2"
                >
                  {createProject.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Создание...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Создать проект
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск проектов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-card/50"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Фильтры
            </Button>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Projects Grid/List */}
        {isLoading ? (
          <div className={cn(
            "grid gap-4",
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1"
          )}>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-lg">
                <div className="h-32 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
                <CardContent className="p-6">
                  <div className="h-6 w-3/4 bg-muted rounded animate-pulse mb-4" />
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className={cn(
            "grid gap-4",
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1"
          )}>
            {filteredProjects.map((project, index) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                viewMode={viewMode}
                onCopyKey={() => copyToClipboard(project.api_key)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <EmptyState onCreate={() => setIsOpen(true)} />
        )}
      </div>
    </ModernLayout>
  )
}

function ProjectCard({ 
  project, 
  viewMode, 
  onCopyKey,
  index 
}: { 
  project: Project
  viewMode: "grid" | "list"
  onCopyKey: () => void
  index: number
}) {
  const gradients = [
    "from-blue-500/20 via-purple-500/20 to-pink-500/20",
    "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
    "from-orange-500/20 via-amber-500/20 to-yellow-500/20",
    "from-rose-500/20 via-pink-500/20 to-purple-500/20",
  ]
  
  const gradient = gradients[index % gradients.length]

  if (viewMode === "list") {
    return (
      <Card className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={cn(
              "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
              gradient
            )}>
              <Globe className="h-6 w-6 text-foreground/80" />
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                <StatusBadge status={project.status || "online"} />
              </div>
              <p className="text-sm text-muted-foreground truncate">{project.url}</p>
            </div>
            
            {/* Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                <span>{(project.events_count || 0).toLocaleString()} событий</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{new Date(project.created_at).toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="gap-2"
                onClick={onCopyKey}
              >
                <Copy className="h-4 w-4" />
                <span className="hidden lg:inline">API Key</span>
              </Button>
              <Button size="sm" className="gap-2" asChild>
                <Link href={`/projects/${project.id}`}>
                  Детали
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Открыть сайт
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={onCopyKey}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Копировать ключ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
      {/* Header with gradient */}
      <div className={cn(
        "h-24 bg-gradient-to-br relative overflow-hidden",
        gradient
      )}>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
        <div className="absolute top-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-white/20 backdrop-blur-sm hover:bg-white/30"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={project.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Открыть сайт
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCopyKey}>
                <Copy className="mr-2 h-4 w-4" />
                Копировать API Key
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="absolute bottom-4 left-4">
          <StatusBadge status={project.status || "online"} />
        </div>
      </div>
      
      <CardContent className="p-6">
        {/* Title */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {project.url || "Нет URL"}
          </p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">События</p>
            <p className="text-2xl font-bold flex items-center gap-1">
              {(project.events_count || 0).toLocaleString()}
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Создан</p>
            <p className="text-sm font-medium">
              {new Date(project.created_at).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        
        {/* API Key */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-4">
          <code className="flex-1 text-xs font-mono truncate text-muted-foreground">
            {project.api_key}
          </code>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 shrink-0"
            onClick={onCopyKey}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            asChild
          >
            <a href={project.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Сайт
            </a>
          </Button>
          <Button className="flex-1 gap-2" asChild>
            <Link href={`/projects/${project.id}`}>
              Детали
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    online: { bg: "bg-emerald-500/15", text: "text-emerald-600", label: "Онлайн" },
    offline: { bg: "bg-red-500/15", text: "text-red-600", label: "Офлайн" },
    warning: { bg: "bg-amber-500/15", text: "text-amber-600", label: "Внимание" },
  }
  
  const config = configs[status as keyof typeof configs] || configs.online
  
  return (
    <Badge variant="secondary" className={cn("font-medium border-0", config.bg, config.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", config.text.replace("text-", "bg-"))} />
      {config.label}
    </Badge>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-xl" />
        <div className="relative w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20">
          <FolderKanban className="h-10 w-10 text-primary/60" />
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">Нет проектов</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Создайте свой первый проект, чтобы начать отслеживать метрики, события и ошибки в реальном времени.
      </p>
      <Button size="lg" onClick={onCreate} className="gap-2">
        <Plus className="h-4 w-4" />
        Создать первый проект
      </Button>
    </div>
  )
}
