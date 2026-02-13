"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Search, Calendar, Clock, Monitor, Globe, Mail, User, Tag } from "lucide-react"

interface UserProfile {
  id: string
  anonymous_id: string
  user_id: string
  email: string
  name: string
  avatar_url: string
  country: string
  region: string
  city: string
  device_type: string
  browser: string
  os: string
  first_seen: string
  last_seen: string
  session_count: string
  event_count: string
  total_duration: string
  tags: string[]
  notes: string
  recent_sessions: Array<{
    id: string
    session_id: string
    started_at: string
    ended_at: string
    duration: number
    page_views: number
    landing_page: string
    exit_page: string
  }>
  total_sessions: string
  total_events: string
  event_breakdown: Array<{
    event_name: string
    event_type: string
    count: string
  }>
}

export default function UsersPage() {
  const params = useParams()
  const projectId = params.id as string
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [projectId])

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout)
    setSearchTimeout(
      setTimeout(() => {
        fetchProfiles()
      }, 300)
    )
  }, [search])

  const fetchProfiles = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users?project_id=${projectId}&search=${encodeURIComponent(search)}`)
      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (error) {
      console.error("Error fetching profiles:", error)
    }
    setLoading(false)
  }

  const fetchProfileDetails = async (profileId: string) => {
    try {
      const response = await fetch(`/api/users?id=${profileId}&project_id=${projectId}`)
      const data = await response.json()
      setSelectedProfile(data.profile)
    } catch (error) {
      console.error("Error fetching profile details:", error)
    }
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

  const formatDuration = (seconds: number | string) => {
    const secs = typeof seconds === "string" ? parseInt(seconds) : seconds
    const mins = Math.floor(secs / 60)
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}ч ${mins % 60}м`
    if (mins > 0) return `${mins}м ${secs % 60}с`
    return `${secs}с`
  }

  const getInitials = (name: string, email: string) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    if (email) return email.slice(0, 2).toUpperCase()
    return "??"
  }

  const getDeviceIcon = (device: string) => {
    switch (device?.toLowerCase()) {
      case "mobile": return "📱"
      case "tablet": return "📱"
      default: return "💻"
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">User Profiles</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Пользователи</CardTitle>
              <CardDescription>{profiles.length} профилей</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : profiles.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Нет данных</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setSelectedProfile(profile)
                        fetchProfileDetails(profile.id)
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedProfile?.id === profile.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback>{getInitials(profile.name || "", profile.email || "")}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {profile.name || profile.email || profile.anonymous_id}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{profile.session_count} сессий</span>
                            <span>•</span>
                            <span>{formatDate(profile.last_seen)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selectedProfile ? (
            <Card>
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                Выберите пользователя для просмотра профиля
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={selectedProfile.avatar_url} />
                      <AvatarFallback className="text-xl">
                        {getInitials(selectedProfile.name || "", selectedProfile.email || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">
                        {selectedProfile.name || selectedProfile.email || selectedProfile.anonymous_id}
                      </h2>
                      {selectedProfile.email && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Mail className="w-4 h-4" /> {selectedProfile.email}
                        </p>
                      )}
                      {selectedProfile.user_id && (
                        <Badge variant="secondary" className="mt-1">
                          ID: {selectedProfile.user_id}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Последняя активность</p>
                      <p>{formatDate(selectedProfile.last_seen)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Общее время</p>
                    </div>
                    <p className="text-2xl font-bold mt-2">{formatDuration(selectedProfile.total_duration)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Сессии</p>
                    </div>
                    <p className="text-2xl font-bold mt-2">{selectedProfile.session_count}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Первый визит</p>
                    </div>
                    <p className="text-sm font-medium mt-2">{formatDate(selectedProfile.first_seen)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Локация</p>
                    </div>
                    <p className="text-sm font-medium mt-2">
                      {selectedProfile.city || selectedProfile.region || selectedProfile.country || "Неизвестно"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="activity">
                <TabsList>
                  <TabsTrigger value="activity">Активность</TabsTrigger>
                  <TabsTrigger value="events">События</TabsTrigger>
                  <TabsTrigger value="sessions">Сессии</TabsTrigger>
                </TabsList>

                <TabsContent value="activity">
                  <Card>
                    <CardHeader>
                      <CardTitle>Недавняя активность</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProfile.recent_sessions && selectedProfile.recent_sessions.length > 0 ? (
                        <div className="space-y-4">
                          {selectedProfile.recent_sessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <p className="font-medium">{session.landing_page || "/"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(session.started_at)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatDuration(session.duration)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {session.page_views} страниц
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">Нет данных о сессиях</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="events">
                  <Card>
                    <CardHeader>
                      <CardTitle>Статистика событий</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedProfile.event_breakdown && selectedProfile.event_breakdown.length > 0 ? (
                        <div className="space-y-2">
                          {selectedProfile.event_breakdown.map((event, index) => (
                            <div key={index} className="flex items-center justify-between p-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{event.event_name}</Badge>
                              </div>
                              <span className="font-medium">{event.count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">Нет событий</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="sessions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Все сессии</CardTitle>
                      <CardDescription>Всего {selectedProfile.total_sessions} сессий</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedProfile.recent_sessions?.map((session) => (
                          <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{session.session_id}</p>
                              <p className="text-sm text-muted-foreground">
                                {session.landing_page} → {session.exit_page}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatDuration(session.duration)}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(session.started_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {selectedProfile.tags && selectedProfile.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Теги
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
