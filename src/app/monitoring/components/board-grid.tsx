"use client"

import { useState, useEffect, useCallback } from "react"
import { Responsive, WidthProvider } from "react-grid-layout/legacy"
import { createClient } from "@/utils/supabase/client"
import { DashboardData, DashboardWidget, WidgetType } from "../types"
import { Button } from "@/components/ui/button"
import { Settings, Trash2, Plus, Save, Activity, AreaChart as AreaChartIcon, BarChart3, Binary, List, Type } from "lucide-react"
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
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import debounce from "lodash/debounce"

import { ChartWidget } from "./widgets/chart-widget"
import { StatWidget } from "./widgets/stat-widget"
import { LogsWidget } from "./widgets/logs-widget"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const ResponsiveGridLayout = WidthProvider(Responsive)

interface BoardGridProps {
  dashboard: DashboardData
}

const WIDGET_TYPES: { id: WidgetType; label: string; icon: any; description: string }[] = [
  { id: 'chart-line', label: 'Линейный график', icon: Activity, description: 'График изменения показателей во времени' },
  { id: 'chart-area', label: 'Area Chart', icon: AreaChartIcon, description: 'График с заливкой области' },
  { id: 'chart-bar', label: 'Столбчатая диаграмма', icon: BarChart3, description: 'Сравнение показателей по категориям' },
  { id: 'stat', label: 'Статистика', icon: Binary, description: 'Одиночное значение метрики' },
  { id: 'logs', label: 'Логи', icon: List, description: 'Таблица последних событий' },
  { id: 'text', label: 'Текст', icon: Type, description: 'Текстовый блок или Markdown' },
]

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
    
    setLayout(updatedLayout)
  }

  const addWidget = () => {
    let w = 4
    let h = 4

    if (newWidgetType.startsWith('chart')) {
        w = 6
        h = 6
    } else if (newWidgetType === 'logs') {
        w = 12
        h = 8
    } else if (newWidgetType === 'stat') {
        w = 3
        h = 3
    }

    const newWidget: DashboardWidget = {
      i: `w-${Date.now()}`,
      x: 0,
      y: Infinity, // puts it at the bottom
      w,
      h,
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
    setNewWidgetType("text")
  }

  const removeWidget = (id: string) => {
    const newLayout = layout.filter(l => l.i !== id)
    setLayout(newLayout)
    saveLayout(newLayout)
  }

  const renderWidgetContent = (widget: DashboardWidget) => {
    // Backward compatibility for generic 'chart' type
    const type = widget.type === 'chart' ? 'chart-area' : widget.type

    switch (type) {
      case "text":
        return <div className="p-4 text-sm whitespace-pre-wrap">{widget.config.content}</div>
      case "chart-area":
      case "chart-line":
      case "chart-bar":
        return <ChartWidget 
            projectId={widget.config.projectId} 
            metric={widget.config.metric} 
            title={widget.config.title}
            type={type} 
        />
      case "stat":
        return <StatWidget projectId={widget.config.projectId} metric={widget.config.metric} />
      case "logs":
        return <LogsWidget projectId={widget.config.projectId} />
      default:
        // Fallback for generic 'chart' if missed above or other unknown types
        if (widget.type === 'chart' as any) {
             return <ChartWidget 
                projectId={widget.config.projectId} 
                metric={widget.config.metric} 
                title={widget.config.title}
                type="chart-area" 
            />
        }
        return <div>Unknown Widget: {widget.type}</div>
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold">{dashboard.name}</h1>
        <div className="flex gap-2">
            <Button onClick={() => saveLayout(layout)} variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Сохранить расположение
            </Button>
            <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
                <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить виджет
                </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Добавить виджет</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    
                    <div className="grid grid-cols-3 gap-4">
                        {WIDGET_TYPES.map((type) => {
                            const Icon = type.icon
                            return (
                                <Card 
                                    key={type.id} 
                                    className={cn(
                                        "cursor-pointer hover:border-primary transition-colors",
                                        newWidgetType === type.id ? "border-primary bg-primary/5" : ""
                                    )}
                                    onClick={() => setNewWidgetType(type.id)}
                                >
                                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                        <div className="p-2 rounded-full bg-background border">
                                            <Icon className="h-6 w-6 text-foreground" />
                                        </div>
                                        <div>
                                            <div className="font-semibold">{type.label}</div>
                                            <div className="text-xs text-muted-foreground">{type.description}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>Заголовок виджета</Label>
                            <Input value={newWidgetTitle} onChange={e => setNewWidgetTitle(e.target.value)} placeholder="Например: Ошибки за час" />
                        </div>

                        {newWidgetType === "text" && (
                        <div className="space-y-2">
                            <Label>Текст / Markdown</Label>
                            <Textarea value={newWidgetContent} onChange={e => setNewWidgetContent(e.target.value)} rows={5} />
                        </div>
                        )}

                        {(newWidgetType.startsWith('chart') || newWidgetType === "stat" || newWidgetType === "logs") && (
                            <div className="grid grid-cols-2 gap-4">
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
                                
                                {newWidgetType !== 'logs' && (
                                    <div className="space-y-2">
                                        <Label>Метрика</Label>
                                        <Select value={newWidgetMetric} onValueChange={setNewWidgetMetric}>
                                            <SelectTrigger>
                                            <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="latency">Время ответа (latency)</SelectItem>
                                                <SelectItem value="errors">Ошибки (status code)</SelectItem>
                                                <SelectItem value="requests">Количество запросов</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={addWidget} disabled={!newWidgetTitle}>Добавить</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="flex-1 bg-muted/10 rounded-lg border-2 border-dashed border-muted/20 relative min-h-[500px]">
        {layout.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                Добавьте первый виджет
            </div>
        )}
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          onLayoutChange={onLayoutChange}
          isDraggable
          isResizable
        >
          {layout.map((item) => (
            <div key={item.i} className="bg-background border rounded-lg shadow-sm overflow-hidden flex flex-col group relative">
                <div className="h-8 border-b bg-muted/40 flex items-center justify-between px-2 drag-handle cursor-move">
                    <span className="text-xs font-medium text-muted-foreground truncate">{item.config.title || "Widget"}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeWidget(item.i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    {renderWidgetContent(item)}
                </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  )
}
