export type WidgetType = 'chart' | 'text' | 'stat' | 'logs';

export type WidgetConfig = {
  title?: string;
  projectId?: string;
  metric?: 'latency' | 'errors' | 'requests';
  content?: string; // Markdown supported
}

export type DashboardWidget = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: WidgetType;
  config: WidgetConfig;
}

export type DashboardData = {
  id: string;
  name: string;
  folder_id: string | null;
  layout: DashboardWidget[];
  description?: string;
}
