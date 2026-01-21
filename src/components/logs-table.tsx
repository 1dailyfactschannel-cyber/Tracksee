"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface LogEvent {
  id: string
  created_at: string
  type: string
  name: string
  status_code: number
  duration: number
  path: string
  message: string
  metadata: any
}

interface LogsTableProps {
  logs: LogEvent[]
}

export function LogsTable({ logs }: LogsTableProps) {
  if (!logs || logs.length === 0) {
    return <div className="text-center text-muted-foreground py-8">Нет данных за выбранный период</div>
  }

  return (
    <div className="rounded-md border bg-card">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Логи событий</h3>
      </div>
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Время</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Путь</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Длительность</TableHead>
              <TableHead className="text-right">Сообщение</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {format(new Date(log.created_at), "dd MMM HH:mm:ss", { locale: ru })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {log.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{log.path}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      log.status_code >= 500
                        ? "destructive"
                        : log.status_code >= 400
                        ? "destructive" // Use destructive for 4xx too for visibility or add warning variant
                        : "secondary" // secondary (often gray/greenish) for 200
                    }
                    className={log.status_code >= 200 && log.status_code < 300 ? "bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/50" : ""}
                  >
                    {log.status_code}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {log.duration ? `${log.duration}ms` : "-"}
                </TableCell>
                <TableCell className="text-right max-w-[300px] truncate text-xs text-muted-foreground">
                  {log.message || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
