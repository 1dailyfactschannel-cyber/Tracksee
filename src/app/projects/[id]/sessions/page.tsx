"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw, Monitor, Smartphone, Tablet } from "lucide-react"

interface Session {
  id: string
  session_id: string
  user_id: string
  browser: string
  os: string
  device_type: string
  screen_width: number
  screen_height: number
  url: string
  duration: number
  started_at: string
  status: string
  events_count: number
  total_events: string
}

interface SessionEvent {
  id: string
  event_type: string
  timestamp: number
  data: Record<string, unknown>
}

export default function SessionsPage() {
  const params = useParams()
  const projectId = params.id as string
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [muted, setMuted] = useState(false)
  const playbackRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [projectId])

  useEffect(() => {
    if (selectedSession) {
      fetchSessionEvents(selectedSession.id)
    }
  }, [selectedSession])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/sessions?project_id=${projectId}`)
      const data = await response.json()
      setSessions(data.sessions || [])
      if (data.sessions?.length > 0 && !selectedSession) {
        setSelectedSession(data.sessions[0])
      }
    } catch (error) {
      console.error("Error fetching sessions:", error)
    }
    setLoading(false)
  }

  const fetchSessionEvents = async (recordingId: string) => {
    setEventsLoading(true)
    try {
      const response = await fetch(`/api/sessions/events?recording_id=${recordingId}&limit=5000`)
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error("Error fetching events:", error)
    }
    setEventsLoading(false)
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="w-4 h-4" />
      case "tablet":
        return <Tablet className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  const getEventColor = (eventType: string) => {
    if (eventType.includes("click")) return "bg-blue-500"
    if (eventType.includes("scroll")) return "bg-green-500"
    if (eventType.includes("key")) return "bg-yellow-500"
    if (eventType.includes("input")) return "bg-purple-500"
    if (eventType.includes("mutation")) return "bg-orange-500"
    if (eventType.includes("error")) return "bg-red-500"
    return "bg-gray-500"
  }

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("click")) return "🖱️"
    if (eventType.includes("scroll")) return "📜"
    if (eventType.includes("key")) return "⌨️"
    if (eventType.includes("input")) return "✏️"
    if (eventType.includes("mutation")) return "🔄"
    if (eventType.includes("error")) return "❌"
    return "📌"
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Session Recordings</h1>
        <Button onClick={fetchSessions} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Записи сессий</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Нет записей сессий</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setSelectedSession(session)
                        setCurrentTime(0)
                        setIsPlaying(false)
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedSession?.id === session.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getDeviceIcon(session.device_type)}
                        <span className="font-medium text-sm">{session.browser}</span>
                        <span className="text-xs text-muted-foreground">{session.os}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{session.url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={session.status === "completed" ? "default" : "secondary"} className="text-xs">
                          {session.status === "completed" ? "Завершена" : "Запись"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(session.duration)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(session.started_at)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedSession && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Информация о сессии</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Сессия ID</p>
                    <p className="font-mono text-xs truncate">{selectedSession.session_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Устройство</p>
                    <p className="font-medium">
                      {selectedSession.device_type} {selectedSession.screen_width}x{selectedSession.screen_height}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Длительность</p>
                    <p className="font-medium">{formatDuration(selectedSession.duration)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Событий</p>
                    <p className="font-medium">{selectedSession.total_events}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Начало</p>
                    <p className="font-medium">{formatDate(selectedSession.started_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          {!selectedSession ? (
            <Card>
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                Выберите сессию для просмотра
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Реплей сессии</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.25">0.25x</SelectItem>
                          <SelectItem value="0.5">0.5x</SelectItem>
                          <SelectItem value="1">1x</SelectItem>
                          <SelectItem value="2">2x</SelectItem>
                          <SelectItem value="4">4x</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={() => setMuted(!muted)}>
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative bg-muted rounded-lg overflow-hidden" style={{ height: "500px" }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Реплей сессии</p>
                        <p className="text-sm">{selectedSession.url}</p>
                      </div>
                    </div>
                    {events.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {events
                          .filter(e => e.timestamp <= currentTime && e.data && "x" in e.data)
                          .slice(-10)
                          .map((event, index) => (
                            <div
                              key={event.id + index}
                              className="absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                              style={{
                                left: (event.data.x as number) || 0,
                                top: (event.data.y as number) || 0,
                                backgroundColor: getEventColor(event.event_type).replace("bg-", "rgba(").replace("-500", ", 0.7)")
                              }}
                            />
                          ))}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-background">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: selectedSession.duration
                            ? `${(currentTime / selectedSession.duration) * 100}%`
                            : "0%"
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" size="icon" onClick={() => setCurrentTime(0)}>
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentTime(selectedSession.duration || 0)}>
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="text-center mt-2 text-sm text-muted-foreground">
                    {formatDuration(currentTime)} / {formatDuration(selectedSession.duration)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>События сессии</CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : events.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Нет событий</p>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-1">
                      {events
                        .filter(e => e.timestamp >= currentTime - 5000 && e.timestamp <= currentTime + 1000)
                        .map((event, index) => (
                          <div
                            key={event.id || index}
                            className={`flex items-center gap-3 p-2 rounded text-sm ${
                              Math.abs(event.timestamp - currentTime) < 500
                                ? "bg-primary/20"
                                : "hover:bg-muted"
                            }`}
                          >
                            <span className="text-lg">{getEventIcon(event.event_type)}</span>
                            <div className={`w-2 h-2 rounded-full ${getEventColor(event.event_type)}`} />
                            <span className="font-medium w-16">{formatDuration(event.timestamp)}</span>
                            <span className="flex-1 truncate">{event.event_type}</span>
                            {(event.data as any).x && (event.data as any).y && (
                              <span className="text-xs text-muted-foreground">
                                ({(event.data as any).x}, {(event.data as any).y})
                              </span>
                            )}
                            {(event.data as any).target && (
                              <span className="text-xs text-muted-foreground truncate max-w-32">
                                {String((event.data as any).target)}
                              </span>
                            )}
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
    </div>
  )
}
