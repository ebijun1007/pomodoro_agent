-- プロジェクトテーブル
DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_projects_deadline ON projects(deadline);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- タスクテーブル
DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  estimated_minutes INTEGER NOT NULL DEFAULT 25,
  deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- ポモドーロセッションテーブル
DROP TABLE IF EXISTS pomodoro_sessions;
CREATE TABLE pomodoro_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  work_minutes INTEGER NOT NULL,
  break_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed
  start_time TEXT NOT NULL,
  pause_time TEXT,
  remaining_work_minutes INTEGER,
  completed_at TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
CREATE INDEX idx_pomodoro_sessions_task_id ON pomodoro_sessions(task_id);
CREATE INDEX idx_pomodoro_sessions_status ON pomodoro_sessions(status);
CREATE INDEX idx_pomodoro_sessions_start_time ON pomodoro_sessions(start_time);

-- コメントテーブル（オプショナル：タスクやポモドーロセッションへのコメント用）
DROP TABLE IF EXISTS comments;
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL, -- 'task' or 'pomodoro'
  target_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (target_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX idx_comments_target ON comments(target_type, target_id);