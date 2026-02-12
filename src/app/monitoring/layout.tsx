import { MonitoringSidebar } from "./components/monitoring-sidebar"
import { ModernLayoutWithRightSidebar } from "@/components/layout/modern-layout-with-sidebar"

export default function MonitoringLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ModernLayoutWithRightSidebar 
      rightSidebar={<MonitoringSidebar />}
      rightSidebarWidth="300px"
    >
      {children}
    </ModernLayoutWithRightSidebar>
  )
}
