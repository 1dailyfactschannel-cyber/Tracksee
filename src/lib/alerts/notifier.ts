import { db } from "@/lib/db"

export async function sendAlertNotification(
  channel: string,
  alert: Record<string, unknown>,
  event: Record<string, unknown>,
  eventId: string
) {
  try {
    let status = "sent"
    let response = ""

    switch (channel) {
      case "telegram":
        response = await sendTelegramNotification(alert, event)
        break
      case "slack":
        response = await sendSlackNotification(alert, event)
        break
      case "email":
        response = await sendEmailNotification(alert, event)
        break
      case "webhook":
        response = await sendWebhookNotification(alert, event)
        break
      default:
        status = "failed"
        response = "Unknown channel"
    }

    await db.query(
      `INSERT INTO alert_notifications (alert_event_id, channel, status, response, sent_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [eventId, channel, status, response]
    )
  } catch (error) {
    console.error(`Error sending ${channel} notification:`, error)

    await db.query(
      `INSERT INTO alert_notifications (alert_event_id, channel, status, response, sent_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        eventId,
        channel,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      ]
    )
  }
}

async function sendTelegramNotification(
  alert: Record<string, unknown>,
  event: Record<string, unknown>
): Promise<string> {
  const chatId = alert.telegram_chat_id as string
  if (!chatId) {
    return "No telegram_chat_id configured"
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return "TELEGRAM_BOT_TOKEN not configured"
  }

  const message = formatTelegramMessage(alert, event)

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    )

    const data = await response.json()
    return data.ok ? "Sent successfully" : `Failed: ${data.description}`
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

async function sendSlackNotification(
  alert: Record<string, unknown>,
  event: Record<string, unknown>
): Promise<string> {
  const webhookUrl = alert.slack_webhook_url as string
  if (!webhookUrl) {
    return "No slack_webhook_url configured"
  }

  const payload = formatSlackPayload(alert, event)

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    return response.ok ? "Sent successfully" : `Failed: ${response.statusText}`
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

async function sendEmailNotification(
  alert: Record<string, unknown>,
  event: Record<string, unknown>
): Promise<string> {
  const recipients = alert.email_recipients as string[]
  if (!recipients || recipients.length === 0) {
    return "No email_recipients configured"
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return "RESEND_API_KEY not configured"
  }

  const subject = formatEmailSubject(alert, event)
  const body = formatEmailBody(alert, event)

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "alerts@tracksee.ru",
        to: recipients,
        subject,
        html: body,
      }),
    })

    const data = await response.json()
    return data.id ? "Sent successfully" : `Failed: ${JSON.stringify(data)}`
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

async function sendWebhookNotification(
  alert: Record<string, unknown>,
  event: Record<string, unknown>
): Promise<string> {
  const webhookUrl = alert.webhook_url as string
  if (!webhookUrl) {
    return "No webhook_url configured"
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alert: {
          id: alert.id,
          name: alert.name,
          type: alert.alert_type,
          severity: alert.severity,
        },
        event,
        timestamp: new Date().toISOString(),
      }),
    })

    return response.ok ? "Sent successfully" : `Failed: ${response.statusText}`
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

function formatTelegramMessage(alert: Record<string, unknown>, event: Record<string, unknown>): string {
  const severity = alert.severity as string
  const severityEmoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    critical: "🚨",
  }[severity] || "📢"

  return `
<b>${severityEmoji} Alert: ${alert.name}</b>

<b>Type:</b> ${alert.alert_type}
<b>Severity:</b> ${severity.toUpperCase()}
<b>Time:</b> ${new Date().toLocaleString("ru-RU")}

<b>Event Details:</b>
<pre>${JSON.stringify(event, null, 2).slice(0, 500)}</pre>

View dashboard: https://tracksee.ru/alerts
  `.trim()
}

function formatSlackPayload(alert: Record<string, unknown>, event: Record<string, unknown>) {
  const severity = alert.severity as string
  const color = {
    info: "#36a64f",
    warning: "#ff9900",
    error: "#ff0000",
    critical: "#990000",
  }[severity] || "#36a64f"

  return {
    attachments: [
      {
        color,
        title: `🚨 ${alert.name}`,
        fields: [
          {
            title: "Type",
            value: alert.alert_type,
            short: true,
          },
          {
            title: "Severity",
            value: severity.toUpperCase(),
            short: true,
          },
          {
            title: "Time",
            value: new Date().toLocaleString("ru-RU"),
            short: true,
          },
          {
            title: "Event",
            value: "\`\`\`" + JSON.stringify(event, null, 2).slice(0, 500) + "\`\`\`",
            short: false,
          },
        ],
        footer: "Tracksee Alerts",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }
}

function formatEmailSubject(alert: Record<string, unknown>, event: Record<string, unknown>): string {
  const severity = alert.severity as string
  return `[${severity.toUpperCase()}] ${alert.name} - Tracksee Alert`
}

function formatEmailBody(alert: Record<string, unknown>, event: Record<string, unknown>): string {
  const severity = alert.severity as string
  const color = {
    info: "#36a64f",
    warning: "#ff9900",
    error: "#ff0000",
    critical: "#990000",
  }[severity] || "#36a64f"

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert-box { background: ${color}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .alert-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .alert-meta { opacity: 0.9; }
    .details { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .details pre { white-space: pre-wrap; word-wrap: break-word; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert-box">
      <div class="alert-title">🚨 ${alert.name}</div>
      <div class="alert-meta">
        <strong>Type:</strong> ${alert.alert_type}<br>
        <strong>Severity:</strong> ${severity.toUpperCase()}<br>
        <strong>Time:</strong> ${new Date().toLocaleString("ru-RU")}
      </div>
    </div>

    <div class="details">
      <h3>Event Details</h3>
      <pre>${JSON.stringify(event, null, 2)}</pre>
    </div>

    <div class="footer">
      <p>This alert was triggered by Tracksee Analytics.</p>
      <p><a href="https://tracksee.ru/alerts">View Dashboard</a></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
