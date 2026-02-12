import { Metadata } from "next"
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Zap
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/overview"
import { ModernLayout } from "@/components/layout/modern-layout"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Обзор метрик и аналитика в реальном времени",
}

export default function DashboardPage() {
  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
            <p className="text-muted-foreground mt-1">
              Обзор метрик производительности и мониторинг в реальном времени
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Система онлайн
            </Badge>
            <Button className="gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Экспорт отчета
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Всего запросов"
            value="24,321"
            change="+20.1%"
            trend="up"
            icon={Activity}
            description="с прошлого часа"
          />
          <StatCard
            title="Ошибки (5xx)"
            value="12"
            change="-4%"
            trend="down"
            icon={AlertTriangle}
            description="с прошлого часа"
            variant="warning"
          />
          <StatCard
            title="Ср. время ответа"
            value="234ms"
            change="+19ms"
            trend="neutral"
            icon={Clock}
            description="с прошлого часа"
          />
          <StatCard
            title="Активные сессии"
            value="573"
            change="+201"
            trend="up"
            icon={Users}
            description="новых пользователей"
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Аналитика
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <Zap className="h-4 w-4" />
              Отчеты
            </TabsTrigger>
            <TabsTrigger value="notifications" disabled className="gap-2">
              Уведомления
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Обзор трафика</CardTitle>
                      <CardDescription>
                        Динамика запросов за последние 24 часа
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +12.5%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Overview />
                </CardContent>
              </Card>
              
              <Card className="col-span-3 border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Последние ошибки</CardTitle>
                  <CardDescription>
                    Критические события требующие внимания
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <ErrorItem
                      title="Connection Timeout"
                      service="Auth Service"
                      code={500}
                      time="2 мин назад"
                    />
                    <ErrorItem
                      title="Invalid Token"
                      service="User Service"
                      code={401}
                      time="5 мин назад"
                    />
                    <ErrorItem
                      title="Database Error"
                      service="API Gateway"
                      code={503}
                      time="12 мин назад"
                    />
                    <ErrorItem
                      title="Rate Limit Exceeded"
                      service="Analytics"
                      code={429}
                      time="18 мин назад"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    CPU Использование
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold">42%</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Средняя нагрузка
                      </p>
                    </div>
                    <div className="h-12 w-24 bg-gradient-to-t from-primary/20 to-primary/5 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Память
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold">68%</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        4.2 GB / 6 GB
                      </p>
                    </div>
                    <div className="h-12 w-24 bg-gradient-to-t from-emerald-500/20 to-emerald-500/5 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Диск
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-3xl font-bold">23%</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        45 GB / 200 GB
                      </p>
                    </div>
                    <div className="h-12 w-24 bg-gradient-to-t from-blue-500/20 to-blue-500/5 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  )
}

function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  description,
  variant = "default"
}: {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
  icon: React.ElementType
  description: string
  variant?: "default" | "warning"
}) {
  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-600",
    neutral: "text-amber-600"
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity

  return (
    <Card className={cn(
      "border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden relative",
      variant === "warning" && "border-l-4 border-l-amber-500"
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          <TrendIcon className={cn("h-3 w-3", trendColors[trend])} />
          <span className={cn("text-xs font-medium", trendColors[trend])}>
            {change}
          </span>
          <span className="text-xs text-muted-foreground">
            {description}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorItem({
  title,
  service,
  code,
  time
}: {
  title: string
  service: string
  code: number
  time: string
}) {
  const getCodeColor = (code: number) => {
    if (code >= 500) return "bg-red-500/15 text-red-600"
    if (code >= 400) return "bg-amber-500/15 text-amber-600"
    return "bg-blue-500/15 text-blue-600"
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn("h-2 w-2 rounded-full", code >= 500 ? "bg-red-500" : "bg-amber-500")} />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{service}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={cn("font-mono text-xs", getCodeColor(code))}>
          {code}
        </Badge>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
    </div>
  )
}
