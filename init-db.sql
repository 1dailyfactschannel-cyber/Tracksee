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
