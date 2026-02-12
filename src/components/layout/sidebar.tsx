"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { 
  LayoutDashboard, 
  Activity, 
  Settings, 
  Menu,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Sparkles
} from "lucide-react"
import { useState } from "react"

type SidebarProps = React.HTMLAttributes<HTMLDivElement> & {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

const menuItems = [
  { href: "/", icon: LayoutDashboard, label: "Дашборд" },
  { href: "/monitoring", icon: Activity, label: "Мониторинг" },
  { href: "/projects", icon: FolderKanban, label: "Проекты" },
  { href: "#", icon: Settings, label: "Настройки" },
]

export function Sidebar({ className, collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname()
  
  return (
    <div className={cn(
      "flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-border/50 transition-all duration-300",
      collapsed ? "w-[70px]" : "w-[260px]",
      className
    )}>
      {/* Logo Area */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Link href="/" className={cn(
          "flex items-center gap-3 transition-all duration-300",
          collapsed && "justify-center"
        )}>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60 rounded-lg blur-lg opacity-50" />
            <div className="relative w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Tracksee
            </span>
          )}
        </Link>
        {!collapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full"
            onClick={() => onCollapse?.(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {collapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full absolute -right-4 bg-card border shadow-sm"
            onClick={() => onCollapse?.(false)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all duration-200",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")} />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-border/50 space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-11 text-muted-foreground hover:text-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <Search className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && (
            <>
              <span className="font-medium text-sm">Поиск</span>
              <kbd className="ml-auto hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </>
          )}
        </Button>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-11 text-muted-foreground hover:text-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <Bell className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && (
            <>
              <span className="font-medium text-sm">Уведомления</span>
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                2
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="mr-2 h-9 w-9 rounded-lg md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Открыть меню</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[280px]">
        <SheetTitle className="sr-only">Навигационное меню</SheetTitle>
        <Sidebar className="w-full border-0" />
      </SheetContent>
    </Sheet>
  )
}

export function CollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  
  return (
    <aside className={cn(
      "hidden md:flex flex-col fixed left-0 top-0 h-screen z-40 transition-all duration-300",
      collapsed ? "w-[70px]" : "w-[260px]"
    )}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
    </aside>
  )
}
