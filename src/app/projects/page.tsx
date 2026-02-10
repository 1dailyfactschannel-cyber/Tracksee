"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Copy, Globe, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"

interface Project {
  id: string
  name: string
  url: string
  api_key: string
  created_at: string
}

export default function ProjectsPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectUrl, setNewProjectUrl] = useState("")
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("API Key скопирован")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <aside className="hidden w-[200px] flex-col md:flex bg-card shadow-xl z-30">
          <Sidebar />
        </aside>
        <main className="flex-1 p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Мои проекты</h1>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Новый проект
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать новый проект</DialogTitle>
                  <DialogDescription>
                    Добавьте проект для мониторинга событий и метрик.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Название проекта</Label>
                    <Input
                      id="name"
                      placeholder="My Awesome App"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="url">URL проекта</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com"
                      value={newProjectUrl}
                      onChange={(e) => setNewProjectUrl(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => createProject.mutate()} 
                    disabled={createProject.isPending || !newProjectName}
                  >
                    {createProject.isPending ? "Создание..." : "Создать проект"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects?.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{project.name}</CardTitle>
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardDescription className="truncate">
                      {project.url || "Нет URL"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground">
                          API Key
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Input 
                            value={project.api_key} 
                            readOnly 
                            className="font-mono text-xs"
                          />
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => copyToClipboard(project.api_key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={project.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Сайт
                      </a>
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>
                        Детали
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {projects?.length === 0 && (
            <div className="text-center py-20 bg-muted/20 rounded-lg border-2 border-dashed">
              <h3 className="text-lg font-medium">Нет проектов</h3>
              <p className="text-muted-foreground mb-4">
                Создайте свой первый проект, чтобы начать мониторинг.
              </p>
              <Button onClick={() => setIsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Создать проект
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
