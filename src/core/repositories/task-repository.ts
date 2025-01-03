import type { Task, TaskCount, CreateTaskRequest } from '../domain/types';

export interface TaskRepository {
  findAll(): Promise<Task[]>;
  findByProjectId(projectId: string): Promise<Task[]>;
  findByStatus(status: TaskStatus): Promise<Task[]>;
  findById(taskId: string): Promise<Task | null>;
  create(task: CreateTaskRequest): Promise<string>;
  createMultiple(projectId: string, tasks: CreateTaskRequest[]): Promise<string[]>;
  updateStatus(taskId: string, status: TaskStatus): Promise<void>;
  getCount(): Promise<TaskCount>;
  findRecent(limit?: number): Promise<Task[]>;
  findPriority(limit?: number): Promise<Task[]>;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
