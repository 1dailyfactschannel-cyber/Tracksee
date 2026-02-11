"use client"

import { useState, useEffect, useCallback } from "react"
import { Responsive, WidthProvider, Layout } from "react-grid-layout/legacy"
import { DashboardData, DashboardWidget } from "../types"
import { Button } from "@/components/ui/button"
import { 
  Trash2, 
  Plus, 
  Save, 
  Activity, 
  AreaChart as AreaChartIcon, 
  BarChart3, 
  RefreshCw,
} from "lucide-react"
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
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { ChartWidget } from "./widgets/chart-widget"
import { StatWidget } from "./widgets/stat-widget"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const ResponsiveGridLayout = WidthProvider(Responsive)

interface BoardGridProps {
  dashboard: DashboardData
}

const METRICS = [
  { id: 'visitors', label: 'Посетители' },
  { id: 'requests', label: 'Запросы' },
  { id: 'auths', label: 'Авторизации' },
  { id: 'errors', label: 'Ошибки' },
  { id: 'avg_duration', label: 'Время на сайте' },
]

const PERIODS = [
  { id: '1h', label: '1 час' },
  { id: '24h', label: '24 часа' },
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
]

export function BoardGrid({ dashboard }: BoardGridProps) {
  const [layout, setLayout] = useState<DashboardWidget[]>(dashboard.layout || [])
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(dashboard.refresh_interval || 30)
  
  // New Widget State
  const [newWidgetTitle, setNewWidgetTitle] = useState("")
  const [newWidgetMetric, setNewWidgetMetric] = useState<DashboardWidget['config']['metric']>("visitors")
  const [newWidgetVariant, setNewWidgetVariant] = useState<DashboardWidget['config']['variant']>("area")
  const [newWidgetPeriod, setNewWidgetPeriod] = useState<DashboardWidget['config']['period']>("1h")
  const [newWidgetShowAs, setNewWidgetShowAs] = useState<DashboardWidget['config']['showAs']>("chart")

  useEffect(() => {
    if (dashboard.refresh_interval) {
      setRefreshInterval(dashboard.refresh_interval)
    }
    if (dashboard.layout) {
      setLayout(dashboard.layout)
    }
  }, [dashboard.refresh_interval, dashboard.layout])

  // Save layout to DB
  const saveDashboard = useCallback(
    async (newLayout: DashboardWidget[], newInterval?: number) => {
      try {
        const res = await fetch("/api/dashboards", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: dashboard.id,
            layout: newLayout,
            refresh_interval: newInterval !== undefined ? newInterval : refreshInterval,
          }),
        })

        if (!res.ok) throw new Error("Failed to save")
        toast.success("Дашборд сохранен")
      } catch {
        toast.error("Ошибка сохранения")
      }
    },
    [dashboard.id, refreshInterval]
  )

  const onLayoutChange = (currentLayout: Layout[]) => {
    const updatedLayout = currentLayout.map((item) => {
      const existing = layout.find(l => l.i === item.i)
      if (!existing) return null;
      return {
        ...existing,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      } as DashboardWidget
    }).filter(Boolean) as DashboardWidget[]
    
    setLayout(updatedLayout)
  }

  // Advanced export: CSV for entire dashboard and quick PDF export (via print)
  const exportDashboardCSV = async () => {
    try {
      const header = 'Widget,Time,Value\n'
      const lines: string[] = [header]
      for (const w of layout) {
        const widgetName = w.config.title || METRICS.find(m => m.id === w.config.metric)?.label || 'Widget'
        const res = await fetch(`/api/events?projectId=${dashboard.project_id}&metric=${w.config.metric}&period=${w.config.period}`)
        if (!res.ok) {
          continue
        }
        const data = await res.json()
        if (Array.isArray(data)) {
          data.forEach((row: any) => {
            lines.push(`${widgetName},${row.time},${row.value}`)
          })
        }
        // add a separator line between widgets for readability
        lines.push('\n')
      }
      const csv = lines.filter(l => l !== '').join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dashboard_${dashboard.id}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Ошибка экспорта CSV')
    }
  }

  const exportPDF = () => {
    window.print()
  }

  const addWidget = () => {
    let w = 4
    let h = 4

    if (newWidgetShowAs === 'chart') {
        w = 6
        h = 6
    } else {
        w = 3
        h = 3
    }

    const newWidget: DashboardWidget = {
      i: `w-${Date.now()}`,
      x: 0,
      y: Infinity, // puts it at the bottom
      w,
      h,
      config: {
        title: newWidgetTitle || METRICS.find(m => m.id === newWidgetMetric)?.label,
        metric: newWidgetMetric,
        variant: newWidgetVariant,
        period: newWidgetPeriod,
        showAs: newWidgetShowAs,
      }
    }

    const newLayout = [...layout, newWidget]
    setLayout(newLayout)
    saveDashboard(newLayout)
    setIsAddWidgetOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setNewWidgetTitle("")
    setNewWidgetMetric("visitors")
    setNewWidgetVariant("area")
    setNewWidgetPeriod("1h")
    setNewWidgetShowAs("chart")
  }

  const removeWidget = (id: string) => {
    const newLayout = layout.filter(l => l.i !== id)
    setLayout(newLayout)
    saveDashboard(newLayout)
  }

  const renderWidgetContent = (widget: DashboardWidget) => {
    if (widget.config.showAs === 'number') {
      return (
        <StatWidget 
          projectId={dashboard.project_id} 
          metric={widget.config.metric} 
          period={widget.config.period}
          refreshInterval={refreshInterval}
        />
      )
    }

    return (
      <ChartWidget 
        projectId={dashboard.project_id} 
        metric={widget.config.metric} 
        variant={widget.config.variant}
        period={widget.config.period}
        refreshInterval={refreshInterval}
      />
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <Select 
              value={refreshInterval.toString()} 
              onValueChange={(val) => {
                const interval = parseInt(val)
                setRefreshInterval(interval)
                saveDashboard(layout, interval)
              }}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Обновление: 10с</SelectItem>
                <SelectItem value="30">Обновление: 30с</SelectItem>
                <SelectItem value="60">Обновление: 1м</SelectItem>
                <SelectItem value="300">Обновление: 5м</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 items-center">
            <Button onClick={() => saveDashboard(layout)} variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Сохранить
            </Button>
            <Button onClick={exportDashboardCSV} variant="outline" aria-label="Экспорт CSV дашборда">
              CSV-экспорт
            </Button>
            <Button onClick={exportPDF} variant="outline" aria-label="Печать дашборда">
              Экспорт PDF
            </Button>
            <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
                <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить виджет
                </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Добавить виджет</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Заголовок (необязательно)</Label>
                            <Input value={newWidgetTitle} onChange={e => setNewWidgetTitle(e.target.value)} placeholder="Например: Посетители за час" />
                        </div>
                        <div className="space-y-2">
                            <Label>Метрика</Label>
                            <Select value={newWidgetMetric} onValueChange={(val: any) => setNewWidgetMetric(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {METRICS.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Период</Label>
                            <Select value={newWidgetPeriod} onValueChange={(val: any) => setNewWidgetPeriod(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PERIODS.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Отображение</Label>
                            <Tabs value={newWidgetShowAs} onValueChange={(val: any) => setNewWidgetShowAs(val)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="number">Число</TabsTrigger>
                                    <TabsTrigger value="chart">График</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>

                    {newWidgetShowAs === 'chart' && (
                        <div className="space-y-2">
                            <Label>Тип графика</Label>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { id: 'line', label: 'Линии', icon: Activity },
                                    { id: 'area', label: 'Волны', icon: AreaChartIcon },
                                    { id: 'bar', label: 'Блоки', icon: BarChart3 },
                                ].map((v) => (
                                    <Card 
                                        key={v.id} 
                                        className={cn(
                                            "cursor-pointer hover:border-primary transition-colors",
                                            newWidgetVariant === v.id ? "border-primary bg-primary/5" : ""
                                        )}
                                        onClick={() => setNewWidgetVariant(v.id as any)}
                                    >
                                        <CardContent className="p-4 flex flex-col items-center gap-2">
                                            <v.icon className="h-6 w-6" />
                                            <span className="text-xs font-medium">{v.label}</span>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={addWidget}>Добавить</Button>
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
          layouts={{ lg: layout as any }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          onLayoutChange={onLayoutChange}
          draggableHandle=".drag-handle"
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
