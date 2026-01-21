import { MonitoringSidebar } from "./components/monitoring-sidebar"

export default function MonitoringLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <MonitoringSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
