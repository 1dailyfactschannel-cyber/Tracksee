"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Users, Calendar, TrendingDown, RefreshCw } from "lucide-react"

interface Cohort {
  id: string
  name: string
  description: string
  cohort_type: string
  time_interval: string
  member_count: string
  max_period: number
  created_at: string
}

interface RetentionData {
  period_start: string
  period_number: number
  total_users: number
  retained_users: number
  retention_rate: string
}

export default function CohortsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null)
  const [retentionData, setRetentionData] = useState<RetentionData[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [newCohort, setNewCohort] = useState({
    name: "",
    description: "",
    cohort_type: "signup",
    time_interval: "week",
    event_name: ""
  })

  useEffect(() => {
    fetchCohorts()
  }, [projectId])

  const fetchCohorts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/cohorts?project_id=${projectId}`)
      const data = await response.json()
      setCohorts(data.cohorts || [])
    } catch (error) {
      console.error("Error fetching cohorts:", error)
    }
    setLoading(false)
  }

  const fetchCohortDetails = async (cohortId: string) => {
    setAnalyzing(true)
    try {
      const response = await fetch(`/api/cohorts?id=${cohortId}&project_id=${projectId}`)
      const data = await response.json()
      setSelectedCohort(data.cohort)
      setRetentionData(data.retention_data || [])
    } catch (error) {
      console.error("Error fetching cohort details:", error)
    }
    setAnalyzing(false)
  }

  const createCohort = async () => {
    if (!newCohort.name || !newCohort.event_name) return

    try {
      const response = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCohort,
          project_id: projectId
        })
      })

      const data = await response.json()
      if (data.cohort) {
        setCohorts([...cohorts, data.cohort])
        setCreateDialogOpen(false)
        setNewCohort({
          name: "",
          description: "",
          cohort_type: "signup",
          time_interval: "week",
          event_name: ""
        })
      }
    } catch (error) {
      console.error("Error creating cohort:", error)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  const getRetentionColor = (rate: string) => {
    const r = parseFloat(rate)
    if (r >= 50) return "bg-green-500"
    if (r >= 25) return "bg-yellow-500"
    if (r >= 10) return "bg-orange-500"
    return "bg-red-500"
  }

  const getRetentionTextColor = (rate: string) => {
    const r = parseFloat(rate)
    if (r >= 50) return "text-green-500"
    if (r >= 25) return "text-yellow-500"
    if (r >= 10) return "text-orange-500"
    return "text-red-500"
  }

  const periods = [0, 1, 2, 3, 4, 6, 8, 12]
  const intervalLabels: Record<string, string> = {
    day: "дней",
    week: "недель",
    month: "месяцев"
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Cohort Analysis</h1>
        <div className="flex items-center gap-2">
          <Button onClick={fetchCohorts} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Создать когорту
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Когорты</CardTitle>
              <CardDescription>{cohorts.length} когорт</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : cohorts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-4">Нет когорт</p>
                  <Button onClick={() => setCreateDialogOpen(true)} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать когорту
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {cohorts.map((cohort) => (
                    <button
                      key={cohort.id}
                      onClick={() => {
                        setSelectedCohort(cohort)
                        fetchCohortDetails(cohort.id)
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedCohort?.id === cohort.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium">{cohort.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {cohort.cohort_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {cohort.member_count} чел.
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selectedCohort ? (
            <Card>
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                Выберите когорту для анализа
              </CardContent>
            </Card>
          ) : analyzing ? (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedCohort.name}</CardTitle>
                      {selectedCohort.description && (
                        <CardDescription>{selectedCohort.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedCohort.cohort_type}</Badge>
                      <Badge variant="outline">{selectedCohort.time_interval}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Участников</p>
                      <p className="text-2xl font-bold">{selectedCohort.member_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Периодов</p>
                      <p className="text-2xl font-bold">{selectedCohort.max_period || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Тип</p>
                      <p className="text-2xl font-bold capitalize">{selectedCohort.cohort_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Интервал</p>
                      <p className="text-2xl font-bold">{selectedCohort.time_interval}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Retention Matrix</CardTitle>
                  <CardDescription>
                    Процент пользователей, вернувшихся в каждый период
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {retentionData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="text-left p-2 border-b">Период</th>
                            <th className="text-left p-2 border-b">Пользователей</th>
                            {periods.slice(0, Math.min(6, selectedCohort.max_period + 1)).map((p) => (
                              <th key={p} className="text-center p-2 border-b">
                                {p === 0 ? "Начало" : `${p} ${intervalLabels[selectedCohort.time_interval] || ""}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const groupedData = new Map()
                            retentionData.forEach((d) => {
                              const key = d.period_start
                              if (!groupedData.has(key)) {
                                groupedData.set(key, { date: key, data: new Map() })
                              }
                              groupedData.get(key).data.set(d.period_number, d)
                            })

                            return Array.from(groupedData.entries())
                              .slice(0, 10)
                              .map(([key, group]) => {
                                const rowData = group.data as Map<number, RetentionData>
                                const firstPeriod = rowData.get(0)
                                return (
                                  <tr key={key}>
                                    <td className="p-2 border-b font-medium">
                                      {formatDate(group.date)}
                                    </td>
                                    <td className="p-2 border-b">
                                      {firstPeriod?.total_users || 0}
                                    </td>
                                    {periods.slice(0, Math.min(6, selectedCohort.max_period + 1)).map((p) => {
                                      const data = rowData.get(p)
                                      return (
                                        <td key={p} className="p-2 border-b text-center">
                                          {data ? (
                                            <div className="flex flex-col items-center">
                                              <div
                                                className={`w-12 h-8 rounded flex items-center justify-center text-white text-xs font-medium ${getRetentionColor(data.retention_rate)}`}
                                              >
                                                {data.retention_rate}%
                                              </div>
                                              <span className="text-xs text-muted-foreground mt-1">
                                                {data.retained_users}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                )
                              })
                          })()}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Нет данных retention. Создайте когорту с событием для отслеживания.
                    </p>
                  )}
                </CardContent>
              </Card>

              {retentionData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>График Retention</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end gap-1">
                      {retentionData
                        .filter((d) => d.period_number <= 12)
                        .sort((a, b) => a.period_number - b.period_number)
                        .map((data, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div
                              className={`w-full rounded-t ${getRetentionColor(data.retention_rate)}`}
                              style={{
                                height: `${Math.max(4, parseFloat(data.retention_rate))}px`,
                                minHeight: "4px"
                              }}
                            />
                            <span className="text-xs mt-1">{data.period_number}</span>
                          </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded" />
                        <span className="text-sm">≥50%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded" />
                        <span className="text-sm">25-50%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500 rounded" />
                        <span className="text-sm">10-25%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded" />
                        <span className="text-sm">&lt;10%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать когорту</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={newCohort.name}
                onChange={(e) => setNewCohort({ ...newCohort, name: e.target.value })}
                placeholder="Например: Пользователи January 2024"
              />
            </div>
            <div>
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                value={newCohort.description}
                onChange={(e) => setNewCohort({ ...newCohort, description: e.target.value })}
                placeholder="Описание когорты..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тип когорты</Label>
                <Select
                  value={newCohort.cohort_type}
                  onValueChange={(v) => setNewCohort({ ...newCohort, cohort_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signup">По регистрации</SelectItem>
                    <SelectItem value="first_visit">По первому визиту</SelectItem>
                    <SelectItem value="purchase">По покупке</SelectItem>
                    <SelectItem value="custom">По событию</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Интервал</Label>
                <Select
                  value={newCohort.time_interval}
                  onValueChange={(v) => setNewCohort({ ...newCohort, time_interval: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Дни</SelectItem>
                    <SelectItem value="week">Недели</SelectItem>
                    <SelectItem value="month">Месяцы</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="event_name">Событие для отслеживания</Label>
              <Input
                id="event_name"
                value={newCohort.event_name}
                onChange={(e) => setNewCohort({ ...newCohort, event_name: e.target.value })}
                placeholder="Например: page_view, signup, purchase"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Retention будет отслеживать возвращение пользователей по этому событию
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={createCohort} disabled={!newCohort.name || !newCohort.event_name}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
