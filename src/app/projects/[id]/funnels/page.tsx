"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, TrendingDown, TrendingUp, Users, Target, ArrowRight } from "lucide-react"

interface FunnelStep {
  step_number: number
  event_name: string
  event_type?: string
  conditions?: Record<string, unknown>
}

interface Funnel {
  id: string
  name: string
  description?: string
  event_names: string[]
  steps: FunnelStep[]
  steps_count: number
  created_at: string
}

interface StepResult {
  step_number: number
  event_name: string
  users_count: number
  sessions_count: number
  events_count: number
  drop_off_rate: string | null
  conversion_rate: string
}

interface Analysis {
  date_range: { from: string; to: string }
  total_users: number
  completed_users: number
  overall_conversion: string
  step_results: StepResult[]
  timeline: Array<Record<string, unknown>>
}

export default function FunnelsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newFunnel, setNewFunnel] = useState({
    name: "",
    description: "",
    steps: [{ event_name: "" }, { event_name: "" }]
  })

  useEffect(() => {
    fetchFunnels()
  }, [projectId])

  const fetchFunnels = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/funnels?project_id=${projectId}`)
      const data = await response.json()
      setFunnels(data.funnels || [])
    } catch (error) {
      console.error("Error fetching funnels:", error)
    }
    setLoading(false)
  }

  const analyzeFunnel = async (funnelId: string) => {
    setAnalyzing(true)
    try {
      const response = await fetch(`/api/funnels/analyze?funnel_id=${funnelId}`)
      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (error) {
      console.error("Error analyzing funnel:", error)
    }
    setAnalyzing(false)
  }

  const createFunnel = async () => {
    if (newFunnel.steps.filter(s => s.event_name).length < 2) {
      return
    }

    try {
      const response = await fetch("/api/funnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newFunnel,
          event_names: newFunnel.steps.filter(s => s.event_name).map(s => s.event_name),
          project_id: projectId
        })
      })

      const data = await response.json()
      if (data.funnel) {
        setFunnels([...funnels, data.funnel])
        setCreateDialogOpen(false)
        setNewFunnel({ name: "", description: "", steps: [{ event_name: "" }, { event_name: "" }] })
      }
    } catch (error) {
      console.error("Error creating funnel:", error)
    }
  }

  const addStep = () => {
    setNewFunnel({
      ...newFunnel,
      steps: [...newFunnel.steps, { event_name: "" }]
    })
  }

  const removeStep = (index: number) => {
    if (newFunnel.steps.length > 2) {
      setNewFunnel({
        ...newFunnel,
        steps: newFunnel.steps.filter((_, i) => i !== index)
      })
    }
  }

  const updateStep = (index: number, value: string) => {
    const steps = [...newFunnel.steps]
    steps[index] = { ...steps[index], event_name: value }
    setNewFunnel({ ...newFunnel, steps })
  }

  const formatNumber = (num: number | string) => {
    if (typeof num === "string") return num
    return num.toLocaleString("ru-RU")
  }

  const getConversionColor = (rate: string) => {
    const r = parseFloat(rate)
    if (r >= 50) return "text-green-500"
    if (r >= 20) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Funnels</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Создать воронку
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Воронки</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : funnels.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-4">Нет воронок</p>
                  <Button onClick={() => setCreateDialogOpen(true)} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать первую
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {funnels.map((funnel) => (
                    <button
                      key={funnel.id}
                      onClick={() => {
                        setSelectedFunnel(funnel)
                        analyzeFunnel(funnel.id)
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedFunnel?.id === funnel.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium">{funnel.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {funnel.steps_count} шагов
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selectedFunnel ? (
            <Card>
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                Выберите воронку для анализа
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedFunnel.name}</CardTitle>
                  {selectedFunnel.description && (
                    <CardDescription>{selectedFunnel.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedFunnel.steps.map((step, index) => (
                      <div key={step.step_number} className="flex items-center">
                        <div className="bg-muted px-4 py-2 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">Шаг {step.step_number}</p>
                          <p className="font-medium">{step.event_name}</p>
                        </div>
                        {index < selectedFunnel.steps.length - 1 && (
                          <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {analyzing ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </CardContent>
                </Card>
              ) : analysis ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Всего пользователей</p>
                        </div>
                        <p className="text-2xl font-bold mt-2">{formatNumber(analysis.total_users)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Завершили</p>
                        </div>
                        <p className="text-2xl font-bold mt-2">{formatNumber(analysis.completed_users)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Общая конверсия</p>
                        </div>
                        <p className={`text-2xl font-bold mt-2 ${getConversionColor(analysis.overall_conversion)}`}>
                          {analysis.overall_conversion}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-5 h-5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Период</p>
                        </div>
                        <p className="text-sm font-medium mt-2">
                          {new Date(analysis.date_range.from).toLocaleDateString("ru-RU")} - {new Date(analysis.date_range.to).toLocaleDateString("ru-RU")}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Результаты по шагам</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analysis.step_results.map((step, index) => (
                          <div key={step.step_number}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{step.step_number}</Badge>
                                <span className="font-medium">{step.event_name}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                  {formatNumber(step.users_count)} пользователей
                                </span>
                                {step.conversion_rate && (
                                  <Badge className={getConversionColor(step.conversion_rate)}>
                                    {step.conversion_rate}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{
                                  width: index === 0 ? "100%" : `${parseFloat(step.conversion_rate)}%`
                                }}
                              />
                            </div>
                            {step.drop_off_rate && index > 0 && (
                              <p className="text-xs text-red-500 mt-1">
                                - {step.drop_off_rate}% отпало
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создать воронку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={newFunnel.name}
                onChange={(e) => setNewFunnel({ ...newFunnel, name: e.target.value })}
                placeholder="Например: Регистрация"
              />
            </div>
            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={newFunnel.description}
                onChange={(e) => setNewFunnel({ ...newFunnel, description: e.target.value })}
                placeholder="Описание воронки..."
              />
            </div>
            <div>
              <Label>Шаги воронки</Label>
              <p className="text-sm text-muted-foreground mb-2">Добавьте события, которые пользователь должен пройти</p>
              <div className="space-y-2">
                {newFunnel.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="outline" className="w-8">
                      {index + 1}
                    </Badge>
                    <Input
                      value={step.event_name}
                      onChange={(e) => updateStep(index, e.target.value)}
                      placeholder={`Событие ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                      disabled={newFunnel.steps.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={addStep}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить шаг
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={createFunnel} disabled={newFunnel.steps.filter(s => s.event_name).length < 2}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
