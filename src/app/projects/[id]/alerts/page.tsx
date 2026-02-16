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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Bell, Trash2, Edit2, CheckCircle2, AlertTriangle, AlertCircle, XCircle, RefreshCw } from "lucide-react"

interface Alert {
  id: string
  name: string
  description: string
  alert_type: string
  severity: string
  is_active: boolean
  trigger_count: number
  last_triggered_at: string
  channels: string[]
  trigger_count_total: string
  open_events_count: string
}

interface AlertEvent {
  id: string
  severity: string
  status: string
  created_at: string
  event_data: Record<string, unknown>
}

const alertTypes = [
  { value: "error", label: "Ошибки" },
  { value: "crash", label: "Крэши" },
  { value: "anr", label: "ANR (зависания)" },
  { value: "conversion_drop", label: "Падение конверсии" },
  { value: "performance", label: "Производительность" },
  { value: "custom", label: "Пользовательское" },
]

const severities = [
  { value: "info", label: "Информация", color: "bg-blue-500" },
  { value: "warning", label: "Предупреждение", color: "bg-yellow-500" },
  { value: "error", label: "Ошибка", color: "bg-red-500" },
  { value: "critical", label: "Критическая", color: "bg-red-700" },
]

const channels = [
  { value: "telegram", label: "Telegram", icon: "📱" },
  { value: "slack", label: "Slack", icon: "💬" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "webhook", label: "Webhook", icon: "🔗" },
]

export default function AlertsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)

  const [newAlert, setNewAlert] = useState({
    name: "",
    description: "",
    alert_type: "error",
    severity: "warning",
    threshold: 1,
    comparison_operator: "greater_than",
    time_window: 5,
    channels: [] as string[],
    telegram_chat_id: "",
    slack_webhook_url: "",
    email_recipients: [] as string[],
    webhook_url: "",
    condition: {} as Record<string, unknown>,
  })

  useEffect(() => {
    fetchAlerts()
  }, [projectId])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/alerts?project_id=${projectId}`)
      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error("Error fetching alerts:", error)
    }
    setLoading(false)
  }

  const fetchAlertDetails = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts?id=${alertId}&project_id=${projectId}`)
      const data = await response.json()
      setSelectedAlert(data.alert)
      setAlertEvents(data.recent_events || [])
    } catch (error) {
      console.error("Error fetching alert details:", error)
    }
  }

  const createAlert = async () => {
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAlert,
          email_recipients: newAlert.email_recipients.filter(e => e),
          project_id: projectId,
        }),
      })

      const data = await response.json()
      if (data.alert) {
        setAlerts([...alerts, data.alert])
        setCreateDialogOpen(false)
        resetNewAlert()
      }
    } catch (error) {
      console.error("Error creating alert:", error)
    }
  }

  const updateAlert = async () => {
    if (!editingAlert) return

    try {
      const response = await fetch(`/api/alerts?id=${editingAlert.id}&project_id=${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAlert,
          email_recipients: newAlert.email_recipients.filter(e => e),
        }),
      })

      const data = await response.json()
      if (data.alert) {
        setAlerts(alerts.map(a => a.id === data.alert.id ? data.alert : a))
        setEditingAlert(null)
        setCreateDialogOpen(false)
        resetNewAlert()
      }
    } catch (error) {
      console.error("Error updating alert:", error)
    }
  }

  const deleteAlert = async (alertId: string) => {
    if (!confirm("Удалить этот алерт?")) return

    try {
      await fetch(`/api/alerts?id=${alertId}&project_id=${projectId}`, {
        method: "DELETE",
      })
      setAlerts(alerts.filter(a => a.id !== alertId))
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null)
      }
    } catch (error) {
      console.error("Error deleting alert:", error)
    }
  }

  const toggleAlert = async (alert: Alert) => {
    try {
      const response = await fetch(`/api/alerts?id=${alert.id}&project_id=${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !alert.is_active }),
      })

      const data = await response.json()
      if (data.alert) {
        setAlerts(alerts.map(a => a.id === data.alert.id ? data.alert : a))
      }
    } catch (error) {
      console.error("Error toggling alert:", error)
    }
  }

  const resetNewAlert = () => {
    setNewAlert({
      name: "",
      description: "",
      alert_type: "error",
      severity: "warning",
      threshold: 1,
      comparison_operator: "greater_than",
      time_window: 5,
      channels: [],
      telegram_chat_id: "",
      slack_webhook_url: "",
      email_recipients: [],
      webhook_url: "",
      condition: {},
    })
  }

  const openEditDialog = (alert: Alert) => {
    setEditingAlert(alert)
    setNewAlert({
      name: alert.name,
      description: alert.description || "",
      alert_type: alert.alert_type,
      severity: alert.severity,
      threshold: 1,
      comparison_operator: "greater_than",
      time_window: 5,
      channels: alert.channels || [],
      telegram_chat_id: "",
      slack_webhook_url: "",
      email_recipients: [],
      webhook_url: "",
      condition: {},
    })
    setCreateDialogOpen(true)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "info": return <CheckCircle2 className="w-4 h-4 text-blue-500" />
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case "error": return <AlertCircle className="w-4 h-4 text-red-500" />
      case "critical": return <XCircle className="w-4 h-4 text-red-700" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "info": return "bg-blue-100 text-blue-800"
      case "warning": return "bg-yellow-100 text-yellow-800"
      case "error": return "bg-red-100 text-red-800"
      case "critical": return "bg-red-200 text-red-900"
      default: return "bg-gray-100"
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Alerts</h1>
        <div className="flex items-center gap-2">
          <Button onClick={fetchAlerts} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          <Button onClick={() => {
            setEditingAlert(null)
            resetNewAlert()
            setCreateDialogOpen(true)
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Создать алерт
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Активные алерты</CardTitle>
              <CardDescription>{alerts.filter(a => a.is_active).length} из {alerts.length} активны</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-4">Нет алертов</p>
                  <Button onClick={() => setCreateDialogOpen(true)} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать первый
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => fetchAlertDetails(alert.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAlert?.id === alert.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(alert.severity)}
                          <span className="font-medium">{alert.name}</span>
                        </div>
                        <Switch
                          checked={alert.is_active}
                          onCheckedChange={() => toggleAlert(alert)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {alertTypes.find(t => t.value === alert.alert_type)?.label || alert.alert_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {alert.trigger_count_total} срабатываний
                        </span>
                        {parseInt(alert.open_events_count) > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {alert.open_events_count} открытых
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedAlert ? (
            <Card>
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                Выберите алерт для просмотра деталей
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{selectedAlert.name}</CardTitle>
                        <Badge className={getSeverityColor(selectedAlert.severity)}>
                          {selectedAlert.severity}
                        </Badge>
                      </div>
                      {selectedAlert.description && (
                        <CardDescription className="mt-1">{selectedAlert.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(selectedAlert)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => deleteAlert(selectedAlert.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Тип</p>
                      <p className="font-medium">
                        {alertTypes.find(t => t.value === selectedAlert.alert_type)?.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Срабатываний</p>
                      <p className="font-medium">{selectedAlert.trigger_count_total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Последнее</p>
                      <p className="font-medium">
                        {selectedAlert.last_triggered_at
                          ? new Date(selectedAlert.last_triggered_at).toLocaleString("ru-RU")
                          : "Никогда"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Каналы</p>
                      <div className="flex gap-1">
                        {(selectedAlert.channels || []).map((ch) => (
                          <span key={ch} className="text-lg">
                            {channels.find(c => c.value === ch)?.icon}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Последние события</CardTitle>
                </CardHeader>
                <CardContent>
                  {alertEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Нет событий</p>
                  ) : (
                    <div className="space-y-2">
                      {alertEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(event.severity)}
                            <Badge variant={event.status === "open" ? "destructive" : "outline"}>
                              {event.status}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.created_at).toLocaleString("ru-RU")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAlert ? "Редактировать алерт" : "Создать алерт"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={newAlert.name}
                onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                placeholder="Например: Ошибки API > 10 в минуту"
              />
            </div>
            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={newAlert.description}
                onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                placeholder="Описание условия срабатывания..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тип алерта *</Label>
                <Select
                  value={newAlert.alert_type}
                  onValueChange={(v) => setNewAlert({ ...newAlert, alert_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {alertTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Важность *</Label>
                <Select
                  value={newAlert.severity}
                  onValueChange={(v) => setNewAlert({ ...newAlert, severity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severities.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <Label className="font-semibold">Каналы уведомлений</Label>
              <div className="grid grid-cols-2 gap-4">
                {channels.map((ch) => (
                  <div key={ch.value} className="flex items-center space-x-2">
                    <Switch
                      checked={newAlert.channels.includes(ch.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewAlert({ ...newAlert, channels: [...newAlert.channels, ch.value] })
                        } else {
                          setNewAlert({ ...newAlert, channels: newAlert.channels.filter(c => c !== ch.value) })
                        }
                      }}
                    />
                    <span className="text-lg">{ch.icon}</span>
                    <span>{ch.label}</span>
                  </div>
                ))}
              </div>

              {newAlert.channels.includes("telegram") && (
                <div>
                  <Label>Telegram Chat ID</Label>
                  <Input
                    value={newAlert.telegram_chat_id}
                    onChange={(e) => setNewAlert({ ...newAlert, telegram_chat_id: e.target.value })}
                    placeholder="@channel_name или -1001234567890"
                  />
                </div>
              )}

              {newAlert.channels.includes("slack") && (
                <div>
                  <Label>Slack Webhook URL</Label>
                  <Input
                    value={newAlert.slack_webhook_url}
                    onChange={(e) => setNewAlert({ ...newAlert, slack_webhook_url: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
              )}

              {newAlert.channels.includes("email") && (
                <div>
                  <Label>Email адреса (через запятую)</Label>
                  <Input
                    value={newAlert.email_recipients.join(", ")}
                    onChange={(e) => setNewAlert({
                      ...newAlert,
                      email_recipients: e.target.value.split(",").map(e => e.trim())
                    })}
                    placeholder="admin@example.com, dev@example.com"
                  />
                </div>
              )}

              {newAlert.channels.includes("webhook") && (
                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={newAlert.webhook_url}
                    onChange={(e) => setNewAlert({ ...newAlert, webhook_url: e.target.value })}
                    placeholder="https://your-app.com/webhook"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={editingAlert ? updateAlert : createAlert}
              disabled={!newAlert.name || newAlert.channels.length === 0}
            >
              {editingAlert ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
