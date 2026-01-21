
"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Copy, Trash2, Globe, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
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
  const [newProjectExternalKey, setNewProjectExternalKey] = useState("")
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
      
      if (error) throw error
      return data as Project[]
    },
  })

  const createProject = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Пользователь не авторизован")

      const { error } = await supabase.from("projects").insert({
        name: newProjectName,
        url: newProjectUrl,
        user_id: user.id,
        external_api_key: newProjectExternalKey || null
      })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Проект успешно создан")
      setIsOpen(false)
      setNewProjectName("")
      setNewProjectUrl("")
      setNewProjectExternalKey("")
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
        <main className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Проекты</h2>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Добавить проект
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Новый проект</DialogTitle>
                  <DialogDescription>
                    Создайте новый проект для отслеживания метрик.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Название
                    </Label>
                    <Input
                      id="name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="col-span-3"
                      placeholder="My Awesome App"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="url" className="text-right">
                      URL
                    </Label>
                    <Input
                      id="url"
                      value={newProjectUrl}
                      onChange={(e) => setNewProjectUrl(e.target.value)}
                      className="col-span-3"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="apiKey" className="text-right">
                      Внешний API Key
                    </Label>
                    <div className="col-span-3 space-y-1">
                      <Input
                        id="apiKey"
                        placeholder="Ключ от Point Flow (опционально)"
                        value={newProjectExternalKey}
                        onChange={(e) => setNewProjectExternalKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Укажите ключ, если Tracksee должен сам запрашивать данные у этого сайта.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createProject.mutate()} disabled={createProject.isPending}>
                    {createProject.isPending ? "Создание..." : "Создать"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-muted-foreground">Загрузка проектов...</p>
            </div>
          ) : projects?.length === 0 ? (
            <div className="flex h-[400px] flex-col items-center justify-center rounded-md border border-dashed text-center animate-in fade-in-50">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Нет проектов</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                Вы пока не добавили ни одного проекта для отслеживания.
              </p>
              <Button onClick={() => setIsOpen(true)}>Добавить первый проект</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects?.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {project.url || "Нет URL"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">API Key</Label>
                      <div className="flex items-center space-x-2">
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold truncate w-full">
                          {project.api_key}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => copyToClipboard(project.api_key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(project.api_key)}>
                        <Copy className="mr-2 h-4 w-4" />
                        API Key
                      </Button>
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Детали
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
