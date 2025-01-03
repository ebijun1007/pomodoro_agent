import type {
  Task,
  Project,
  TaskCount,
  TaskStatus,
  CreateTaskRequest,
  CreateProjectRequest,
} from '../domain/types';

export interface TaskService {
  getAllTasks(): Promise<Task[]>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTasksByStatus(status: TaskStatus): Promise<Task[]>;
  getTask(taskId: string): Promise<Task | null>;
  createTask(task: CreateTaskRequest): Promise<string>;
  createMultipleTasks(projectId: string, tasks: CreateTaskRequest[]): Promise<string[]>;
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  getAllProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<Project | null>;
  createProject(project: CreateProjectRequest): Promise<string>;
  createMultipleProjects(projects: CreateProjectRequest[]): Promise<string[]>;
  deleteProject(projectId: string): Promise<void>;
  getTaskCount(): Promise<TaskCount>;
  getRecentTasks(limit?: number): Promise<Task[]>;
  getPriorityTasks(limit?: number): Promise<Task[]>;
}
