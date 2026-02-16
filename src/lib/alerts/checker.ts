import { db } from "@/lib/db"
import { sendAlertNotification } from "./notifier"

export async function checkAlertConditions(projectId: string, event: Record<string, unknown>) {
  try {
    const alertsResult = await db.query(
      `SELECT * FROM alerts
       WHERE project_id = $1 AND is_active = true`,
      [projectId]
    )

    const alerts = alertsResult.rows

    for (const alert of alerts) {
      const shouldTrigger = await evaluateAlert(alert, event)

      if (shouldTrigger) {
        await triggerAlert(alert, event)
      }
    }
  } catch (error) {
    console.error("Error checking alert conditions:", error)
  }
}

async function evaluateAlert(alert: Record<string, unknown>, event: Record<string, unknown>): Promise<boolean> {
  const alertType = alert.alert_type as string
  const condition = alert.condition as Record<string, unknown>
  const threshold = alert.threshold as number
  const operator = alert.comparison_operator as string
  const timeWindow = alert.time_window as number

  switch (alertType) {
    case "error":
      return evaluateErrorAlert(alert, event, condition, threshold, operator)
    case "crash":
      return evaluateCrashAlert(alert, event, condition)
    case "anr":
      return evaluateAnrAlert(alert, event, condition)
    case "conversion_drop":
      return await evaluateConversionDropAlert(alert, condition, threshold, operator, timeWindow)
    case "performance":
      return evaluatePerformanceAlert(event, condition, threshold, operator)
    case "custom":
      return evaluateCustomAlert(event, condition)
    default:
      return false
  }
}

function evaluateErrorAlert(
  alert: Record<string, unknown>,
  event: Record<string, unknown>,
  condition: Record<string, unknown>,
  threshold: number,
  operator: string
): boolean {
  if (event.type !== "error" && event.event_type !== "error") {
    return false
  }

  const eventName = (event.name || event.event_name) as string
  const conditionEventName = condition.event_name as string

  if (conditionEventName && eventName !== conditionEventName) {
    return false
  }

  const statusCode = event.status_code as number
  const conditionStatusCode = condition.status_code as number

  if (conditionStatusCode && statusCode !== conditionStatusCode) {
    return false
  }

  if (threshold && operator) {
    const value = event.count as number || 1
    return compareValues(value, threshold, operator)
  }

  return true
}

function evaluateCrashAlert(
  alert: Record<string, unknown>,
  event: Record<string, unknown>,
  condition: Record<string, unknown>
): boolean {
  if (event.type !== "crash" && event.event_type !== "crash") {
    return false
  }

  const crashType = condition.crash_type as string
  if (crashType && (event.name as string) !== crashType) {
    return false
  }

  return true
}

function evaluateAnrAlert(
  alert: Record<string, unknown>,
  event: Record<string, unknown>,
  condition: Record<string, unknown>
): boolean {
  return event.type === "anr" || event.event_type === "anr"
}

async function evaluateConversionDropAlert(
  alert: Record<string, unknown>,
  condition: Record<string, unknown>,
  threshold: number,
  operator: string,
  timeWindow: number
): Promise<boolean> {
  const funnelId = condition.funnel_id as string
  if (!funnelId) return false

  const timeAgo = new Date(Date.now() - timeWindow * 60 * 1000)

  const result = await db.query(
    `SELECT conversion_rate FROM funnel_results
     WHERE funnel_id = $1 AND created_at > $2
     ORDER BY created_at DESC LIMIT 1`,
    [funnelId, timeAgo]
  )

  if (result.rows.length === 0) return false

  const currentRate = parseFloat(result.rows[0].conversion_rate)
  return compareValues(currentRate, threshold, operator)
}

function evaluatePerformanceAlert(
  event: Record<string, unknown>,
  condition: Record<string, unknown>,
  threshold: number,
  operator: string
): boolean {
  const metric = condition.metric as string
  const value = event[metric] as number

  if (value === undefined) return false

  return compareValues(value, threshold, operator)
}

function evaluateCustomAlert(
  event: Record<string, unknown>,
  condition: Record<string, unknown>
): boolean {
  const eventName = condition.event_name as string
  if (eventName && (event.name as string) !== eventName) {
    return false
  }

  const properties = condition.properties as Record<string, unknown>
  if (properties) {
    for (const [key, value] of Object.entries(properties)) {
      if ((event[key] as unknown) !== value) {
        return false
      }
    }
  }

  return true
}

function compareValues(value: number, threshold: number, operator: string): boolean {
  switch (operator) {
    case "greater_than":
      return value > threshold
    case "less_than":
      return value < threshold
    case "equals":
      return value === threshold
    case "greater_or_equal":
      return value >= threshold
    case "less_or_equal":
      return value <= threshold
    default:
      return false
  }
}

async function triggerAlert(alert: Record<string, unknown>, event: Record<string, unknown>) {
  try {
    const eventResult = await db.query(
      `INSERT INTO alert_events (alert_id, project_id, event_data, severity)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        alert.id,
        alert.project_id,
        JSON.stringify(event),
        alert.severity
      ]
    )

    const eventId = eventResult.rows[0].id

    await db.query(
      `UPDATE alerts SET
        last_triggered_at = CURRENT_TIMESTAMP,
        trigger_count = trigger_count + 1
       WHERE id = $1`,
      [alert.id]
    )

    const channels = alert.channels as string[] || []

    for (const channel of channels) {
      await sendAlertNotification(channel, alert, event, eventId)
    }
  } catch (error) {
    console.error("Error triggering alert:", error)
  }
}
