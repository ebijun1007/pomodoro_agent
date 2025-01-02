export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  estimated_minutes: number;
  deadline?: string;
  created_at: string;
  updated_at: string;
  project_name?: string; // JOINで取得する場合に使用
}

export interface Project {
  id: string;
  name: string;
  description: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface PomodoroSession {
  id: string;
  task_id: string;
  work_minutes: number;
  break_minutes: number;
  status: 'active' | 'paused' | 'completed';
  start_time: string;
  pause_time?: string;
  remaining_work_minutes?: number;
  completed_at?: string;
}

export interface TaskCount {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}
