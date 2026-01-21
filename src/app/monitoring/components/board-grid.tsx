"use client"

import { useState, useEffect, useCallback } from "react"
import { Responsive, WidthProvider } from "react-grid-layout"
import { createClient } from "@/utils/supabase/client"
import { DashboardData, DashboardWidget, WidgetType } from "../types"
import { Button } from "@/components/ui/button"
import { Settings, Trash2, Plus, Save } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import debounce from "lodash/debounce"

import { ChartWidget } from "./widgets/chart-widget"
import { StatWidget } from "./widgets/stat-widget"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const ResponsiveGridLayout = WidthProvider(Responsive)

interface BoardGridProps {
  dashboard: DashboardData
}

export function BoardGrid({ dashboard }: BoardGridProps) {
  const [layout, setLayout] = useState<DashboardWidget[]>(dashboard.layout || [])
  const [projects, setProjects] = useState<any[]>([])
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false)
  
  // New Widget State
  const [newWidgetType, setNewWidgetType] = useState<WidgetType>("text")
  const [newWidgetTitle, setNewWidgetTitle] = useState("")
  const [newWidgetContent, setNewWidgetContent] = useState("")
  const [newWidgetProjectId, setNewWidgetProjectId] = useState<string>("")
  const [newWidgetMetric, setNewWidgetMetric] = useState<string>("latency")

  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, name")
    if (data) setProjects(data)
  }

  // Save layout to DB
  const saveLayout = useCallback(
    async (newLayout: DashboardWidget[]) => {
      try {
        const { error } = await supabase
          .from("monitoring_dashboards")
          .update({ layout: newLayout, updated_at: new Date().toISOString() })
          .eq("id", dashboard.id)

        if (error) throw error
        toast.success("Дашборд сохранен")
      } catch (error) {
        toast.error("Ошибка сохранения")
      }
    },
    [dashboard.id, supabase]
  )

  const onLayoutChange = (currentLayout: any) => {
    const updatedLayout = currentLayout.map((item: any) => {
      const existing = layout.find(l => l.i === item.i)
      return {
        ...existing,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      } as DashboardWidget
    })
    
    // Only save if dimensions/positions actually changed and it's not just a render cycle
    // For simplicity we just update local state here, and rely on explicit Save button or debounce?
    // User expects "Save" button usually for dashboards, or auto-save.
    // Let's just update local state.
    setLayout(updatedLayout)
  }

  const addWidget = () => {
    const newWidget: DashboardWidget = {
      i: `w-${Date.now()}`,
      x: 0,
      y: Infinity, 
      w: newWidgetType === "chart" ? 6 : 4,
      h: newWidgetType === "chart" ? 6 : 4,
      type: newWidgetType,
      config: {
        title: newWidgetTitle,
        content: newWidgetContent,
        projectId: newWidgetProjectId,
        metric: newWidgetMetric as any
      }
    }

    const newLayout = [...layout, newWidget]
    setLayout(newLayout)
    saveLayout(newLayout)
    setIsAddWidgetOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setNewWidgetTitle("")
    setNewWidgetContent("")
    setNewWidgetProjectId("")
    setNewWidgetMetric("latency")
  }

  const removeWidget = (id: string) => {
    const newLayout = layout.filter(l => l.i !== id)
    setLayout(newLayout)
    saveLayout(newLayout)
  }

  const renderWidgetContent = (widget: DashboardWidget) => {
    switch (widget.type) {
      case "text":
        return <div className="p-4 text-sm whitespace-pre-wrap">{widget.config.content}</div>
      case "chart":
        return <ChartWidget projectId={widget.config.projectId} metric={widget.config.metric} title={widget.config.title} />
      case "stat":
        return <StatWidget projectId={widget.config.projectId} metric={widget.config.metric} />
      default:
        return <div>Unknown Widget</div>
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold">{dashboard.name}</h1>
        <div className="flex gap-2">
          <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Добавить виджет
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить виджет</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Тип</Label>
                  <Select value={newWidgetType} onValueChange={(v) => setNewWidgetType(v as WidgetType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Текст</SelectItem>
                      <SelectItem value="chart">График (Area)</SelectItem>
                      <SelectItem value="stat">Статистика (Single Value)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Заголовок</Label>
                  <Input value={newWidgetTitle} onChange={e => setNewWidgetTitle(e.target.value)} />
                </div>

                {newWidgetType === "text" && (
                  <div className="space-y-2">
                    <Label>Текст / Markdown</Label>
                    <Textarea value={newWidgetContent} onChange={e => setNewWidgetContent(e.target.value)} />
                  </div>
                )}

                {(newWidgetType === "chart" || newWidgetType === "stat") && (
                    <>
                        <div className="space-y-2">
                            <Label>Проект</Label>
                            <Select value={newWidgetProjectId} onValueChange={setNewWidgetProjectId}>
                                <SelectTrigger>
                                <SelectValue placeholder="Выберите проект" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Метрика</Label>
                            <Select value={newWidgetMetric} onValueChange={setNewWidgetMetric}>
                                <SelectTrigger>
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="latency">Задержка (Latency)</SelectItem>
                                    <SelectItem value="status">Код статуса</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}
              </div>
              <DialogFooter>
                <Button onClick={addWidget}>Добавить</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={() => saveLayout(layout)}>
            <Save className="mr-2 h-4 w-4" />
            Сохранить
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/5 p-4 rounded-lg border">
        <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={40}
            onLayoutChange={onLayoutChange}
            draggableHandle=".drag-handle"
        >
            {layout.map((widget) => (
            <div key={widget.i} className="bg-card border rounded-md shadow-sm overflow-hidden flex flex-col">
                <div className="drag-handle p-2 border-b bg-muted/30 cursor-move flex justify-between items-center h-8 shrink-0">
                <span className="font-medium text-xs px-2 truncate">{widget.config.title || "Widget"}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeWidget(widget.i)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                </Button>
                </div>
                <div className="flex-1 overflow-hidden relative">
                {renderWidgetContent(widget)}
                </div>
            </div>
            ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  )
}
