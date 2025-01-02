import type { Project, Task } from './types';

export class TaskManager {
  constructor(private db: D1Database) {}

  async getAllTasks(): Promise<Task[]> {
    const result = await this.db
      .prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        ORDER BY 
          CASE 
            WHEN t.deadline IS NULL THEN 1
            ELSE 0
          END,
          t.deadline ASC,
          t.created_at ASC
      `)
      .all();

    return result.results as Task[];
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    const result = await this.db
      .prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.project_id = ?
        ORDER BY 
          CASE 
            WHEN t.deadline IS NULL THEN 1
            ELSE 0
          END,
          t.deadline ASC,
          t.created_at ASC
      `)
      .bind(projectId)
      .all();

    return result.results as Task[];
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    const result = await this.db
      .prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.status = ?
        ORDER BY 
          CASE 
            WHEN t.deadline IS NULL THEN 1
            ELSE 0
          END,
          t.deadline ASC,
          t.created_at ASC
      `)
      .bind(status)
      .all();

    return result.results as Task[];
  }

  async getTask(taskId: string): Promise<Task | null> {
    const result = await this.db
      .prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?
      `)
      .bind(taskId)
      .all();

    const tasks = result.results as Task[];
    return tasks[0] || null;
  }

  async createTask({
    projectId,
    title,
    description,
    deadline,
    estimatedMinutes,
  }: {
    projectId: string;
    title: string;
    description: string;
    deadline?: string;
    estimatedMinutes: number;
  }): Promise<string> {
    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO tasks (
          id,
          project_id,
          title,
          description,
          status,
          estimated_minutes,
          deadline,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        taskId,
        projectId,
        title,
        description,
        'pending',
        estimatedMinutes,
        deadline || null,
        now,
        now
      )
      .run();

    return taskId;
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        UPDATE tasks
        SET status = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(status, now, taskId)
      .run();
  }

  async getAllProjects(): Promise<Project[]> {
    const result = await this.db
      .prepare(`
        SELECT *
        FROM projects
        ORDER BY 
          CASE 
            WHEN deadline IS NULL THEN 1
            ELSE 0
          END,
          deadline ASC,
          created_at ASC
      `)
      .all();

    return result.results as Project[];
  }

  async getProject(projectId: string): Promise<Project | null> {
    const result = await this.db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .bind(projectId)
      .all();

    const projects = result.results as Project[];
    return projects[0] || null;
  }

  async createProject({
    name,
    description,
    deadline,
  }: {
    name: string;
    description: string;
    deadline?: string;
  }): Promise<string> {
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO projects (
          id,
          name,
          description,
          deadline,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(projectId, name, description, deadline || null, now, now)
      .run();

    return projectId;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.db.batch([
      this.db.prepare('DELETE FROM tasks WHERE project_id = ?').bind(projectId),
      this.db.prepare('DELETE FROM projects WHERE id = ?').bind(projectId),
    ]);
  }

  async getTaskCount(): Promise<TaskCount> {
    const result = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM tasks
      `)
      .all();

    const counts = result.results[0] as Record<string, number>;
    return {
      total: counts.total || 0,
      pending: counts.pending || 0,
      inProgress: counts.in_progress || 0,
      completed: counts.completed || 0,
    };
  }

  async getRecentTasks(limit = 5): Promise<Task[]> {
    const result = await this.db
      .prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        ORDER BY t.updated_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    return result.results as Task[];
  }
}
