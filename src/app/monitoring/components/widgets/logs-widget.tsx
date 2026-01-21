"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface LogsWidgetProps {
  projectId?: string
}

export function LogsWidget({ projectId }: LogsWidgetProps) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (projectId) {
      fetchLogs()
    } else {
        // Mock data
        setLogs([
            { id: 1, created_at: new Date().toISOString(), status_code: 200, duration: 120, path: "/api/users" },
            { id: 2, created_at: new Date(Date.now() - 5000).toISOString(), status_code: 404, duration: 50, path: "/api/unknown" },
            { id: 3, created_at: new Date(Date.now() - 10000).toISOString(), status_code: 500, duration: 300, path: "/api/db" },
        ])
        setLoading(false)
    }
  }, [projectId])

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, created_at, status_code, duration, path")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error("Error fetching logs", error)
    } finally {
      setLoading(false)
    }
  }

  // if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Загрузка...</div>

  return (
    <ScrollArea className="h-full w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Time</TableHead>
            <TableHead className="w-[60px]">Status</TableHead>
            <TableHead>Path</TableHead>
            <TableHead className="text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs">
                {format(new Date(log.created_at), "HH:mm:ss")}
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                  log.status_code >= 500 ? 'bg-red-50 text-red-700 ring-red-600/10' :
                  log.status_code >= 400 ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                  'bg-green-50 text-green-700 ring-green-600/20'
                }`}>
                  {log.status_code}
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs truncate max-w-[150px]" title={log.path}>
                {log.path || '-'}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {log.duration}ms
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}
