"use client"

import { useState } from "react"
import { MobileSidebar, Sidebar } from "./sidebar"
import { Header } from "./header"
import { cn } from "@/lib/utils"

interface ModernLayoutProps {
  children: React.ReactNode
  className?: string
}

export function ModernLayout({ children, className }: ModernLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden">
        <Header />
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside 
          className={cn(
            "hidden md:flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300",
            sidebarCollapsed ? "w-[70px]" : "w-[260px]"
          )}
        >
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onCollapse={setSidebarCollapsed} 
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Desktop Header */}
          <div className="hidden md:block">
            <Header />
          </div>
          
          {/* Page Content */}
          <div className={cn(
            "flex-1 overflow-auto p-6 md:p-8",
            className
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
