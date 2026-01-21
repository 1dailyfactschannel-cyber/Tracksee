"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { 
  Folder, 
  LayoutDashboard, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  MoreVertical,
  Trash2,
  Edit2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type FolderType = {
  id: string
  name: string
}

type DashboardType = {
  id: string
  name: string
  folder_id: string | null
}

export function MonitoringSidebar() {
  const [folders, setFolders] = useState<FolderType[]>([])
  const [dashboards, setDashboards] = useState<DashboardType[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [newFolderName, setNewFolderName] = useState("")
  const [newDashboardName, setNewDashboardName] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [isDashboardDialogOpen, setIsDashboardDialogOpen] = useState(false)
  
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [foldersRes, dashboardsRes] = await Promise.all([
        supabase.from("monitoring_folders").select("*").order("name"),
        supabase.from("monitoring_dashboards").select("id, name, folder_id").order("name")
      ])

      if (foldersRes.error) throw foldersRes.error
      if (dashboardsRes.error) throw dashboardsRes.error

      setFolders(foldersRes.data || [])
      setDashboards(dashboardsRes.data || [])
    } catch (error) {
      console.error("Error fetching monitoring data:", error)
      toast.error("Не удалось загрузить структуру мониторинга")
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }))
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user")

      const { data, error } = await supabase
        .from("monitoring_folders")
        .insert({ name: newFolderName, user_id: user.id })
        .select()
        .single()

      if (error) throw error

      setFolders([...folders, data])
      setNewFolderName("")
      setIsFolderDialogOpen(false)
      toast.success("Папка создана")
    } catch (error) {
      toast.error("Ошибка при создании папки")
    }
  }

  const createDashboard = async () => {
    if (!newDashboardName.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user")

      const { data, error } = await supabase
        .from("monitoring_dashboards")
        .insert({ 
          name: newDashboardName, 
          folder_id: selectedFolderId,
          user_id: user.id 
        })
        .select()
        .single()

      if (error) throw error

      setDashboards([...dashboards, data])
      setNewDashboardName("")
      setIsDashboardDialogOpen(false)
      router.push(`/monitoring/board/${data.id}`)
      toast.success("Дашборд создан")
    } catch (error) {
      toast.error("Ошибка при создании дашборда")
    }
  }

  const deleteFolder = async (id: string) => {
    if (!confirm("Вы уверены? Все дашборды в этой папке будут перемещены в 'Общие'.")) return
    
    // First update dashboards to have null folder_id (General)
    // Note: On Delete Set Null in DB constraint handles this, but let's be safe/explicit if needed.
    // Actually the DB schema has "on delete set null", so we just delete the folder.
    
    try {
      const { error } = await supabase.from("monitoring_folders").delete().eq("id", id)
      if (error) throw error
      
      setFolders(folders.filter(f => f.id !== id))
      // Refetch dashboards as their folder_id might have changed to null
      fetchData()
      toast.success("Папка удалена")
    } catch (error) {
      toast.error("Ошибка удаления папки")
    }
  }

  const deleteDashboard = async (id: string) => {
    if (!confirm("Вы уверены?")) return

    try {
      const { error } = await supabase.from("monitoring_dashboards").delete().eq("id", id)
      if (error) throw error

      setDashboards(dashboards.filter(d => d.id !== id))
      if (pathname === `/monitoring/board/${id}`) {
        router.push("/monitoring")
      }
      toast.success("Дашборд удален")
    } catch (error) {
      toast.error("Ошибка удаления дашборда")
    }
  }

  // Group dashboards by folder
  const dashboardsByFolder = dashboards.reduce((acc, dashboard) => {
    const key = dashboard.folder_id || "general"
    if (!acc[key]) acc[key] = []
    acc[key].push(dashboard)
    return acc
  }, {} as Record<string, DashboardType[]>)

  return (
    <div className="w-64 border-r bg-muted/10 h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <span className="font-semibold text-sm text-muted-foreground">ДАШБОРДЫ</span>
        <div className="flex gap-1">
            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Новая папка">
                <Folder className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Создать папку</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                <Label htmlFor="folder-name">Название папки</Label>
                <Input 
                    id="folder-name" 
                    value={newFolderName} 
                    onChange={(e) => setNewFolderName(e.target.value)} 
                    placeholder="Моя папка"
                />
                </div>
                <DialogFooter>
                <Button onClick={createFolder}>Создать</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>

            <Dialog open={isDashboardDialogOpen} onOpenChange={setIsDashboardDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Новый дашборд" onClick={() => setSelectedFolderId(null)}>
                <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Создать дашборд</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                <div>
                    <Label htmlFor="dash-name">Название</Label>
                    <Input 
                    id="dash-name" 
                    value={newDashboardName} 
                    onChange={(e) => setNewDashboardName(e.target.value)} 
                    placeholder="Мой дашборд"
                    />
                </div>
                <div>
                    <Label htmlFor="dash-folder">Папка</Label>
                    <select 
                    id="dash-folder"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedFolderId || ""}
                    onChange={(e) => setSelectedFolderId(e.target.value || null)}
                    >
                    <option value="">Общие</option>
                    {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                    </select>
                </div>
                </div>
                <DialogFooter>
                <Button onClick={createDashboard}>Создать</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {/* General Dashboards (No Folder) */}
        {dashboardsByFolder["general"]?.map(dashboard => (
          <Link 
            key={dashboard.id} 
            href={`/monitoring/board/${dashboard.id}`}
            className={cn(
              "flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground group",
              pathname === `/monitoring/board/${dashboard.id}` && "bg-accent text-accent-foreground"
            )}
          >
            <div className="flex items-center truncate">
              <LayoutDashboard className="mr-2 h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate">{dashboard.name}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-red-600" onClick={() => deleteDashboard(dashboard.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Link>
        ))}

        {/* Folders */}
        {folders.map(folder => (
          <div key={folder.id}>
            <div 
              className="flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-accent/50 cursor-pointer group"
              onClick={() => toggleFolder(folder.id)}
            >
              <div className="flex items-center font-medium">
                {expandedFolders[folder.id] ? (
                  <ChevronDown className="mr-1 h-4 w-4 shrink-0 opacity-50" />
                ) : (
                  <ChevronRight className="mr-1 h-4 w-4 shrink-0 opacity-50" />
                )}
                <Folder className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                <span className="truncate">{folder.name}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFolderId(folder.id);
                        setIsDashboardDialogOpen(true);
                    }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить дашборд
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={(e) => {
                        e.stopPropagation();
                        deleteFolder(folder.id);
                    }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить папку
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {expandedFolders[folder.id] && (
              <div className="ml-4 pl-2 border-l space-y-1 mt-1">
                {dashboardsByFolder[folder.id]?.length > 0 ? (
                    dashboardsByFolder[folder.id]?.map(dashboard => (
                    <Link 
                        key={dashboard.id} 
                        href={`/monitoring/board/${dashboard.id}`}
                        className={cn(
                        "flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground group",
                        pathname === `/monitoring/board/${dashboard.id}` && "bg-accent text-accent-foreground"
                        )}
                    >
                        <div className="flex items-center truncate">
                        <LayoutDashboard className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                        <span className="truncate">{dashboard.name}</span>
                        </div>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteDashboard(dashboard.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </Link>
                    ))
                ) : (
                    <div className="px-2 py-1 text-xs text-muted-foreground italic">Пусто</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
