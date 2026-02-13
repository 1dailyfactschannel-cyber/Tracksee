-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT,
    api_key UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    status_code INTEGER,
    duration INTEGER,
    path TEXT,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Folders Table
CREATE TABLE monitoring_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dashboards Table
CREATE TABLE monitoring_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    folder_id UUID REFERENCES monitoring_folders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    layout JSONB DEFAULT '[]'::JSONB,
    refresh_interval INTEGER DEFAULT 30, -- in seconds
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX idx_events_project_id ON events(project_id);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_api_key ON projects(api_key);
CREATE INDEX idx_monitoring_folders_user_id ON monitoring_folders(user_id);
CREATE INDEX idx_monitoring_dashboards_user_id ON monitoring_dashboards(user_id);
CREATE INDEX idx_monitoring_dashboards_folder_id ON monitoring_dashboards(folder_id);

-- Heatmaps tables
CREATE TABLE heatmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url_pattern TEXT NOT NULL,
    page_url TEXT NOT NULL,
    device_type TEXT DEFAULT 'desktop',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE heatmap_clicks (
    id BIGSERIAL PRIMARY KEY,
    heatmap_id UUID REFERENCES heatmaps(id) ON DELETE CASCADE,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    element_selector TEXT,
    element_text TEXT,
    click_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE heatmap_scrolls (
    id BIGSERIAL PRIMARY KEY,
    heatmap_id UUID REFERENCES heatmaps(id) ON DELETE CASCADE,
    depth_percentage INTEGER NOT NULL,
    viewport_height INTEGER,
    viewport_width INTEGER,
    view_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rage_clicks (
    id BIGSERIAL PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT,
    user_id TEXT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    element_selector TEXT,
    element_text TEXT,
    click_count INTEGER NOT NULL,
    page_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE heatmap_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    url TEXT NOT NULL,
    device_type TEXT DEFAULT 'desktop',
    browser TEXT,
    os TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_data JSONB DEFAULT '{}'::JSONB
);

-- Heatmaps indices
CREATE INDEX idx_heatmaps_project_id ON heatmaps(project_id);
CREATE INDEX idx_heatmaps_url_pattern ON heatmaps(url_pattern);
CREATE INDEX idx_heatmap_clicks_heatmap_id ON heatmap_clicks(heatmap_id);
CREATE INDEX idx_heatmap_scrolls_heatmap_id ON heatmap_scrolls(heatmap_id);
CREATE INDEX idx_rage_clicks_project_id ON rage_clicks(project_id);
CREATE INDEX idx_rage_clicks_session_id ON rage_clicks(session_id);
CREATE INDEX idx_heatmap_sessions_project_id ON heatmap_sessions(project_id);
CREATE INDEX idx_heatmap_sessions_session_id ON heatmap_sessions(session_id);

-- Session Recording tables
CREATE TABLE session_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    user_id TEXT,
    browser TEXT,
    os TEXT,
    device_type TEXT DEFAULT 'desktop',
    screen_width INTEGER,
    screen_height INTEGER,
    url TEXT NOT NULL,
    referrer TEXT,
    duration INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'recording',
    events_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE TABLE session_events (
    id BIGSERIAL PRIMARY KEY,
    recording_id UUID REFERENCES session_recordings(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    data JSONB DEFAULT '{}'::JSONB
);

CREATE TABLE session_dom_snapshots (
    id BIGSERIAL PRIMARY KEY,
    recording_id UUID REFERENCES session_recordings(id) ON DELETE CASCADE,
    timestamp INTEGER NOT NULL,
    html TEXT,
    mutation_type TEXT,
    mutation_data JSONB
);

-- Session Recording indices
CREATE INDEX idx_session_recordings_project_id ON session_recordings(project_id);
CREATE INDEX idx_session_recordings_session_id ON session_recordings(session_id);
CREATE INDEX idx_session_recordings_user_id ON session_recordings(user_id);
CREATE INDEX idx_session_recordings_started_at ON session_recordings(started_at);
CREATE INDEX idx_session_recordings_status ON session_recordings(status);
CREATE INDEX idx_session_events_recording_id ON session_events(recording_id);
CREATE INDEX idx_session_events_timestamp ON session_events(timestamp);
CREATE INDEX idx_session_dom_snapshots_recording_id ON session_dom_snapshots(recording_id);

-- Funnels tables
CREATE TABLE funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    event_names JSONB NOT NULL DEFAULT '[]'::JSONB,
    filters JSONB DEFAULT '{}'::JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    event_name TEXT NOT NULL,
    event_type TEXT,
    conditions JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE funnel_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    date_date DATE NOT NULL,
    step_results JSONB NOT NULL DEFAULT '[]'::JSONB,
    total_users INTEGER DEFAULT 0,
    completed_users INTEGER DEFAULT 0,
    conversion_rate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_funnel_conversions (
    id BIGSERIAL PRIMARY KEY,
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    session_id TEXT,
    step INTEGER NOT NULL,
    converted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Funnels indices
CREATE INDEX idx_funnels_project_id ON funnels(project_id);
CREATE INDEX idx_funnels_created_by ON funnels(created_by);
CREATE INDEX idx_funnel_steps_funnel_id ON funnel_steps(funnel_id);
CREATE INDEX idx_funnel_results_funnel_id ON funnel_results(funnel_id);
CREATE INDEX idx_funnel_results_date ON funnel_results(date_date);
CREATE INDEX idx_user_funnel_conversions_funnel_id ON user_funnel_conversions(funnel_id);
CREATE INDEX idx_user_funnel_conversions_user_id ON user_funnel_conversions(user_id);

-- User Profiles tables
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    anonymous_id TEXT,
    user_id TEXT,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    custom_data JSONB DEFAULT '{}'::JSONB,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_count INTEGER DEFAULT 0,
    event_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    country TEXT,
    region TEXT,
    city TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    page_views INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    country TEXT,
    region TEXT,
    city TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    referrer TEXT,
    landing_page TEXT,
    exit_page TEXT,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE TABLE user_events (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id TEXT,
    event_name TEXT NOT NULL,
    event_type TEXT,
    path TEXT,
    referrer TEXT,
    duration INTEGER,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles indices
CREATE INDEX idx_user_profiles_project_id ON user_profiles(project_id);
CREATE INDEX idx_user_profiles_anonymous_id ON user_profiles(anonymous_id);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_last_seen ON user_profiles(last_seen);
CREATE INDEX idx_user_sessions_profile_id ON user_sessions(profile_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX idx_user_events_profile_id ON user_events(profile_id);
CREATE INDEX idx_user_events_created_at ON user_events(created_at);
CREATE INDEX idx_user_events_event_name ON user_events(event_name);

-- Cohort Analysis tables
CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cohort_type TEXT DEFAULT 'signup',
    time_interval TEXT DEFAULT 'week',
    criteria JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cohort_members (
    id BIGSERIAL PRIMARY KEY,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    anonymous_id TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE TABLE cohort_retention_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_number INTEGER NOT NULL,
    total_users INTEGER DEFAULT 0,
    retained_users INTEGER DEFAULT 0,
    retention_rate NUMERIC,
    churned_users INTEGER DEFAULT 0,
    churn_rate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cohort Analysis indices
CREATE INDEX idx_cohorts_project_id ON cohorts(project_id);
CREATE INDEX idx_cohort_members_cohort_id ON cohort_members(cohort_id);
CREATE INDEX idx_cohort_members_user_id ON cohort_members(user_id);
CREATE INDEX idx_cohort_retention_data_cohort_id ON cohort_retention_data(cohort_id);
CREATE INDEX idx_cohort_retention_data_period_start ON cohort_retention_data(period_start);

-- Real-time Alerts tables
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    alert_type TEXT NOT NULL, -- error, crash, anr, conversion_drop, performance, custom
    condition JSONB NOT NULL DEFAULT '{}'::JSONB,
    threshold NUMERIC,
    comparison_operator TEXT DEFAULT 'greater_than', -- greater_than, less_than, equals, contains
    time_window INTEGER DEFAULT 5, -- minutes
    severity TEXT DEFAULT 'warning', -- info, warning, error, critical
    channels JSONB DEFAULT '[]'::JSONB, -- telegram, slack, email, webhook
    webhook_url TEXT,
    telegram_chat_id TEXT,
    slack_webhook_url TEXT,
    email_recipients TEXT[],
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    event_data JSONB DEFAULT '{}'::JSONB,
    severity TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, acknowledged, resolved
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_event_id UUID REFERENCES alert_events(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- telegram, slack, email, webhook
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Alerts indices
CREATE INDEX idx_alerts_project_id ON alerts(project_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_active ON alerts(is_active);
CREATE INDEX idx_alert_events_alert_id ON alert_events(alert_id);
CREATE INDEX idx_alert_events_project_id ON alert_events(project_id);
CREATE INDEX idx_alert_events_status ON alert_events(status);
CREATE INDEX idx_alert_events_created_at ON alert_events(created_at);
CREATE INDEX idx_alert_notifications_event_id ON alert_notifications(alert_event_id);

-- A/B Testing tables
CREATE TABLE ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    hypothesis TEXT,
    status TEXT DEFAULT 'draft', -- draft, running, paused, completed
    traffic_allocation INTEGER DEFAULT 100, -- percentage of traffic
    primary_goal TEXT,
    secondary_goals JSONB DEFAULT '[]'::JSONB,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    target_audience JSONB DEFAULT '{}'::JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ab_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT NOT NULL, -- control, variant_a, variant_b, etc.
    traffic_percentage INTEGER DEFAULT 50,
    config JSONB DEFAULT '{}'::JSONB,
    is_control BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ab_experiment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES ab_variants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    visitors INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue NUMERIC DEFAULT 0,
    events JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ab_user_assignments (
    id BIGSERIAL PRIMARY KEY,
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES ab_variants(id) ON DELETE CASCADE,
    user_id TEXT,
    anonymous_id TEXT,
    session_id TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    first_visit_at TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- A/B Testing indices
CREATE INDEX idx_ab_experiments_project_id ON ab_experiments(project_id);
CREATE INDEX idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX idx_ab_variants_experiment_id ON ab_variants(experiment_id);
CREATE INDEX idx_ab_experiment_results_experiment_id ON ab_experiment_results(experiment_id);
CREATE INDEX idx_ab_experiment_results_variant_id ON ab_experiment_results(variant_id);
CREATE INDEX idx_ab_user_assignments_experiment_id ON ab_user_assignments(experiment_id);
CREATE INDEX idx_ab_user_assignments_user_id ON ab_user_assignments(user_id);
