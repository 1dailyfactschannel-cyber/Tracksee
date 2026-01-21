import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { BoardGrid } from "../../components/board-grid"
import { DashboardData } from "../../types"

interface DashboardPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: dashboard, error } = await supabase
    .from("monitoring_dashboards")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !dashboard) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Дашборд не найден</h2>
          <p className="text-muted-foreground">Возможно он был удален или у вас нет доступа.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-4 overflow-auto">
      <BoardGrid dashboard={dashboard as DashboardData} />
    </div>
  )
}
