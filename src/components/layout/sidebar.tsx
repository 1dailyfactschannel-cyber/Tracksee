"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { 
  LayoutDashboard, 
  Activity, 
  Settings, 
  Menu,
  Server
} from "lucide-react"

type SidebarProps = React.HTMLAttributes<HTMLDivElement>

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Tracksee
          </h2>
          <div className="space-y-1">
            <Link href="/">
                <Button variant={pathname === "/" ? "secondary" : "ghost"} className="w-full justify-start">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Дашборд
                </Button>
            </Link>
            <Link href="/monitoring">
                <Button variant={pathname === "/monitoring" ? "secondary" : "ghost"} className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                Мониторинг
                </Button>
            </Link>
            <Link href="/projects">
                <Button variant={pathname === "/projects" ? "secondary" : "ghost"} className="w-full justify-start">
                <Server className="mr-2 h-4 w-4" />
                Приложения
                </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Настройки
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <Sidebar className="w-full" />
      </SheetContent>
    </Sheet>
  )
}
