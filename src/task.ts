import type { Project, Task, TaskCount } from './types';

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

  // 新しい関数: タスク名での検索（部分一致）
  async findTasksByName(name: string): Promise<Task[]> {
    const result = await this.db
      .prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.title LIKE ?
        ORDER BY t.created_at DESC
      `)
      .bind(`%${name}%`)
      .all();

    return result.results as Task[];
  }

  // 新しい関数: プロジェクト名での検索（部分一致）
  async findProjectsByName(name: string): Promise<Project[]> {
    const result = await this.db
      .prepare(`
        SELECT *
        FROM projects
        WHERE name LIKE ?
        ORDER BY created_at DESC
      `)
      .bind(`%${name}%`)
      .all();

    return result.results as Project[];
  }

  // 新しい関数: タスクの類似度検索
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // レーベンシュタイン距離の計算
    const matrix: number[][] = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - matrix[s1.length][s2.length] / maxLength;
  }

  // 新しい関数: 類似度に基づくタスク検索
  async findSimilarTasks(query: string, threshold: number = 0.6): Promise<Task[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => this.calculateSimilarity(task.title, query) >= threshold);
  }

  // 新しい関数: 類似度に基づくプロジェクト検索
  async findSimilarProjects(query: string, threshold: number = 0.6): Promise<Project[]> {
    const allProjects = await this.getAllProjects();
    return allProjects.filter(project => this.calculateSimilarity(project.name, query) >= threshold);
  }

  // 既存のメソッドをそのまま維持
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

  // タスク名からタスクを取得する新しい関数
  async getTaskByName(name: string): Promise<Task | null> {
    const tasks = await this.findTasksByName(name);
    if (tasks.length === 0) {
      const similarTasks = await this.findSimilarTasks(name);
      return similarTasks[0] || null;
    }
    return tasks[0];
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

  async createMultipleTasks(
    projectId: string,
    tasks: Array<{
      title: string;
      description?: string;
      deadline?: string;
      estimatedMinutes?: number;
    }>
  ): Promise<string[]> {
    const taskIds: string[] = [];
    const now = new Date().toISOString();
    const errors: string[] = [];

    try {
      for (const task of tasks) {
        try {
          const taskId = crypto.randomUUID();
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
              task.title,
              task.description || '',
              'pending',
              task.estimatedMinutes || 25,
              task.deadline || null,
              now,
              now
            )
            .run();

          taskIds.push(taskId);
        } catch (error) {
          console.error(`Error creating task ${task.title}:`, error);
          errors.push(task.title);
        }
      }

      if (errors.length > 0) {
        console.warn(`Failed to create some tasks: ${errors.join(', ')}`);
      }

      return taskIds;
    } catch (error) {
      console.error('Batch task creation error:', error);
      throw error;
    }
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

  // 新しいバージョン: プロジェクト名での検索を改善
  async getProjectByName(name: string): Promise<Project | null> {
    const projects = await this.findProjectsByName(name);
    if (projects.length === 0) {
      // 部分一致で見つからない場合は類似度検索を試みる
      const similarProjects = await this.findSimilarProjects(name);
      return similarProjects[0] || null;
    }
    return projects[0];
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

  async createMultipleProjects(
    projects: Array<{
      name: string;
      description?: string;
      deadline?: string;
    }>
  ): Promise<string[]> {
    const projectIds: string[] = [];
    const now = new Date().toISOString();
    const errors: string[] = [];

    try {
      for (const project of projects) {
        try {
          const projectId = crypto.randomUUID();
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
            .bind(
              projectId,
              project.name,
              project.description || '',
              project.deadline || null,
              now,
              now
            )
            .run();

          projectIds.push(projectId);
        } catch (error) {
          console.error(`Error creating project ${project.name}:`, error);
          errors.push(project.name);
        }
      }

      if (errors.length > 0) {
        console.warn(`Failed to create some projects: ${errors.join(', ')}`);
      }

      return projectIds;
    } catch (error) {
      console.error('Batch project creation error:', error);
      throw error;
    }
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

  // 新しい関数: 優先度の高いタスクを取得
  async getPriorityTasks(limit = 5): Promise<Task[]> {
    const result = await this.db
      .prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.status = 'pending'
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

    return result.results as Task[];
  }
}
