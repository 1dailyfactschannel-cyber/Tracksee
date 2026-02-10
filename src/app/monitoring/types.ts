export type WidgetType = 
  | 'stat' 
  | 'chart-line' 
  | 'chart-area' 
  | 'chart-bar';

export type MetricType = 
  | 'visitors' 
  | 'auths' 
  | 'errors' 
  | 'avg_duration';

export type ChartVariant = 
  | 'line' 
  | 'area' 
  | 'bar';

export type WidgetConfig = {
  title?: string;
  metric: MetricType;
  variant: ChartVariant;
  period: '1h' | '24h' | '7d' | '30d';
  showAs: 'number' | 'chart';
}

export type DashboardWidget = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: WidgetConfig;
}

export type DashboardData = {
  id: string;
  name: string;
  folder_id: string | null;
  project_id: string;
  layout: DashboardWidget[];
  refresh_interval: number;
  description?: string;
}

export type FolderData = {
  id: string;
  name: string;
  dashboards?: DashboardData[];
}
