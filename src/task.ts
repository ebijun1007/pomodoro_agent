export class TaskManager {
  constructor(private db: D1Database) {}

  async createProject(name: string, description: string, deadline: string): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
      INSERT INTO projects (id, name, description, deadline, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(id, name, description, deadline, now, now)
      .run();

    return id;
  }

  async createTask(
    projectId: string,
    title: string,
    description: string,
    deadline: string,
    estimatedMinutes: number
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(`
      INSERT INTO tasks (
        id, project_id, title, description, status,
        deadline, estimated_minutes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'not_started', ?, ?, ?, ?)
    `)
      .bind(id, projectId, title, description, deadline, estimatedMinutes, now, now)
      .run();

    return id;
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

  async getPriorityTasks(limit: number = 5): Promise<any[]> {
    const result = await this.db
      .prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.status != 'completed'
      ORDER BY 
        CASE 
          WHEN t.deadline IS NULL THEN 1
          ELSE 0
        END,
        t.deadline ASC,
        t.created_at ASC
      LIMIT ?
    `)
      .bind(limit)
      .all();

    return result.results;
  }

  async getTaskDetails(taskId: string): Promise<any> {
    const result = await this.db
      .prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `)
      .bind(taskId)
      .first();

    return result;
  }
}
