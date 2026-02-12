"use client"

import { useState } from "react"
import { MobileSidebar, Sidebar } from "./sidebar"
import { Header } from "./header"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ModernLayoutWithRightSidebarProps {
  children: React.ReactNode
  className?: string
  rightSidebar?: React.ReactNode
  rightSidebarWidth?: string
}

export function ModernLayoutWithRightSidebar({ 
  children, 
  className,
  rightSidebar,
  rightSidebarWidth = "280px"
}: ModernLayoutWithRightSidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden">
        <Header />
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Main Sidebar - Left */}
        <aside 
          className={cn(
            "hidden md:flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 z-40",
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
          
          {/* Page Content Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main Content */}
            <div className={cn(
              "flex-1 overflow-auto p-6 md:p-8",
              className
            )}>
              {children}
            </div>

            {/* Right Sidebar */}
            {rightSidebar && (
              <aside 
                className={cn(
                  "hidden lg:flex flex-col border-l border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 relative",
                  rightSidebarCollapsed ? "w-[60px]" : rightSidebarWidth
                )}
              >
                {/* Collapse Button */}
                <div className="absolute -left-3 top-4 z-50">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full shadow-md"
                    onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                  >
                    {rightSidebarCollapsed ? (
                      <ChevronLeft className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {/* Sidebar Content */}
                <div className={cn(
                  "flex-1 overflow-hidden",
                  rightSidebarCollapsed && "opacity-0"
                )}>
                  {rightSidebar}
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
