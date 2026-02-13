"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, RefreshCw } from "lucide-react"

interface Heatmap {
  id: string
  name: string
  page_url: string
  device_type: string
  total_clicks: string
  total_scrolls: string
  created_at: string
}

interface ClickData {
  x: number
  y: number
  count: string
  element_selector: string
  element_text: string
}

interface ScrollData {
  depth_percentage: number
  views: string
}

export default function HeatmapPage() {
  const params = useParams()
  const projectId = params.id as string
  const [heatmaps, setHeatmaps] = useState<Heatmap[]>([])
  const [selectedHeatmap, setSelectedHeatmap] = useState<Heatmap | null>(null)
  const [clicks, setClicks] = useState<ClickData[]>([])
  const [scrolls, setScrolls] = useState<ScrollData[]>([])
  const [loading, setLoading] = useState(true)
  const [heatmapLoading, setHeatmapLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"clicks" | "scrolls" | "combined">("combined")

  useEffect(() => {
    fetchHeatmaps()
  }, [projectId])

  useEffect(() => {
    if (selectedHeatmap) {
      fetchHeatmapData(selectedHeatmap.id)
    }
  }, [selectedHeatmap])

  const fetchHeatmaps = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/heatmap?project_id=${projectId}`)
      const data = await response.json()
      setHeatmaps(data.heatmaps || [])
      if (data.heatmaps?.length > 0 && !selectedHeatmap) {
        setSelectedHeatmap(data.heatmaps[0])
      }
    } catch (error) {
      console.error("Error fetching heatmaps:", error)
    }
    setLoading(false)
  }

  const fetchHeatmapData = async (heatmapId: string) => {
    setHeatmapLoading(true)
    try {
      const response = await fetch(`/api/heatmap?heatmap_id=${heatmapId}`)
      const data = await response.json()
      setClicks(data.clicks || [])
      setScrolls(data.scrolls || [])
    } catch (error) {
      console.error("Error fetching heatmap data:", error)
    }
    setHeatmapLoading(false)
  }

  const getHeatColor = (count: number, maxCount: number) => {
    const ratio = maxCount > 0 ? count / maxCount : 0
    const hue = (1 - ratio) * 240
    return `hsla(${hue}, 100%, 50%, 0.7)`
  }

  const maxClickCount = Math.max(...clicks.map(c => parseInt(c.count) || 0), 1)

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Heatmaps</h1>
        <Button onClick={fetchHeatmaps} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Heatmaps</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : heatmaps.length === 0 ? (
                <p className="text-muted-foreground text-sm">Нет данных heatmap</p>
              ) : (
                <div className="space-y-2">
                  {heatmaps.map((heatmap) => (
                    <button
                      key={heatmap.id}
                      onClick={() => setSelectedHeatmap(heatmap)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedHeatmap?.id === heatmap.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium text-sm">{heatmap.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {heatmap.page_url}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                          {heatmap.device_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {heatmap.total_clicks} кликов
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedHeatmap ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Страница</p>
                    <p className="font-medium">{selectedHeatmap.page_url}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Устройство</p>
                    <p className="font-medium capitalize">{selectedHeatmap.device_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Всего кликов</p>
                    <p className="font-medium">{selectedHeatmap.total_clicks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Всего скроллов</p>
                    <p className="font-medium">{selectedHeatmap.total_scrolls}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Выберите heatmap</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedHeatmap ? selectedHeatmap.name : "Просмотр heatmap"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={viewMode} onValueChange={(v: "clicks" | "scrolls" | "combined") => setViewMode(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clicks">Клики</SelectItem>
                      <SelectItem value="scrolls">Скроллы</SelectItem>
                      <SelectItem value="combined">Комбинированный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedHeatmap ? (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  Выберите heatmap для просмотра
                </div>
              ) : heatmapLoading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="relative">
                  {(viewMode === "clicks" || viewMode === "combined") && clicks.length > 0 && (
                    <div className="relative bg-muted rounded-lg overflow-hidden" style={{ height: "600px" }}>
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <p className="text-lg font-medium">Карта кликов</p>
                          <p className="text-sm">{selectedHeatmap.page_url}</p>
                        </div>
                      </div>
                      {clicks.map((click, index) => (
                        <div
                          key={index}
                          className="absolute rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: click.x,
                            top: click.y,
                            width: Math.max(20, Math.min(100, Math.sqrt(parseInt(click.count)) * 10)),
                            height: Math.max(20, Math.min(100, Math.sqrt(parseInt(click.count)) * 10)),
                            backgroundColor: getHeatColor(parseInt(click.count), maxClickCount),
                            border: "2px solid white",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                          }}
                          title={`${click.element_text || click.element_selector}: ${click.count} кликов`}
                        />
                      ))}
                    </div>
                  )}

                  {(viewMode === "scrolls" || viewMode === "combined") && (
                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">Глубина скролла</h3>
                      <div className="space-y-2">
                        {scrolls.slice(0, 20).map((scroll, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <span className="text-sm w-16">{scroll.depth_percentage}%</span>
                            <div className="flex-1 h-8 bg-muted rounded overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                style={{
                                  width: `${Math.min(100, (parseInt(scroll.views) / Math.max(...scrolls.map(s => parseInt(s.views) || 0), 1)) * 100)}%`
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-16">
                              {scroll.views} просмотров
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {clicks.length === 0 && scrolls.length === 0 && (
                    <div className="flex items-center justify-center h-96 text-muted-foreground">
                      Нет данных для отображения
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {clicks.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Топ элементов по кликам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {clicks
                    .sort((a, b) => parseInt(b.count) - parseInt(a.count))
                    .slice(0, 10)
                    .map((click, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted"
                      >
                        <span className="text-sm font-medium w-8">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate font-medium">
                            {click.element_text || "Без текста"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {click.element_selector}
                          </p>
                        </div>
                        <span className="text-sm font-medium">
                          {click.count} кликов
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
